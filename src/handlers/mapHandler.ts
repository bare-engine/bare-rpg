

import mapLevelJson from '../../public/data/levels/map.json';
import mapDataJson from '../../public/data/mapData.json';
import { BareEvent, Button, EditorScene, Events, LevelData, plugin, SettingsHandler } from "bare-engine";
import { Game } from "../game";

export type Direction = "top" | "right" | "bottom" | "left";

type Level = {
    connections: Record<Direction, string>;
};

type LevelMap = Record<string, Level>;

export class MapHandler
{
    public static mapSettingsHandler: SettingsHandler;
    public static map: LevelMap;
    
    static async Init(scene: Game): Promise<void>
    {
        this.mapSettingsHandler = new SettingsHandler(scene);

        // THE mapData HAS "level_[editorImages]" IN IT'S CATEGORIES, THIS WILL RESOLVE THAT
        // BY FINDING ALL IMAGES IN editorImages FOLDER AND MAKING THEM INTO PLACABLE OBJECTS
        // (NOT NEEDED RIGHT AWAY, BUT HANDY TO HAVE IT BEFORE OPENING THE MAP EDITOR)
        await this.mapSettingsHandler.Process(mapDataJson);

        // FILL MAP FROM STATIC mapLevelJson ONCE, PREVENTING IT ON SUBSEQUENT RESTARTS
        if (!this.map)
        {
            // READ INITIAL LEVEL MAP, SO WE KNOW HOW LEVELS ARE CONNECTED
            this.FillLevelMap(mapLevelJson);

            // UPDATE LEVEL MAP WHEN IT'S SAVED/CHANGED
            bare.globalEvents.persistent.on(BareEvent.level_savedToDisk, (levelPayload: Events['level_savedToDisk']) => {
                if (levelPayload.level?.settingsData == "mapData")
                {
                    this.FillLevelMap(levelPayload.level);
                }
            });
        }

        if (__DEV__)
            this.AddMapEditorButton(scene);
    }

    static AddMapEditorButton(scene: Game)
    {
        // CREATE MAP EDITOR BUTTON
        var OnClickMapEditorButton = async () => {
            bare.scene.DisableAll();

            for (var scene of bare.scene.GetAll())
            {
                // HARDCODED THESE FOR NOW - NEEDED SO MOUSE IS NOT LOCKED TO DOWN AFTER CLICKING THIS BUTTON
                // HITBOX CONTROLLER FOR GOOD MEASURE TOO
                scene.hitbox?.Reset();
                scene.mouse?.Reset();
            }

            // ADDING _DEV_ HERE TOO, TO PREVENT EditorScene FROM BEING IMPORTED
            if (__DEV__)
            {
                await bare.scene.Add(EditorScene, {
                    levelPathOrData: "data/levels/map.json",
                    settingsHandler: this.mapSettingsHandler,
                });
            }
        }

        var mapEditorButton = new Button(bare.uiScene, {text: "Map Editor", fontFamily: bare.defaultEngineFont, OnPress: async () => {
            await OnClickMapEditorButton();
        }});
        var scale = 1;
        if (bare.resolution && bare.resolution.width != undefined && bare.resolution.height != undefined)
            scale = bare.resolution.width * .001736;
        mapEditorButton.SetScale(scale);
        mapEditorButton.name = "mapEditorButton";
        mapEditorButton.buttonColor.a = 180;

        // ADDING mapEditorButton
        bare.uiScene.AddGameObject(mapEditorButton)
            .SetPosition(bare.width, 0)
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
            var levelName = entity.extends!;

            var connections: Record<Direction, string> = {top: "", right: "", bottom: "", left: "" };
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
