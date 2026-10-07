import { BareEvent, Color, RenderTexture, Scene } from "bare-engine";
import { Game } from "../game";

export class SnapshotHandler
{
    static game:Game;

    static Init(scene: Game)
    {
        this.game = scene;

        bare.globalEvents.on(BareEvent.level_savedToDisk, async (levelData) => {
            await this.SnapshotLevel(levelData.levelStr);
        });
    }

    static async SnapshotLevel(levelName: string): Promise<void>
    {
        var scene = bare.scene.GetMainScene();
        
        if (!this.game.enabled)
            return; // WE'RE STILL IN EDITOR - NOT THE CASE JUST WHEN EDITOR IS CLOSED

        if (!scene.level.currentLevel)
            return; // WE'RE IN MAP EDITOR

        var dataUrl = this.SceneToDataUrl(scene);
        await fetch("/api/save-texture", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: bare.imagePath + "/editorImages/" + levelName, dataUrl: dataUrl })
        });

        // CLEARS UP THE TEXTURE IF IT EXISTS, SO IT CAN BE RELOADED WHEN OPENING MAP EDITOR
        bare.asset.RemoveTexture("editorImages/" + levelName);
        var texture = await bare.texture.load(dataUrl);
        bare.asset.AddTexture("editorImages/" + levelName, texture);
    }

    static SceneToDataUrl(scene: Scene): string
    {
        const dimensions = scene.level.currentLevel!.dimensions;
        const width = Math.max(1, Math.round(dimensions?.width || rapid.width));
        const height = Math.max(1, Math.round(dimensions?.height || rapid.height));
        const target = rapid.texture.createRenderTexture({ width, height });

        this.game.player.visible = false;
        rapid.drawToRenderTexture(target, () => {
            scene.Render();
        }, rapid.backgroundColor);
        this.game.player.visible = true;

        const dataUrl = this.RenderTextureToCanvas(target, rapid.backgroundColor).toDataURL("image/webp", 1);

        target.destroy();

        return dataUrl;
    }

    static RenderTextureToCanvas(texture: RenderTexture, backgroundColor: Color): HTMLCanvasElement
    {
        const pixelsCanvas = document.createElement("canvas");
        pixelsCanvas.width = texture.width;
        pixelsCanvas.height = texture.height;

        const pixelsContext = pixelsCanvas.getContext("2d");
        if (!pixelsContext)
            throw new Error("Could not create canvas context for level snapshot.");

        const sourcePixels = texture.getPixels();
        const flippedPixels = new Uint8ClampedArray(sourcePixels.length);
        const rowLength = texture.width * 4;

        for (let y = 0; y < texture.height; y++)
        {
            const sourceStart = (texture.height - y - 1) * rowLength;
            const targetStart = y * rowLength;
            flippedPixels.set(sourcePixels.subarray(sourceStart, sourceStart + rowLength), targetStart);
        }

        pixelsContext.putImageData(new ImageData(flippedPixels, texture.width, texture.height), 0, 0);

        const canvas = document.createElement("canvas");
        canvas.width = texture.width;
        canvas.height = texture.height;

        const context = canvas.getContext("2d");
        if (!context)
            throw new Error("Could not create canvas context for level snapshot background.");

        context.fillStyle = `rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(pixelsCanvas, 0, 0);

        return canvas;
    }
}
