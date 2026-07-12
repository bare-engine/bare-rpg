import { BareEvent, Component, Color, Inspector, TweenTo, Vec2 } from "bare-engine";
import { BlockedState } from "../../../BareEngine/src/types/bareTypes";
import { AliveComponent } from "./aliveComponent";
import { ArcadeObject } from "bare-engine/arcade";

enum State
{
    Roam,
    Hit,
    Chase,
    Attack,
    Dead,
    None,
}

export class EnemyAIComponent extends Component
{
    go: ArcadeObject;

    state:State;
    stateArg:any;

    counter: number = 0;
    roamVec: Vec2 = new Vec2(0, 0);
    
    @Inspector.Field
    @Inspector.Locked
    @Inspector.Label('State')
    enemyState = {
        get: () => State[this.state],
        set: (state: string) => this.SetState(State[state as keyof typeof State])
    };

    @Inspector.Field
    roamSpeed: number = 30;

    @Inspector.Field
    attackSpeed: number = 60;

    @Inspector.Field
    @Inspector.Int
    strength: number = 5;

    OnAdded(): void
    {
        this.SetState(State.Roam);
    }

    OnUpdate(deltaTime: number): void 
    {
        switch (this.state)
        {
            case State.Roam:
                if (this.counter <= 0)
                {
                    // ROAM IN A RANDOM DIRECTION
                    this.roamVec = new Vec2(Math.random() * 100 - 50, Math.random() * 100 - 50).normalize().multiply(this.roamSpeed);
                    this.counter = Math.random() * .5 + .7;

                    // RANDOM CHANCE FOR A QUICK STOP
                    if (Math.random() > .5)
                    {
                        this.roamVec.set(0, 0);
                        this.counter *= .25;
                    }
                }

                // IF COLLIDING WITH ANYTHING, INCLUDING EDGE OF SCREEN, MOVE IN RANDOM DIRECTION - THIS MAKES IT GO OFF EDGES
                if (this.go.blocked != BlockedState.None)
                {
                    this.roamVec = new Vec2(Math.random() * 100 - 50, Math.random() * 100 - 50).normalize().multiply(this.roamSpeed);
                }

                this.go.SetVelocity(this.roamVec);
            break;

            case State.Chase:
                var target = this.stateArg as ArcadeObject;
                var vecToHitter = target.GetHitboxCenter().subtract(this.go.GetHitboxCenter());
                var distToHitter = vecToHitter.length();
                var moveVec = vecToHitter.normalize().multiply(this.attackSpeed);
                
                if (this.go.collidingObjects.includes(target))
                {
                    // IF COLLIDING WITH TARGET, ATTACK IT
                    this.SetState(State.Attack, target);
                }
                else
                if (distToHitter < 96)
                {
                    // IF WITHIN RANGE, CHASE
                    this.go.SetVelocity(moveVec);
                }
                else
                {
                    // IF TOO FAR, ROAM AGAIN
                    this.SetState(State.Roam);
                }
            break;
        }

        this.counter -= deltaTime;
    }

    async OnHit(damage: number, hitter: ArcadeObject): Promise<void>
    {
        if (this.state == State.Dead)
            return;

        this.SetState(State.Hit);
        await wait(.6);

        // CHECK IF INTERRUPTED
        if (this.state != State.Hit)
            return;

        this.SetState(State.Chase, hitter);
    }

    OnDie()
    {
        this.SetState(State.Dead);
    }

    OnRemoved(): void
    {
        this.SetState(State.None);
    }

    SetState(state: State, arg:any = null)
    {
        if (this.state == state)
            return;

        this.state = state;
        this.stateArg = arg;

        switch (this.state)
        {
            case State.Roam:
                this.roamVec.set(0, 0);
                this.go.SetColor(Color.White);
            break;
            case State.Chase:
                this.go.SetColor(Color.fromHex("#ffa3a3"));
            break;
            case State.Attack:
                this.Attack(this.stateArg)
            break;
            case State.Hit:
            break;
        }
    }

    async Attack(target: ArcadeObject)
    {
        // WAIT LITTLE BIT - FOR BUILD UP / TIME TO ESCAPE
        await wait(.1);

        // CHECK IF INTERRUPTED, MAYBE HIT, IN THAT CASE STOP THE ATTACK
        if (this.state != State.Attack)
            return;

        var vecToHitter = target.GetHitboxCenter().subtract(this.go.GetHitboxCenter());
        var vecToHitterNorm = vecToHitter.normalize();
        var moveVec = vecToHitterNorm.multiply(this.attackSpeed);

        // QUICK ROTATE TOWARDS TARGET
        this.go.innerRotation = 0;
        TweenTo(this.go, .1, { innerRotation: 40 * Math.sign(moveVec.x), yoyo: true });

        // LUNGE TOWARDS TARGET
        this.go.SetVelocity(moveVec.multiply(3));

        // IF COLLISION WITH TARGET, HIT IT - USING collision_update SINCE collision_start DOESN'T FIRE IF THEY WERE ALREADY COLLIDING
        this.go.events.once(BareEvent.collision_update, (collidingObject) => {
            bare.component.CallMethodOnComponentsOfObject("OnHit", target, this.strength, this.go);
            //this.OnHit(collidingObject);
        }, 'hitCheck');

        // DANGER WINDOW
        await waitFrame();

        // ATTACK IS DONE, STOP LISTENING FOR COLLISION
        this.go.events.offAlias('hitCheck');

        // COOL DOWN FROM ATTACK
        await wait(.4);

        // CHECK IF INTERRUPTED
        if (this.state != State.Attack)
            return;

        // RESTORE STATE
        if (target.GetComponent(AliveComponent))
            this.SetState(State.Chase, target);
        else
            this.SetState(State.Roam);
    }
}

