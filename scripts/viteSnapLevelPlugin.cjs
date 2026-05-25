const { spawn } = require("node:child_process");
const path = require("node:path");

function bareRpgSnapLevelPlugin() {
    const projectRoot = process.cwd();
    let runningSnapLevel = null;

    return {
        name: "bare-rpg:snap-level-api",
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const requestUrl = new URL(req.url || "/", "http://127.0.0.1");

                if (req.method !== "POST" || requestUrl.pathname !== "/api/snap-level") {
                    next();
                    return;
                }

                readJson(req)
                    .then(({ level }) => {
                        const levelName = String(level || "");
                        if (!/^[a-zA-Z0-9_-]+$/.test(levelName)) {
                            sendJson(res, 400, { error: "Invalid level name." });
                            return;
                        }

                        return runSnapLevel(projectRoot, levelName, runningSnapLevel, (process) => {
                            runningSnapLevel = process;
                        }).then((result) => {
                            runningSnapLevel = null;
                            sendJson(res, 200, result);
                        });
                    })
                    .catch((error) => {
                        runningSnapLevel = null;
                        sendJson(res, error.statusCode || 500, {
                            error: error instanceof Error ? error.message : String(error)
                        });
                    });
            });
        }
    };
}

function runSnapLevel(projectRoot, levelName, runningSnapLevel, setRunningSnapLevel) {
    if (runningSnapLevel) {
        const error = new Error("A snapLevels run is already active.");
        error.statusCode = 409;
        return Promise.reject(error);
    }

    return new Promise((resolve, reject) => {
        const childProcess = spawn(process.execPath, [
            path.join(projectRoot, "scripts", "snapLevels.mjs"),
            "--level",
            levelName
        ], {
            cwd: projectRoot,
            stdio: ["ignore", "pipe", "pipe"],
            windowsHide: true
        });

        setRunningSnapLevel(childProcess);

        let stdout = "";
        let stderr = "";

        childProcess.stdout.on("data", chunk => {
            stdout += chunk.toString();
        });

        childProcess.stderr.on("data", chunk => {
            stderr += chunk.toString();
        });

        childProcess.on("error", reject);
        childProcess.on("exit", (code) => {
            if (code === 0) {
                resolve({
                    success: true,
                    level: levelName,
                    output: stdout.trim()
                });
                return;
            }

            const error = new Error(stderr.trim() || stdout.trim() || `snapLevels exited with code ${code}.`);
            error.statusCode = 500;
            reject(error);
        });
    });
}

function readJson(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;

        req.on("data", chunk => {
            size += chunk.length;
            if (size > 1024) {
                const error = new Error("Request body is too large.");
                error.statusCode = 413;
                reject(error);
                req.destroy();
                return;
            }

            chunks.push(chunk);
        });

        req.on("end", () => {
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
            } catch {
                const error = new Error("Invalid JSON body.");
                error.statusCode = 400;
                reject(error);
            }
        });

        req.on("error", reject);
    });
}

function sendJson(res, statusCode, body) {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
}

module.exports = {
    bareRpgSnapLevelPlugin
};
