import { cameraHandler, CameraScaleMode, CanvasPosition, CanvasScale, GameObject, LevelData, Scene, StartBare, TextureFilterMode } from 'bare-engine';
import settingsDataJson from '../public/data/settingsData.json';

export class Game extends Scene
{
    obj: GameObject;
    
    constructor()
    {
        super(settingsDataJson);
    }

    OnStart()
    {
        this.LoadLevel('start');
    }

    OnPostLoadLevel(level: LevelData): void
    {
        cameraHandler.SetScaleMode(CameraScaleMode.Contain);
        cameraHandler.SetDimensionsToLevel();
    }

    override OnFixedUpdate(): void
    {
        
    }
}

StartBare(Game, {antiAlias: false, textureFilter: TextureFilterMode.NEAREST, resolution: {
    width: 240, 
    height: 160, 
    scale: CanvasScale.Fit, 
    position: CanvasPosition.Center
}});