import { BaseComponent, InspectorField, PhysicsObjectBare } from "bare-engine";

export class WiggleComponent extends BaseComponent
{
    go: PhysicsObjectBare;

    @InspectorField
    wiggleAmount: number = 22;

    @InspectorField
    wiggleSpeed: number = .1;

    OnUpdate(deltaTime: number): void 
    {
        var sineInput = (bareEngine.count * this.wiggleSpeed);
        this.go.rotation = Math.sin(sineInput) * Math.min(this.go.velocity.length()/120, 1) * this.wiggleAmount;
        //this.go.rotation = Math.sin(sineInput) * this.wiggleAmount
    }
}
