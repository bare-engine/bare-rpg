import { assetsHandler, BareEvent, CanvasPosition, CanvasScale, CanvasScaleMode, FlashShader, globalEvents, LevelData, objectController, PhysicsControllerBare, PhysicsObjectBare, SaveData, SaveDataHandler, Scene, StartBare, TextureFilterMode, TweenTo, uiScene, Vec2 } from 'bare-engine';
import settingsDataJson from '../public/data/settingsData.json';
import { AliveComponent } from './components/aliveComponent';
import { EnemyAIComponent } from './components/enemyAIComponent';
import { LevelConnectorComponent } from './components/levelConnectorComponent';
import { PlayerComponent } from './components/playerComponents';
import { WiggleComponent } from './components/wiggleComponent';
import { Layer } from './generated/layers';
import { MapHandler } from './handlers/mapHandler';
import { Weapon } from './objects/weapon';
import { Joystick } from './ui/joystick';
import { HitComponent } from './components/HitComponent';
import { SnapshotHandler } from './handlers/snapshotHandler';

declare module "bare-engine"
{
    // EXTENDING THE COMPONENT INTERFACE WITH A METHOD
    // SO THAT CallMethodOnAllComponents('Pop'); WORKS
    interface Component 
    {
        OnHit?: (damage: number, hitter: PhysicsObjectBare) => void
        OnDie?: () => void
    }
}

export var flashShader: FlashShader;

export class Game extends Scene
{
    player: PhysicsObjectBare;
    
    constructor()
    {
        bareEngine.AddClass(PhysicsControllerBare);
        bareEngine.AddClass(PhysicsObjectBare);
        bareEngine.AddClass(PlayerComponent);
        bareEngine.AddClass(WiggleComponent);
        bareEngine.AddClass(LevelConnectorComponent);
        bareEngine.AddClass(EnemyAIComponent);
        bareEngine.AddClass(HitComponent);
        bareEngine.AddClass(AliveComponent);
        bareEngine.AddClass(Weapon);

        flashShader = new FlashShader();

        super(settingsDataJson);
    }

    async OnAwake()
    {
        this.player = this.AddGameObject("tile_0098") as PhysicsObjectBare;

        // CREATE A JOYSTICK AND LET IT MOVE THE PLAYER
        var joystick = new Joystick(uiScene, (normalizedStickVec: Vec2) => {
            var playerComp = this.player.GetComponent(PlayerComponent)
            playerComp?.MovePlayer(normalizedStickVec);
        });
        uiScene.AddGameObject(joystick);

        // FADE IT OUT WHEN USING KEYBOARD
        events.once(BareEvent.key_pressed, () => {
            TweenTo(joystick, .5, { alpha: 0 });
        }, 'pointer_up');

        // RESTART THE GAME WHEN THE PLAYER DIES
        events.on("playerDied", async () => {
            await wait(1.5, true);
            bareEngine.Restart();
        });

        // INIT SnapshotHandler - THIS SNAPS A LEVEL AFTER EACH EDIT 
        // AND SAVES IT TO DISK, SO IT WILL UPDATE IN THE MAP EDITOR
        if (window.isLocalhost)
            SnapshotHandler.Init(this);
        
        // INIT MapHandler - THIS HANDLES HOW LEVELS ARE CONNECTED
        await MapHandler.Init(this);

        SaveDataHandler.Load();
    }

    async OnStart()
    {
        await this.LoadLevel(SaveData.currentLevelStr || 'level_1');
    }

    OnPostLoadLevel(level: LevelData): void
    {
        var playerStartPositionObject = this.objectController.GetObjectByName("playerStart");
        if (playerStartPositionObject)
        {
            // POSITION PLAYER AT OBJECT playerStart
            this.player.SetPosition(playerStartPositionObject.position.x, playerStartPositionObject.position.y);
            playerStartPositionObject.Remove();
        }
        else
        {
            // POSITION PLAYER AT THE CENTER OF THE LEVEL - GOT HERE FROM A SAVE GAME
            if (this.player.position.equals(new Vec2(0, 0)))
                this.player.SetPosition(level.dimensions.width / 2, level.dimensions.height / 2);
        }
        
        SaveDataHandler.Save();
    }

    OnRender(): void
    {
        // ORDER OBJECTS BY Y, SO OBJECTS ARE RENDERED FROM TOP TO BOTTOM
        objectController.GetLayer(Layer.OBJECTS).sort((a, b) => {
            return a.y - b.y;
        });
    }
}

StartBare(Game, {antiAlias: false, textureFilter: TextureFilterMode.NEAREST, showEditorButton: true, 
    resolution: {
        width: 240, 
        height: 160, 
        scale: CanvasScale.Fit, 
        position: CanvasPosition.Center
    }
});
