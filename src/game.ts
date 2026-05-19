import settingsDataJson from '../public/data/settingsData.json';
import mapDataJson from '../public/data/mapData.json';
import mapLevelJson from '../public/data/levels/map.json';
import { Button, cameraHandler, CameraScaleMode, CanvasPosition, CanvasScale, EditorScene, LevelData, levelHandler, objectController, PhysicsControllerBare, PhysicsObjectBare, plugin, SaveData, SaveDataHandler, Scene, sceneController, SettingsHandler, Size, StartBare, TextureFilterMode, uiScene, Vec2 } from 'bare-engine';
import { Joystick } from './ui/joystick';
import { Layer } from './generated/layers';
import { Direction, MapHandler } from './handlers/mapHandler';
import { LevelConnectorComponent } from './components/levelConnectorComponent';
import { WiggleComponent } from './components/wiggleComponent';

export class Game extends Scene
{
    mapSettingsHandler: SettingsHandler = new SettingsHandler(this);
    mapHandler: MapHandler;
    
    mapEditorButton: Button;
    
    player: PhysicsObjectBare;
    
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

    async OnAwake()
    {
        this.mapHandler = new MapHandler(this);
        
        this.player = this.AddGameObject("tile_0098") as PhysicsObjectBare;

        var joystick = new Joystick(uiScene, (normalizedVec: Vec2) => {
            var move = normalizedVec.multiply(90);
            this.player.SetVelocity(move);
        });
        
        uiScene.AddGameObject(joystick);

        // THE MAP HAS "level_[editorImages]" IN IT'S CATEGORIES, THIS WILL RESOLVE THAT
        // BY FINDING ALL IMAGES IN editorImages FOLDER AND MAKING THEM INTO PLACABLE OBJECTS
        // NOT NEEDED RIGHT AWAY, BUT HANDY TO HAVE IT BEFORE OPENING THE MAP EDITOR
        await this.mapSettingsHandler.Process(mapDataJson);

        // CREATE MAP EDITOR BUTTON
        var OnClickMapEditorButton = async () => {
            sceneController.DisableAllScenes();

            for (var scene of sceneController.GetAllScenes())
            {
                // HARDCODED THESE FOR NOW - NEEDED SO MOUSE IS NOT LOCKED TO DOWN AFTER CLICKING THIS BUTTON
                // HITBOX CONTROLLER FOR GOOD MEASURE TOO
                scene.hitboxController?.Reset();
                scene.mouseController?.Reset();
            }

            await sceneController.Add(EditorScene, {
                levelPathOrData: "data/levels/map.json",
                settingsHandler: this.mapSettingsHandler,
            });
        }
        this.mapEditorButton = new Button(uiScene, {text: "Map Editor", OnPress: async () => {
            await OnClickMapEditorButton();
        }});
        this.mapEditorButton.SetScale(.3);
        this.mapEditorButton.name = "mapEditorButton";

        // ADDING mapEditorButton
        uiScene.AddGameObject(this.mapEditorButton)
            .SetPosition(bare.width, 0)
            .SetPivot(1, 0);

        // ADD DEBUG ACTIONS FOR THE CHROME PLUGIN (IF IT'S THERE)
        plugin?.AddDebugAction("Toggle Map Editor", () => OnClickMapEditorButton());
    }

    OnStart()
    {
        this.LoadLevel('level_2');
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

        // READ LEVEL MAP, SO WE KNOW HOW LEVELS ARE CONNECTED
        // CHECKING FIRST FOR lastSavedMap, TO GET THE LATEST
        this.mapHandler.FillLevelMap(this.mapHandler.lastSavedMap || mapLevelJson);
        
        var connections = this.mapHandler.map[SaveData.currentLevelStr]?.connections;
        trace(connections)
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
            var newLevel = this.mapHandler.GetLevelInDirectionFrom(SaveData.currentLevelStr, dir);
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

StartBare(Game, {antiAlias: false, textureFilter: TextureFilterMode.NEAREST, resolution: {
    width: 240, 
    height: 160, 
    scale: CanvasScale.Fit, 
    position: CanvasPosition.Center
}});
