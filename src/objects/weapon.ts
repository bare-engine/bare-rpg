import { FlashShader, InspectorField, ArcadeObject, Scene, tweenController, TweenTo } from "bare-engine";

export class Weapon extends ArcadeObject
{
    @InspectorField
    strength:number = 1;

    constructor(scene: Scene)
    {
        super(scene)
    }

    CanSlash(): boolean
    {
        var tweens = tweenController.GetTweensFrom(this);
        return (tweens.length == 0);
    }

    async Slash()
    {
        tweenController.FinishTweensFrom(this); // FINISH SHAKE TWEEN IF IT'S THERE

        this.rotation = 0;
        TweenTo(this, .1, { rotation: 60, persistent: true, yoyo: true });
        
        this.AddShader(FlashShader);
        
        this.physicsHitbox.active = true;
        await waitFrame();
        this.physicsHitbox.active = false;
    }

    // COULD ALSO FIRE THIS INSTEAND OF Slash()
    // TO MAKE IT LESS SPAMMY
    async DelayedSlash()
    {
        tweenController.FinishTweensFrom(this); // FINISH SHAKE TWEEN IF IT'S THERE

        this.rotation = 0;
        await TweenTo(this, .4, { rotation: -20, persistent: true }).promise;
        TweenTo(this, .1, { rotation: 60, persistent: true }).promise;
        
        this.AddShader(FlashShader);
        
        this.physicsHitbox.active = true;
        await waitFrame();
        this.physicsHitbox.active = false;

        await TweenTo(this, .1, { rotation: 0, persistent: true }).promise;
    }

    Shake()
    {
        var range = 2;

        TweenTo(this, .1, { onUpdate: () => {
            this.innerPosition.x = -range / 2 + range * Math.random();
            this.innerPosition.y = -range / 2 + range * Math.random();
        }, onComplete: () => {
            this.innerPosition.set(0, 0)
        }});
    }
}