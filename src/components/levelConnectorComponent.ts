import { BaseComponent, componentController, GameMode, mouseController, Run, Save, Scene } from "bare-engine"
import { GameObject } from "bare-engine";
import { Color, Vec2 } from "bare-engine";

type Direction = "top" | "right" | "bottom" | "left";

@Run(GameMode.Editor)
export class LevelConnectorComponent extends BaseComponent
{
    @Save private top:string;
    @Save private right:string;
    @Save private bottom:string;
    @Save private left:string;

    OnUpdate(deltaTime: number): void 
    {
        if (mouseController.IsMouseDown() || mouseController.IsRightMouseDown()/* && hitboxController.GetCurrentHitboxHover() == this.go.hitbox*/)
        {
            var directions:Direction[] = ["top", "right", "bottom", "left"];
            for (var direction of directions)
            {
                this[direction] = "";
            }

            var lineMargin = 100;
            var minDist = 400;

            var allConnectorComponents:LevelConnectorComponent[] = componentController.GetComponentsByType(LevelConnectorComponent as any);
            for (var connectorComp of allConnectorComponents)
            {
                var otherBO = connectorComp.go;

                if (otherBO == this.go)
                    continue;

                var thisPos = this.go.position;
                var otherPos = otherBO.position;
                
                var deltaX = Math.abs(thisPos.x - otherPos.x);
                var deltaY = Math.abs(thisPos.y - otherPos.y);
                
                var isHorizontallyAligned = deltaY <= lineMargin && deltaX <= minDist && deltaX > 0;
                var isVerticallyAligned = deltaX <= lineMargin && deltaY <= minDist && deltaY > 0;
                
                if (isHorizontallyAligned || isVerticallyAligned)
                {
                    var direction: Direction = "top";
                    
                    if (isHorizontallyAligned)
                    {
                        if (otherPos.x > thisPos.x)
                            direction = "right";
                        else
                            direction = "left";
                    }
                    else if (isVerticallyAligned)
                    {
                        if (otherPos.y < thisPos.y)
                            direction = "top";
                        else
                            direction = "bottom";
                    }

                    this[direction] = otherBO.name;
                }
            }
        }
    }

    OnRender(): void 
    {
        var directions:Direction[] = ["top", "right", "bottom", "left"];
        var allConnectorComponents:LevelConnectorComponent[] = componentController.GetComponentsByType(LevelConnectorComponent as any);
        for (var connectorComp of allConnectorComponents)
        {
            var otherGo = connectorComp.go;

            if (otherGo == this.go)
                continue;
            
            for (var direction of directions)
            {
                if (this[direction] == otherGo.name)
                {
                    var thisPos = this.go.position;
                    var otherPos = otherGo.position;

                    rapid.drawLine({  points: [new Vec2(thisPos.x, thisPos.y), new Vec2(otherPos.x, otherPos.y)], 
                                        width: 5,
                                        color: new Color(255, 255, 255, 255)});

                    break;
                }
            }
        }
    }
}
