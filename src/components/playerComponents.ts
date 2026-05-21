import { BareEvent, BaseComponent, componentController, Events, globalEvents, keyboardController, levelHandler, PhysicsObjectBare, SaveData, Size, TweenTo, Vec2 } from "bare-engine";
import { Direction, MapHandler } from "../handlers/mapHandler";
import { Weapon } from "../objects/weapon";

export class PlayerComponent extends BaseComponent
{
    go: PhysicsObjectBare;

    speed = 120;
    weapon:Weapon;
    stunned: boolean = false;
    
    OnAdded(): void
    {
        this.weapon = this.go.GetChildByName("tile_0104") as Weapon;
        this.weapon.physicsHitbox.active = false;
        this.weapon.events.on(BareEvent.collision_start, (object: PhysicsObjectBare) => {
            var dirVec = object.GetCenterPosition().subtract(this.go.GetCenterPosition()).normalize();
            var hitVec = dirVec.multiply(300);
            object.SetVelocity(hitVec);

            componentController.CallMethodOnComponentsOfObject("OnHit", object, this.weapon.strength, this.go);
        });

        globalEvents.persistent.on(BareEvent.pointer_up, (mouseData: Events['pointer_up']) => {
            this.Attack();
        });
    }

    OnUpdate(deltaTime: number): void
    {
        this.CheckMovementKeys();
        this.CheckOffScreen();
    }

    async OnHit()
    {
        // SET stunned FOR A WHILE, SO YOU CAN'T MOVE OR ATTACK WHILE BEING LAUNCHED AWAY
        this.stunned = true;
        await wait(.4, true);
        this.stunned = false;
    }

    OnDie()
    {
        this.go.stayInBounds = true;
        events.emit("playerDied");
    }
    
    MovePlayer(normVec: Vec2)
    {
        if (this.stunned)
            return;

        this.go.SetVelocity(normVec.multiply(this.speed));

        if (normVec.x != 0)
            this.go.flipped = (normVec.x < 0);
    }

    CheckMovementKeys()
    {
        if (keyboardController.IsAnyDirectionKeyDown())
        {
            var vel = new Vec2(0, 0);

            // KEYBOARD MOVEMENT
            if (keyboardController.IsLeftDown())
            {
                vel.x = -1;
            }
            if (keyboardController.IsRightDown())
            {
                vel.x = 1;
            }
            if (keyboardController.IsUpDown())
            {
                vel.y = -1;
            }
            if (keyboardController.IsDownDown())
            {
                vel.y = 1;
            }
            
            // LIMIT MOVEMENT, SINCE TWO ORTHOGONAL VELOCITIES EXCEED THE MAX VELOCITY
            var speed = vel.length();
            if (speed > 1)
            {
                vel = vel.normalize();
            }

            // FINALLY, APPLY THE VELOCITY
            this.MovePlayer(vel);
        }

        if (keyboardController.IsKeyPressed("space"))
        {
            this.Attack();
        }
    }

    async Attack()
    {
        if (this.stunned)
            return;

        this.weapon.rotation = 0;
        TweenTo(this.weapon, .1, { rotation: 60, persistent: true, yoyo: true });
        
        this.weapon.physicsHitbox.active = true;
        await wait(.05, true);
        this.weapon.physicsHitbox.active = false;
    }

    CheckOffScreen()
    {
        if (!levelHandler.currentLevel)
            return;

        if (this.go.velocity.isZero())
            return;

        var dims:Size = levelHandler.currentLevel.dimensions;
        var checkLevel = (dir:Direction) =>{
            var newLevel = MapHandler.GetLevelInDirectionFrom(SaveData.currentLevelStr, dir);
            if (newLevel != "")
            {
                var loadLevel = async () => {
                    levelHandler.SaveLevel();
                    
                    await levelHandler.LoadLevel(newLevel);

                    // WARP PLAYER POSITION
                    let dimsNewLevel:Size = levelHandler.currentLevel.dimensions;
                    if (dir == "left")
                    {
                        this.go.x = dimsNewLevel.width;
                    }
                    if (dir == "right")
                    {
                        this.go.x = 0;
                    }
                    if (dir == "top")
                    {
                        this.go.y = dimsNewLevel.height;
                        this.go.x = (this.go.x / dims.width) * dimsNewLevel.width;
                    }
                    if (dir == "bottom")
                    {
                        this.go.y = 0;
                        this.go.x = (this.go.x / dims.width) * dimsNewLevel.width;
                    }
                }
                
                loadLevel();
            }
        }

        if (this.go.x < 0)
        {
            this.go.x = 0;
            checkLevel("left");
        }
        else
        if (this.go.x > dims.width)
        {
            this.go.x = dims.width;
            checkLevel("right");
        }
        else
        if (this.go.y < 0)
        {
            this.go.y = 0;
            checkLevel("top");
        }
        else
        if (this.go.y > dims.height)
        {
            this.go.y = dims.height;
            checkLevel("bottom");
        }
    }
}