import { GameObject, InspectorField, PhysicsObjectBare, Scene, TweenTo } from "bare-engine";
import { flashShader } from "../game";

export class Weapon extends PhysicsObjectBare
{
    @InspectorField
    strength:number = 1;

    @InspectorField
    cooldown:number = .7;

    cooldownCounter:number = 0;

    constructor(scene: Scene)
    {
        super(scene)
    }

    OnUpdate(deltaTime: number): void
    {
        if (this.cooldownCounter > 0)
            this.cooldownCounter -= deltaTime;

        if (this.cooldownCounter < 0)
        {
            if (this.cooldownCounter != 0)
                this.AddShader(flashShader);

            this.cooldownCounter = 0;
        }
    }

    CanSlash(): boolean
    {
        return (this.cooldownCounter == 0);
    }

    async Slash()
    {
        this.rotation = 0;
        TweenTo(this, .1, { rotation: 60, persistent: true, yoyo: true });
        
        this.physicsHitbox.active = true;
        await wait(.05, true);
        this.physicsHitbox.active = false;

        this.cooldownCounter = this.cooldown;
    }   
}