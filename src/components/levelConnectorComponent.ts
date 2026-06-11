import { Component, GameMode, Run, Save, Scene, TextTexture } from "bare-engine";
import { GameObject } from "bare-engine";
import { Color, Vec2 } from "bare-engine";

type Direction = "top" | "right" | "bottom" | "left";

@Run(GameMode.Editor)
export class LevelConnectorComponent extends Component
{
    @Save private top:string;
    @Save private right:string;
    @Save private bottom:string;
    @Save private left:string;

    textOverlay: GameObject;

    OnAdded(): void
    {
        this.textOverlay = bScene.AddGameObject(new TextTexture(rapid, {text: this.go.name, stroke: "#ffffff", strokeThickness: 4}), this.go);
        this.textOverlay.visibleInEditor = false;
        this.textOverlay.SetPosition(this.go.width - this.textOverlay.width * .5 - 3, this.textOverlay.height * .5 + 3);
        this.textOverlay.CenterPivot();

        // SHOW/HIDE OVERLAY TEXT ON HOVER IN/OUT
        this.go.OnPointerEnter(() => {
            this.textOverlay.visibleInEditor = true;
        });
        this.go.OnPointerLeave(() => {
            this.textOverlay.visibleInEditor = false;
        });

        // SCAKE OVERLAY TEXT ON HOVER IN/OUT
        this.textOverlay.OnPointerEnter(() => {
            this.textOverlay.SetInnerScale(1.1);
        });
        this.textOverlay.OnPointerLeave(() => {
            this.textOverlay.SetInnerScale(1);
        });

        // GO TO LEVEL ON RELEASE
        this.textOverlay.OnPointerUp(() => {
            var levelToGo = this.go.name;
            bare.scene.Remove(this.go.scene);
            bare.scene.GetLevelScene()?.LoadLevel(levelToGo);
        });
    }

    OnUpdate(deltaTime: number): void 
    {
        if (bare.mouse.IsDown() || bare.mouse.IsRightDown()/* && bare.hitbox.GetCurrentHover() == this.go.hitbox*/)
        {
            var directions:Direction[] = ["top", "right", "bottom", "left"];
            for (var direction of directions)
            {
                this[direction] = "";
            }

            var lineMargin = 100;
            var minDist = 400;

            var allConnectorComponents:LevelConnectorComponent[] = bare.component.GetAllByType(LevelConnectorComponent as any);
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
        var allConnectorComponents:LevelConnectorComponent[] = bare.component.GetAllByType(LevelConnectorComponent as any);
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
