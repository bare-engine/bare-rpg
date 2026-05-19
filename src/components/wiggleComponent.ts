import { BaseComponent, InspectorField, PhysicsObjectBare } from "bare-engine";

export class WiggleComponent extends BaseComponent
{
    go: PhysicsObjectBare;

    @InspectorField
    wiggleAmount: number = 22;

    @InspectorField
    wiggleSpeed: number = .1;

    Added(go: PhysicsObjectBare):void
    {
        super.Added(go);
    }

    OnUpdate(deltaTime: number): void 
    {
        var sineInput = (bareEngine.count * this.wiggleSpeed);
        //this.go.innerRotation = Math.sin(sineInput) * this.go.velocity.length();
        this.go.innerRotation = Math.sin(sineInput) * this.wiggleAmount
    }
}
