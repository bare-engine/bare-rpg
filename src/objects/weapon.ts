import { FlashShader, Inspector, SerializeField, TweenTo } from "bare-engine";
import { ArcadeObject } from "bare-engine/arcade";

@Inspector.BaseClass
export class Weapon extends ArcadeObject
{
    @SerializeField
    strength:number = 1;

    private enemiesHitThisSlash = new Set<ArcadeObject>();

    override OnAdded(): void
    {
        this.physicsHitbox.active = false;
    }

    override OnCollisionStart(collidingObject: ArcadeObject)
    {
        if (this.enemiesHitThisSlash.has(collidingObject))
            return;

        this.enemiesHitThisSlash.add(collidingObject);

        bare.component.CallMethodOnComponentsOfObject("OnHit", collidingObject, this.strength, this.parent);
    }

    CanSlash(): boolean
    {
        var tweens = bare.tween.GetAllFrom(this);
        return (tweens.length == 0);
    }

    @Inspector.Button
    async Slash()
    {
        if (!this.CanSlash())
            return;

        this.rotation = 0;

        TweenTo(this, .1, { rotation: 60, persistent: true, yoyo: true });

        this.AddShader(FlashShader);

        this.enemiesHitThisSlash.clear();

        this.physicsHitbox.active = true;
        await wait(.05, this.parent!.persistent);
        this.physicsHitbox.active = false;
    }
}
