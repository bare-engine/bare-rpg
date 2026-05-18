import { cameraHandler, CameraScaleMode, CanvasPosition, CanvasScale, LevelData, objectController, PhysicsControllerBare, PhysicsObjectBare, Scene, StartBare, TextureFilterMode, uiScene, Vec2 } from 'bare-engine';
import settingsDataJson from '../public/data/settingsData.json';
import { Joystick } from './ui/joystick';
import { Layer } from './generated/layers';

export class Game extends Scene
{
    player: PhysicsObjectBare;
    
    constructor()
    {
        bareEngine.AddClass(PhysicsControllerBare);
        bareEngine.AddClass(PhysicsObjectBare);

        super(settingsDataJson);
    }

    OnAwake()
    {
        this.player = this.AddGameObject("tile_0098") as PhysicsObjectBare;

        var joystick = new Joystick(uiScene, (normalizedVec: Vec2) => {
            var move = normalizedVec.multiply(90);
            this.player.SetVelocity(move);
        });
        
        uiScene.AddGameObject(joystick);
    }

    OnStart()
    {
        this.LoadLevel('start');
    }

    OnPostLoadLevel(level: LevelData): void
    {
        cameraHandler.SetScaleMode(CameraScaleMode.Contain);
        cameraHandler.SetDimensionsToLevel();

        var playerStartPositionObject = this.objectController.GetObjectByCustomName("playerStart");
        if (playerStartPositionObject)
        if (playerStartPositionObject)
        {
            this.player.SetPosition(playerStartPositionObject.position.x, playerStartPositionObject.position.y);
            playerStartPositionObject.Remove();
        }
    }

    override Render()
    {
        objectController.GetLayer(Layer.OBJECTS).sort((a, b) => {
            return a.y - b.y;
        });
        
        super.Render();
    }
}

StartBare(Game, {antiAlias: false, textureFilter: TextureFilterMode.NEAREST, resolution: {
    width: 240, 
    height: 160, 
    scale: CanvasScale.Fit, 
    position: CanvasPosition.Center
}});