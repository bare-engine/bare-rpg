import { BaseComponent, PhysicsObjectBare } from "bare-engine";
import { flashShader } from "../game";

export class HitComponent extends BaseComponent
{
    go: PhysicsObjectBare;

    OnHit(damage: number, hitter: PhysicsObjectBare): void
    {
        var dirVec = this.go.GetCenterPosition().subtract(hitter.GetCenterPosition()).normalize();
        var hitVec = dirVec.multiply(400);
        this.go.SetVelocity(hitVec);

        this.go.AddShader(flashShader);
    }
}