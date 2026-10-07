import { BareEvent, CanvasPosition, CanvasScale, Events, GameObject, LevelData, SaveData, Scene, StartBare, TextureFilterMode, TweenTo, Vec2 } from 'bare-engine';
import { ArcadeObject, ArcadePhysicsController } from 'bare-engine/arcade';
import settingsDataJson from '../public/data/settingsData.json';
import { PlayerComponent } from './components/playerComponents';
import { GameOver } from './gameOver';
import { Data } from './generated/assets';
import { Direction, MapHandler } from './handlers/mapHandler';
import { SnapshotHandler } from './handlers/snapshotHandler';
import { Joystick } from './ui/joystick';

declare module "bare-engine"
{
    // EXTENDING THE COMPONENT INTERFACE WITH METHODS
    // SO WE CAN CALL EG: bare.component.CallMethodOnComponentsOfObject("OnHit", ...);
    interface Component 
    {
        OnHit?(damage: number, hitter: GameObject): void | Promise<void>
        OnDie?(): void
    }
}

export class Game extends Scene
{
    player!: ArcadeObject;
    promiseLevelLoads!: Promise<void>;
    
    constructor()
    {
        bare.AddClass(ArcadePhysicsController);

        super(settingsDataJson);
    }

    override async OnAwake()
    {        
        await bare.LoadFont("Pixellari");
        
        // ADD THE PLAYER
        this.player = this.AddGameObject("player");

        // CREATE A JOYSTICK AND LET IT MOVE THE PLAYER
        var joystick = new Joystick(bare.uiScene, (normalizedStickVec: Vec2) => {
            var playerComp = this.player.GetComponent(PlayerComponent);
            playerComp?.MovePlayer(normalizedStickVec);
        });
        bare.uiScene.AddGameObject(joystick);

        // ATTACK ON MOUSE UP
        bare.events.on(BareEvent.pointer_up, (mouseData: Events['pointer_up']) => {
            var playerComp = this.player.GetComponent(PlayerComponent)
            playerComp?.Attack();
        });

        // FADE OUT JOYSTICK WHEN USING KEYBOARD
        bare.events.once(BareEvent.key_pressed, () => {
            TweenTo(joystick, .5, { alpha: 0 });
        });

        // RESTART THE GAME WHEN THE PLAYER DIES
        bare.events.on("playerDied", async () => {
            await wait(1.5, true);
            bare.scene.Goto(GameOver)
        });

        // THIS HANDLES TAKING SNAPSHOTS OF LEVELS AFTER EACH EDIT AND SAVES IT TO DISK
        // SO IT WILL UPDATE IN THE MAP EDITOR
        if (__DEV__)
            SnapshotHandler.Init(this);
        
        // THIS HANDLES HOW LEVELS ARE CONNECTED
        await MapHandler.Init(this);

        bare.storage.Load();
    }

    override async OnStart()
    {
        await this.LoadLevel(SaveData.currentLevelStr || 'level_1'); // currentLevelStr IS HERE TO START FROM POTENTIAL SAVED LEVEL
    }

    override async OnPreLoadLevel(): Promise<void>
    {
        // WAIT FOR LOADING OF LEVELS AROUND TO COMPLETE, BEFORE STARTING A NEW ONE
        if (this.promiseLevelLoads)
            await this.promiseLevelLoads;
    }

    override OnPostLoadLevel(level: LevelData): void
    {
        var playerStartPositionObject = bare.object.GetByName("playerStart");
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

        this.promiseLevelLoads = this.LoadLevelJsonsAround(SaveData.currentLevelStr);

        // SAVE THE CURRENT LEVEL
        bare.storage.Save();
    }

    async LoadLevelJsonsAround(levelStr: string)
    {
        if (MapHandler.map[levelStr])
        {
            var promisesLevelsAr: Array<Promise<LevelData>> = [];

            // COLLECT LEVELS TO LOAD AROUND CURRENT ONE
            var connections = MapHandler.map[levelStr].connections;
            for (var dir in connections)
            {
                var levelName = connections[dir as Direction];
                
                if (levelName == "")
                    continue;

                if (!SaveData.levelCache.has(levelName))
                    promisesLevelsAr.push(bare.level.LoadData(levelName));
            }

            // LOAD THE LEVELS
            var levelDataAr = await Promise.all(promisesLevelsAr);

            // LOAD ALL TEXTURES - NOT NEEDED CURRENTLY, SINCE TEXTURES ARE LOADED FROM ATLAS ALREADY
            // BUT IF YOU WERE TO STREAM THEM FROM THE images/ FOLDER, THIS WOULD BE HANDY
            /*var promisesAr: Array<Promise<Texture>> = [];
            var texturesFound = new Set<string>();

            for (var i = 0; i < levelDataAr.length; i++)
            {
                var level = levelDataAr[i];
                for (var layerName in level.entitiesByLayer)
                {
                    var entities = level.entitiesByLayer[layerName];
                    entities.forEach((entity: any) => {
                        var entityConstructed = this.ConstructEntity(entity.name);
                        var fullPath = MakePathForEntity(entityConstructed);

                        if (texturesFound.has(fullPath))
                            return;

                        promisesAr.push(bare.asset.GetTexturePromise(fullPath));
                        texturesFound.add(fullPath);
                    });
                }
            }

            await Promise.all(promisesAr);*/
        }
    }

    override OnRender(): void
    {
        // ORDER OBJECTS BY Y, SO OBJECTS ARE RENDERED FROM TOP TO BOTTOM
        bare.object.GetLayer(Data.Layer.OBJECTS).sort((a, b) => {
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
