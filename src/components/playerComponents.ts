import { BareEvent, Component, InspectorField, SaveData, Size, Vec2 } from "bare-engine";
import { ArcadeObject } from "bare-engine/arcade";
import { Direction, MapHandler } from "../handlers/mapHandler";
import { Weapon } from "../objects/weapon";

export class PlayerComponent extends Component
{
    go: ArcadeObject;

    @InspectorField speed = 90;
    stunned: boolean = false;
    
    weapon:Weapon;
    
    OnAdded(): void
    {
        // GET WEAPON - ALREADY ADDED IN player ENTITY
        this.weapon = this.go.GetChildByName("weapon") as Weapon;
        this.weapon.physicsHitbox.active = false;

        // WEAPON HIT CALLS OnHit ON COMPONENTS
        this.weapon.events.on(BareEvent.collision_start, (object: ArcadeObject) => {
            bare.component.CallMethodOnComponentsOfObject("OnHit", object, this.weapon.strength, this.go);
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
        this.weapon.active = false; // STOPS UPDATING

        this.go.stayInBounds = true;

        bare.events.emit("playerDied");
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
        if (bare.keyboard.IsAnyDirectionKeyDown())
        {
            var vel = new Vec2(0, 0);

            // KEYBOARD MOVEMENT
            if (bare.keyboard.IsLeftDown())
            {
                vel.x = -1;
            }
            if (bare.keyboard.IsRightDown())
            {
                vel.x = 1;
            }
            if (bare.keyboard.IsUpDown())
            {
                vel.y = -1;
            }
            if (bare.keyboard.IsDownDown())
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

        if (bare.keyboard.IsKeyPressed("space"))
        {
            this.Attack();
        }
    }

    async Attack()
    {
        if (this.stunned)
            return;

        if (this.weapon.CanSlash())
            this.weapon.Slash();
    }

    CheckOffScreen()
    {
        if (!bare.level.currentLevel)
            return;

        if (this.go.velocity.isZero())
            return;

        var dims:Size = bare.level.currentLevel.dimensions;
        var checkLevel = (dir:Direction) =>{
            var newLevel = MapHandler.GetLevelInDirectionFrom(SaveData.currentLevelStr, dir);
            if (newLevel != "")
            {
                var loadLevel = async () => {
                    bare.level.Save();
                    
                    await bare.level.Load(newLevel);

                    // WARP PLAYER POSITION
                    let dimsNewLevel:Size = bare.level.currentLevel.dimensions;
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