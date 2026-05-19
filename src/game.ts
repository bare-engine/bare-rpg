import { cameraHandler, CameraScaleMode, CanvasPosition, CanvasScale, LevelData, levelHandler, objectController, PhysicsControllerBare, PhysicsObjectBare, SaveData, SaveDataHandler, Scene, Size, StartBare, TextureFilterMode, uiScene, Vec2 } from 'bare-engine';
import settingsDataJson from '../public/data/settingsData.json';
import { LevelConnectorComponent } from './components/levelConnectorComponent';
import { WiggleComponent } from './components/wiggleComponent';
import { Layer } from './generated/layers';
import { Direction, MapHandler } from './handlers/mapHandler';
import { Joystick } from './ui/joystick';

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
        await MapHandler.Init(this);
        
        this.player = this.AddGameObject("tile_0098") as PhysicsObjectBare;

        var joystick = new Joystick(uiScene, (normalizedVec: Vec2) => {
            var move = normalizedVec.multiply(90);
            this.player.SetVelocity(move);
        });
        
        uiScene.AddGameObject(joystick);
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
        this.CheckOffScreen();
    }

    override Render()
    {
        objectController.GetLayer(Layer.OBJECTS).sort((a, b) => {
            return a.y - b.y;
        });
        
        super.Render();
    }

    async SaveLevel()
    {
        // KEEP IN BARE?
        levelHandler.SaveLevel();
        SaveDataHandler.Save();
    }
    
    CheckOffScreen()
    {
        if (!levelHandler.currentLevel)
            return;

        if (this.player.velocity.isZero())
            return;

        var dims:Size = levelHandler.currentLevel.dimensions;
        var checkLevel = (dir:Direction) =>{
            var newLevel = MapHandler.GetLevelInDirectionFrom(SaveData.currentLevelStr, dir);
            if (newLevel != "")
            {
                var loadLevel = async () => {
                    this.SaveLevel();
                    
                    await levelHandler.LoadLevel(newLevel);

                    // WARP PLAYER POSITION
                    let dimsNewLevel:Size = levelHandler.currentLevel.dimensions;
                    var marge = 20;
                    if (dir == "left")
                    {
                        this.player.x = dimsNewLevel.width - marge;
                    }
                    if (dir == "right")
                    {
                        this.player.x = marge;
                    }
                    if (dir == "top")
                    {
                        this.player.y = dimsNewLevel.height - marge;
                        this.player.x = (this.player.x / dims.width) * dimsNewLevel.width;
                    }
                    if (dir == "bottom")
                    {
                        this.player.y = marge;
                        this.player.x = (this.player.x / dims.width) * dimsNewLevel.width;
                    }
                }
               
                loadLevel();
            }
        }

        if (this.player.x < 0)
        {
            this.player.x = 0;
            checkLevel("left");
        }
        else
        if (this.player.x > dims.width)
        {
            this.player.x = dims.width;
            checkLevel("right");
        }
        else
        if (this.player.y < 0)
        {
            this.player.y = 0;
            checkLevel("top");
        }
        else
        if (this.player.y > dims.height)
        {
            this.player.y = dims.height;
            checkLevel("bottom");
        }
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
