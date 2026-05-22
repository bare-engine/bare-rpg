

import mapLevelJson from '../../public/data/levels/map.json';
import mapDataJson from '../../public/data/mapData.json';
import { BareEvent, Button, EditorScene, Events, globalEvents, LevelData, plugin, sceneController, SettingsHandler, uiScene } from "bare-engine";
import { Game } from "../game";

export type Direction = "top" | "right" | "bottom" | "left";

type Level = {
    connections: Partial<Record<Direction, string>>;
};

type LevelMap = Record<string, Level>;

export class MapHandler
{
    public static mapSettingsHandler: SettingsHandler;
    public static map: LevelMap;
    
    static async Init(scene: Game): Promise<void>
    {
        this.mapSettingsHandler = new SettingsHandler(scene);

        // THE MAP HAS "level_[editorImages]" IN IT'S CATEGORIES, THIS WILL RESOLVE THAT
        // BY FINDING ALL IMAGES IN editorImages FOLDER AND MAKING THEM INTO PLACABLE OBJECTS
        // (NOT NEEDED RIGHT AWAY, BUT HANDY TO HAVE IT BEFORE OPENING THE MAP EDITOR)
        await this.mapSettingsHandler.Process(mapDataJson);

        // READ INITIAL LEVEL MAP, SO WE KNOW HOW LEVELS ARE CONNECTED
        this.FillLevelMap(mapLevelJson);

        // UPDATE LEVEL MAP WHEN IT'S SAVED/CHANGED
        globalEvents.persistent.on(BareEvent.level_savedToDisk, (levelPayload: Events['level_savedToDisk']) => {
            if (levelPayload.level?.settingsData == "mapData")
            {
                this.FillLevelMap(levelPayload.level);
            }
        });

        this.AddMapEditorButton(scene);
    }

    static AddMapEditorButton(scene: Game)
    {
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

        var mapEditorButton = new Button(uiScene, {text: "Map Editor", OnPress: async () => {
            await OnClickMapEditorButton();
        }});
        var scale = 1;
        if (bareEngine.resolution && bareEngine.resolution.width != undefined && bareEngine.resolution.height != undefined)
            scale = bareEngine.resolution.width * .001736;
        mapEditorButton.SetScale(scale);
        mapEditorButton.name = "mapEditorButton";
        mapEditorButton.buttonColor.a = 180;

        // ADDING mapEditorButton
        uiScene.AddGameObject(mapEditorButton)
            .SetPosition(scene.width, 0)
            .SetPivot(1, 0);

        // ADD DEBUG ACTIONS FOR THE CHROME PLUGIN (IF IT'S THERE)
        plugin?.AddDebugAction("Toggle Map Editor", () => OnClickMapEditorButton());
    }

    // FILLING UP this.map WITH RELEVANT DATA FROM LEVEL MAP
    static FillLevelMap(levelMapJson: LevelData): void
    {
        this.map = {};

        var map: LevelData = levelMapJson;
        var entities = map.entitiesByLayer.objects;
        for (var entity of entities)
        {
            var levelName = entity.name;

            var connections: Partial<Record<Direction, string>> = {};
            this.map[levelName] = {connections: connections};

            var levelConnectorConnections = entity.components!.levelConnector as Record<Direction, string>;
            for (var direction in levelConnectorConnections)
            {
                var levelNameInDirection = levelConnectorConnections[direction as Direction];
                connections[direction as Direction] = levelNameInDirection;
            }
        }
    }

    static GetLevelInDirectionFrom(fromLevel: string, direction: Direction): string
    {
        if (!this.map[fromLevel])
            return "";
        
        if (!this.map[fromLevel].connections)
            return "";

        var level = this.map[fromLevel].connections[direction];
        
        if (!level)
            return "";

        return level;
    }
}
