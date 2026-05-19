
import { EditorScene, globalEvents, LevelData, sceneController } from "bare-engine";
import type { Events, Scene } from "bare-engine";

export type Direction = "top" | "right" | "bottom" | "left";

type Level = {
  connections: Partial<Record<Direction, string>>;
};

type LevelMap = Record<string, Level>;

export class MapHandler
{
    public scene: Scene;
    public map: LevelMap;
    public lastSavedMap: LevelData;

    constructor(scene: Scene)
    {
      this.scene = scene;
      globalEvents.persistent.on('level_savedToDisk', this.OnLevelSaved.bind(this));
    }

    OnLevelSaved({ level }: Events['level_savedToDisk'])
    {
      var editorScene = sceneController.Get(EditorScene) as EditorScene;
      if (editorScene?.settingsData.name == "mapData")
      {
        this.lastSavedMap = level;
      }
    }
    
    // FILLING UP this.map WITH RELEVANT DATA FROM LEVEL MAP
    FillLevelMap(levelMapJson:LevelData): void
    {
      this.map = {};

      var map:LevelData = levelMapJson;
      var entities = map.entitiesByLayer.objects;
      for (var entity of entities)
      {
        var levelName = entity.name;

        var connections:Partial<Record<Direction, string>> = {};
        this.map[levelName] = {connections: connections};

        var levelConnectorConnections = entity.components!.levelConnector as Record<Direction, string>;
        for (var direction in levelConnectorConnections)
        {
          var levelNameInDirection = levelConnectorConnections[direction as Direction];
          connections[direction as Direction] = levelNameInDirection;
        }
      }
    }

    GetLevelInDirectionFrom(fromLevel:string, direction: Direction): string
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
