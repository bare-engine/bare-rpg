import settingsDataJson from '../public/data/settingsData.json';
import { CameraScaleMode, LevelData, PhysicsControllerBare, PhysicsObjectBare, Scene, StartBare, TextureFilterMode } from 'bare-engine';
import { LevelConnectorComponent } from '../src/components/levelConnectorComponent';
import { WiggleComponent } from '../src/components/wiggleComponent';
import { Layer } from '../src/generated/layers';

type SnapLevelOptions = {
    levelName: string;
    saveUrl: string;
    token: string;
    showLabel: boolean;
};

function GetSnapLevelOptions(): SnapLevelOptions | null
{
    const params = new URLSearchParams(window.location.search);
    const levelName = params.get("snapLevel");

    if (!levelName)
        return null;

    return {
        levelName,
        saveUrl: params.get("snapSave") || "",
        token: params.get("snapToken") || "",
        showLabel: params.get("snapLabel") === "true"
    };
}

function GetSnapLevelDimension(paramName: string, fallback: number): number
{
    const value = Number(new URLSearchParams(window.location.search).get(paramName));
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

function ReportSnapLevelError(error: unknown): void
{
    const options = GetSnapLevelOptions();
    if (!options?.saveUrl)
        return;

    const url = new URL(options.saveUrl);
    url.pathname = "/error";
    url.searchParams.set("level", options.levelName);
    url.searchParams.set("token", options.token);

    const message = error instanceof Error ? error.stack || error.message : String(error);
    fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: message
    }).catch(() => {});
}

window.addEventListener("error", event => ReportSnapLevelError(event.error || event.message));
window.addEventListener("unhandledrejection", event => ReportSnapLevelError(event.reason));

export class Game extends Scene
{
    private snapLevelOptions: SnapLevelOptions | null = GetSnapLevelOptions();

    constructor()
    {
        bareEngine.AddClass(PhysicsControllerBare);
        bareEngine.AddClass(PhysicsObjectBare);
        bareEngine.AddClass(WiggleComponent);

        // REGISTER LevelConnectorComponent
        // NEEDED SINCE IT'S REFERENCED IN mapDataJson
        bareEngine.AddClass(LevelConnectorComponent);

        super(settingsDataJson);
    }

    async OnStart()
    {
        await this.LoadLevel(this.snapLevelOptions?.levelName);
    }

    OnPostLoadLevel(level: LevelData): void
    {
        this.cameraHandler.SetScaleMode(CameraScaleMode.Contain);
        this.cameraHandler.SetDimensionsToLevel();

        if (this.snapLevelOptions)
            this.QueueSnapLevelCapture(level);
    }

    private QueueSnapLevelCapture(level: LevelData): void
    {
        this.CaptureSnapLevel(level).catch((error) => {
            console.error("Failed to capture snap map", error);
            (window as any).__snapLevelsError = error instanceof Error ? error.message : String(error);
            ReportSnapLevelError(error);
        });
    }

    private async CaptureSnapLevel(level: LevelData): Promise<void>
    {
        if (!this.snapLevelOptions?.saveUrl)
            return;

        await this.WaitForFrames(1);

        const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
        if (!canvas)
            throw new Error("Could not find game canvas for snapLevels capture.");

        bareEngine.Render();

        let blob: Blob;

        if (this.snapLevelOptions.showLabel) {
            const labelCanvas = document.createElement("canvas");
            labelCanvas.width = canvas.width;
            labelCanvas.height = canvas.height;
            const ctx = labelCanvas.getContext("2d")!;
            ctx.drawImage(canvas, 0, 0);

            const levelName = level.name || this.snapLevelOptions.levelName;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            // Binary-search for the largest font size that fits within 90% of canvas width
            let lo = 8, hi = canvas.height * 2, fontSize = lo;
            while (lo <= hi) {
                const mid = Math.floor((lo + hi) / 2);
                ctx.font = `bold ${mid}px sans-serif`;
                if (ctx.measureText(levelName).width <= canvas.width * 0.75) {
                    fontSize = mid;
                    lo = mid + 1;
                } else {
                    hi = mid - 1;
                }
            }

            ctx.font = `bold ${fontSize}px sans-serif`;
            const textX = canvas.width / 2;
            const textY = Math.max(fontSize * 0.65, 8);
            const textW = ctx.measureText(levelName).width;
            const textH = fontSize;

            ctx.fillStyle = "rgba(255,255,255,0.2)";
            ctx.fillRect(textX - textW / 2 - 4, textY - textH / 2 - 2, textW + 8, textH + 4);

            ctx.fillStyle = "#000000";
            ctx.fillText(levelName, textX, textY);

            blob = await new Promise<Blob>((resolve, reject) =>
                labelCanvas.toBlob(b => b ? resolve(b) : reject(new Error("toBlob returned null")), "image/webp", 1)
            );
        } else {
            const dataUrl = canvas.toDataURL("image/webp", 1);
            blob = await (await fetch(dataUrl)).blob();
        }

        const url = new URL(this.snapLevelOptions.saveUrl);
        url.searchParams.set("level", level.name || this.snapLevelOptions.levelName);
        url.searchParams.set("token", this.snapLevelOptions.token);

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: { "Content-Type": "image/webp" },
            body: blob
        });

        if (!response.ok)
            throw new Error(`snapLevels save failed with HTTP ${response.status}`);

        (window as any).__snapLevelsReady = level.name || this.snapLevelOptions.levelName;
    }

    private async WaitForFrames(frameCount: number): Promise<void>
    {
        for (let i = 0; i < frameCount; i++)
            await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }

    override Render()
    {
        this.objectController.GetLayer(Layer.OBJECTS).sort((a, b) => {
            return a.y - b.y;
        });
        
        super.Render();
    }
}

StartBare(Game, {antiAlias: false, textureFilter: TextureFilterMode.NEAREST, 
    showEditorButton: false,
    resolution: {
    width: GetSnapLevelDimension("snapWidth", 240),
    height: GetSnapLevelDimension("snapHeight", 160),
}});
