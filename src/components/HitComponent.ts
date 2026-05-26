import { BaseComponent, FlashShader, ParticleComponent, PhysicsObjectBare } from "bare-engine";

export class HitComponent extends BaseComponent
{
    go: PhysicsObjectBare;

    OnHit(damage: number, hitter: PhysicsObjectBare): void
    {
        var dirVec = this.go.GetCenterPosition().subtract(hitter.GetCenterPosition()).normalize();
        var hitVec = dirVec.multiply(80 * damage);
        this.go.SetVelocity(hitVec);

        this.go.AddShader(FlashShader);

        this.go.GetComponent(ParticleComponent).Fire();
    }
}