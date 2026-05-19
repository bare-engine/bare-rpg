import { cameraHandler, CameraScaleMode, CanvasPosition, CanvasScale, LevelData, objectController, PhysicsControllerBare, PhysicsObjectBare, Scene, StartBare, TextureFilterMode } from 'bare-engine';
import settingsDataJson from '../public/data/settingsData.json';
import { LevelConnectorComponent } from './components/levelConnectorComponent';
import { WiggleComponent } from './components/wiggleComponent';
import { Layer } from './generated/layers';
import { InteractionHandler } from './handlers/interactionHandlerHandler';
import { MapHandler } from './handlers/mapHandler';

export class Game extends Scene
{
    player: PhysicsObjectBare;
    
    constructor()
    {
        bareEngine.AddClass(PhysicsControllerBare);
        bareEngine.AddClass(PhysicsObjectBare);
        bareEngine.AddClass(WiggleComponent);
        bareEngine.AddClass(LevelConnectorComponent);

        super(settingsDataJson);
    }

    async OnAwake()
    {
        this.player = this.AddGameObject("tile_0098") as PhysicsObjectBare;

        InteractionHandler.Init(this);
        await MapHandler.Init(this);
    }

    async OnStart()
    {
        await this.LoadLevel('level_2');
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

    OnUpdate(deltaTime: number): void
    {
        InteractionHandler.OnUpdate(deltaTime);
    }

    override Render()
    {
        objectController.GetLayer(Layer.OBJECTS).sort((a, b) => {
            return a.y - b.y;
        });
        
        super.Render();
    }
}

StartBare(Game, {antiAlias: false, textureFilter: TextureFilterMode.NEAREST, 
    resolution: {
        width: 240, 
        height: 160, 
        scale: CanvasScale.Fit, 
        position: CanvasPosition.Center
    }
});
