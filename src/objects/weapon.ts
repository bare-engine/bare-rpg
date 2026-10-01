import { FlashShader, Inspector, TweenTo } from "bare-engine";
import { ArcadeObject } from "bare-engine/arcade";

@Inspector.BaseClass
export class Weapon extends ArcadeObject
{
    @Inspector.Field
    strength:number = 1;

    CanSlash(): boolean
    {
        var tweens = bare.tween.GetAllFrom(this);
        return (tweens.length == 0);
    }

    @Inspector.Button
    async Slash()
    {
        this.rotation = 0;
        TweenTo(this, .1, { rotation: 60, persistent: true, yoyo: true });
        
        this.AddShader(FlashShader);
        
        this.physicsHitbox.active = true;
        await waitFrame(3, true);
        this.physicsHitbox.active = false;
    }
}
