import { Component, GameMode, Inspector, Run, Save, Scene, TextTexture } from "bare-engine";
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
        this.textOverlay.save = false;
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

            var alignmentMargin = 16;
            var minDist = 50;

            var allConnectorComponents:LevelConnectorComponent[] = bare.component.GetAllByType(LevelConnectorComponent as any);
            for (var connectorComp of allConnectorComponents)
            {
                var otherBO = connectorComp.go;

                if (otherBO == this.go)
                    continue;

                var thisBounds = this.go.GetBounds();
                var otherBounds = otherBO.GetBounds();

                var horizontalDistance = this.GetEdgeDistance(
                    thisBounds.x,
                    thisBounds.x + thisBounds.width,
                    otherBounds.x,
                    otherBounds.x + otherBounds.width
                );
                var verticalDistance = this.GetEdgeDistance(
                    thisBounds.y,
                    thisBounds.y + thisBounds.height,
                    otherBounds.y,
                    otherBounds.y + otherBounds.height
                );

                var thisCenterX = thisBounds.x + thisBounds.width * .5;
                var thisCenterY = thisBounds.y + thisBounds.height * .5;
                var otherCenterX = otherBounds.x + otherBounds.width * .5;
                var otherCenterY = otherBounds.y + otherBounds.height * .5;
                var horizontalCenterDistance = Math.abs(otherCenterX - thisCenterX);
                var verticalCenterDistance = Math.abs(otherCenterY - thisCenterY);
                
                var isHorizontallyAligned = verticalCenterDistance <= alignmentMargin && horizontalDistance <= minDist && horizontalDistance > 0;
                var isVerticallyAligned = horizontalCenterDistance <= alignmentMargin && verticalDistance <= minDist && verticalDistance > 0;
                
                if (isHorizontallyAligned || isVerticallyAligned)
                {
                    var direction: Direction = "top";
                    
                    if (isHorizontallyAligned)
                    {
                        if (otherBounds.x > thisBounds.x)
                            direction = "right";
                        else
                            direction = "left";
                    }
                    else if (isVerticallyAligned)
                    {
                        if (otherBounds.y < thisBounds.y)
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

    private GetEdgeDistance(startA: number, endA: number, startB: number, endB: number): number
    {
        if (endA < startB)
            return startB - endA;

        if (endB < startA)
            return startA - endB;

        return 0;
    }
}


