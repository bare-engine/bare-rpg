import { Component, Inspector } from "bare-engine";
import { ArcadeObject } from "bare-engine/arcade";

export class WiggleComponent extends Component
{
    go: ArcadeObject;

    @Inspector.Field
    wiggleAmount: number = 22;

    @Inspector.Field
    wiggleSpeed: number = .1;

    wiggleTime: number = 0;

    OnUpdate(deltaTime: number): void 
    {
        this.wiggleTime += (deltaTime * 60);
        var sineInput = (this.wiggleTime * this.wiggleSpeed);
        this.go.rotation = Math.sin(sineInput) * Math.min(this.go.velocity.length()/120, 1) * this.wiggleAmount;
    }
}

