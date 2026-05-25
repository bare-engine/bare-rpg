const fs = require("node:fs");
const path = require("node:path");

function saveTexturePlugin() {
    const publicDir = path.join(process.cwd(), "public");

    return {
        name: "bare-rpg:save-texture-api",
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const requestUrl = new URL(req.url || "/", "http://127.0.0.1");

                if (req.method !== "POST" || requestUrl.pathname !== "/api/save-texture") {
                    next();
                    return;
                }

                readJson(req)
                    .then(({ path: texturePath, dataUrl }) => {
                        const fullPath = getPublicOutputPath(publicDir, texturePath, ".webp");
                        writeDataUrlFile(fullPath, dataUrl);
                        sendJson(res, 200, { success: true, message: `Texture saved to ${fullPath}` });
                    })
                    .catch((error) => {
                        sendJson(res, error.statusCode || 500, {
                            error: error instanceof Error ? error.message : String(error)
                        });
                    });
            });
        }
    };
}

function readJson(req) {
    return new Promise((resolve, reject) => {
        let body = "";

        req.on("data", chunk => {
            body += chunk.toString();
        });

        req.on("end", () => {
            try {
                resolve(JSON.parse(body || "{}"));
            } catch {
                const error = new Error("Invalid JSON body.");
                error.statusCode = 400;
                reject(error);
            }
        });

        req.on("error", reject);
    });
}

function writeDataUrlFile(filePath, dataUrl) {
    const match = String(dataUrl || "").match(/^data:image\/(?:webp|png|jpeg);base64,(.+)$/);
    if (!match) {
        throw new Error("texture must be an image data URL");
    }

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, Buffer.from(match[1], "base64"));
}

function getPublicOutputPath(publicDir, value, defaultExtension) {
    let safePath = assertSafePath(value).replace(/\\/g, "/").replace(/^\/+/, "");
    if (!path.extname(safePath)) {
        safePath += defaultExtension;
    }

    const rootPath = path.resolve(publicDir);
    const fullPath = path.resolve(publicDir, safePath);
    if (!fullPath.startsWith(rootPath + path.sep) && fullPath !== rootPath) {
        const error = new Error("Invalid path");
        error.statusCode = 403;
        throw error;
    }

    return fullPath;
}

function assertSafePath(value) {
    if (!value) {
        throw new Error("path is required");
    }

    const safePath = String(value);
    if (safePath.includes("..") || safePath.startsWith("..")) {
        throw new Error("Invalid path");
    }

    return safePath;
}

function sendJson(res, statusCode, body) {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
}

module.exports = {
    saveTexturePlugin
};
