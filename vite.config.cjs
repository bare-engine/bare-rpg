const { defineBareConfig } = require("bare-engine/config");
const { bareRpgSnapLevelPlugin } = require("./scripts/viteSnapLevelPlugin.cjs");

module.exports = defineBareConfig({
    plugins: [
        bareRpgSnapLevelPlugin()
    ]
});
