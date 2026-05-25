import { createServer as createHttpServer } from "node:http";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const levelsDir = path.join(root, "public", "data", "levels");
const outputDir = path.join(root, "public", "images", "editorImages");
const token = randomBytes(16).toString("hex");
const pendingSaves = new Map();
const showLabel = getShowLabelArg();
const targetLevelName = getLevelArg();

const chromePath = findChrome();
if (!chromePath) {
    throw new Error("Could not find Chrome or Edge. Set CHROME_PATH to the browser executable and retry.");
}

await mkdir(outputDir, { recursive: true });

const saveServer = createSaveServer();
await listen(saveServer, "127.0.0.1", 0);
const savePort = saveServer.address().port;

const vite = await createViteServer({
    configFile: path.join(root, "vite.config.cjs"),
    mode: "development",
    plugins: [snapLevelsEntryPlugin()],
    server: {
        host: "127.0.0.1",
        port: 0,
        strictPort: false,
        hmr: false
    }
});

await vite.listen();
const vitePort = vite.httpServer.address().port;

try {
    const levels = await getLevelFiles(targetLevelName);

    if (levels.length === 0) {
        console.log("No level JSON files found to snapshot.");
    }

    for (const level of levels) {
        await snapLevel(level, vitePort, savePort);
    }
} finally {
    await vite.close();
    await closeServer(saveServer);
}

async function getLevelFiles(targetLevelName) {
    const entries = await readdir(levelsDir, { withFileTypes: true });

    const levels = [];
    let foundTarget = false;

    for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith(".json"))
            continue;

        const name = path.basename(entry.name, ".json");
        if (targetLevelName && name !== targetLevelName)
            continue;

        foundTarget = true;

        const levelPath = path.join(levelsDir, entry.name);
        const level = JSON.parse(await readFile(levelPath, "utf8"));

        if (level.isData) {
            console.log(`Skipping ${entry.name} because it is marked isData.`);
            continue;
        }

        levels.push({
            name,
            width: Number(level.dimensions?.width) || 240,
            height: Number(level.dimensions?.height) || 160
        });
    }

    if (targetLevelName && !foundTarget) {
        throw new Error(`Could not find level "${targetLevelName}" in ${levelsDir}.`);
    }

    return levels.sort((a, b) => a.name.localeCompare(b.name));
}

async function snapLevel(level, vitePort, savePort) {
    const outputPath = path.join(outputDir, `${level.name}.webp`);
    const savePromise = waitForSave(level.name, outputPath);
    const profileDir = await mkdtemp(path.join(tmpdir(), "bare-rpg-snaplevels-"));
    const url = new URL(`http://127.0.0.1:${vitePort}/`);

    url.searchParams.set("snapLevel", level.name);
    url.searchParams.set("snapWidth", String(level.width));
    url.searchParams.set("snapHeight", String(level.height));
    url.searchParams.set("snapSave", `http://127.0.0.1:${savePort}/save`);
    url.searchParams.set("snapToken", token);
    url.searchParams.set("snapLabel", showLabel ? "true" : "false");

    console.log(`Snapshotting ${level.name} -> ${path.relative(root, outputPath)}`);

    const browser = spawn(chromePath, [
        "--headless=new",
        "--disable-gpu",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-dev-shm-usage",
        "--disable-features=Translate",
        "--hide-scrollbars",
        "--mute-audio",
        "--no-default-browser-check",
        "--no-first-run",
        "--force-device-scale-factor=1",
        `--user-data-dir=${profileDir}`,
        `--window-size=${level.width},${level.height}`,
        url.toString()
    ], {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
    });

    let stderr = "";
    browser.stderr.on("data", chunk => {
        stderr += chunk.toString();
    });

    try {
        await withTimeout(savePromise, 30000, `Timed out while snapshotting ${level.name}.`);
    } catch (error) {
        if (stderr.trim())
            console.error(stderr.trim());

        throw error;
    } finally {
        browser.kill();
        await waitForExit(browser);
        await rm(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
    }
}

function createSaveServer() {
    return createHttpServer((request, response) => {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");

        if (request.method === "OPTIONS") {
            response.writeHead(204);
            response.end();
            return;
        }

        const url = new URL(request.url, "http://127.0.0.1");
        if (request.method === "POST" && url.pathname === "/error") {
            if (url.searchParams.get("token") !== token) {
                response.writeHead(403);
                response.end("Bad snapLevels token.");
                return;
            }

            const level = url.searchParams.get("level") || "";
            const pending = pendingSaves.get(level);
            const chunks = [];

            request.on("data", chunk => chunks.push(chunk));
            request.on("end", () => {
                const message = Buffer.concat(chunks).toString("utf8") || `Unknown snapLevels error in ${level}.`;
                if (pending) {
                    pending.reject(new Error(message));
                    pendingSaves.delete(level);
                }

                response.writeHead(200);
                response.end("error received");
            });
            return;
        }

        if (request.method !== "POST" || url.pathname !== "/save") {
            response.writeHead(404);
            response.end();
            return;
        }

        if (url.searchParams.get("token") !== token) {
            response.writeHead(403);
            response.end("Bad snapLevels token.");
            return;
        }

        const level = url.searchParams.get("level") || "";
        const pending = pendingSaves.get(level);
        if (!pending) {
            response.writeHead(400);
            response.end(`Unexpected snapLevels level "${level}".`);
            return;
        }

        const chunks = [];
        request.on("data", chunk => chunks.push(chunk));
        request.on("end", async () => {
            try {
                await writeFile(pending.outputPath, Buffer.concat(chunks));
                pending.resolve();
                pendingSaves.delete(level);
                response.writeHead(200);
                response.end("saved");
            } catch (error) {
                pending.reject(error);
                pendingSaves.delete(level);
                response.writeHead(500);
                response.end(error instanceof Error ? error.message : String(error));
            }
        });
    });
}

function snapLevelsEntryPlugin() {
    return {
        name: "bare-rpg:snaplevels-entry",
        transformIndexHtml: {
            order: "post",
            handler(html) {
                return html.replace("/src/game.ts", "/scripts/gameSnap.ts");
            }
        }
    };
}

function waitForSave(levelName, outputPath) {
    return new Promise((resolve, reject) => {
        pendingSaves.set(levelName, { outputPath, resolve, reject });
    });
}

function findChrome() {
    const candidates = [
        process.env.CHROME_PATH,
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/usr/bin/microsoft-edge"
    ].filter(Boolean);

    return candidates.find(candidate => existsSync(candidate));
}

function getShowLabelArg() {
    return process.argv.slice(2).some(arg => arg === "--showLabel" || arg === "--show-label" || arg === "--label");
}

function getLevelArg() {
    const args = process.argv.slice(2);

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === "--level") {
            const value = args[i + 1] || "";
            return validateLevelArg(value);
        }

        if (arg.startsWith("--level=")) {
            return validateLevelArg(arg.slice("--level=".length));
        }
    }

    return "";
}

function validateLevelArg(levelName) {
    if (/^[a-zA-Z0-9_-]+$/.test(levelName)) {
        return levelName;
    }

    throw new Error(`Invalid --level value "${levelName}".`);
}

function listen(server, host, port) {
    return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => {
            server.off("error", reject);
            resolve();
        });
    });
}

function closeServer(server) {
    return new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
    });
}

function waitForExit(childProcess) {
    return new Promise(resolve => {
        if (childProcess.exitCode !== null) {
            resolve();
            return;
        }

        childProcess.once("exit", resolve);
    });
}

function withTimeout(promise, timeoutMs, message) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
    });

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}
