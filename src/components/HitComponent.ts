import { Component, FlashShader, ParticleComponent } from "bare-engine";
import { ArcadeObject } from "bare-engine/arcade";

export class HitComponent extends Component<ArcadeObject>
{

    OnHit(damage: number, hitter: ArcadeObject): void
    {
        var dirVec = this.go.GetCenterPosition().subtract(hitter.GetCenterPosition()).normalize();
        var hitVec = dirVec.multiply(80 * damage);
        this.go.SetVelocity(hitVec);

        this.go.AddShader(FlashShader);

        this.go.GetComponent(ParticleComponent)!.Fire();
    }
}