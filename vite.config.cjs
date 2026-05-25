const { defineBareConfig } = require("bare-engine/config");
const { saveTexturePlugin } = require("./vite/saveTexturePlugin.cjs");

module.exports = defineBareConfig({
    plugins: [
        saveTexturePlugin()
    ]
});
