import { keyboardController, LevelHandler, PhysicsObjectBare, SaveData, Size, uiScene, Vec2 } from "bare-engine";
import { Game } from "../game";
import { Joystick } from "../ui/joystick";
import { Direction, MapHandler } from "./mapHandler";

export class MovementHandler
{
    private static playerSpeed = 90;

    private static player:PhysicsObjectBare;
    private static levelHandler:LevelHandler;

    static async Init(scene: Game)
    {
        this.player = scene.player;
        this.levelHandler = scene.levelHandler;

        // CREATE A JOYSTICK AND LET IT MOVE THE PLAYER
        var joystick = new Joystick(uiScene, (normalizedVec: Vec2) => {
            var move = normalizedVec.multiply(this.playerSpeed);
            this.player.SetVelocity(move);
        });
        uiScene.AddGameObject(joystick);
    }

    static OnUpdate(deltaTime: number): void
    {
        this.CheckMovementKeys();
        this.CheckOffScreen();
    }

    static CheckMovementKeys()
    {
        // KEYBOARD MOVEMENT
        if (keyboardController.IsLeftDown())
        {
            this.player.velocity.x = -this.playerSpeed;
        }
        if (keyboardController.IsRightDown())
        {
            this.player.velocity.x = this.playerSpeed;
        }
        if (keyboardController.IsUpDown())
        {
            this.player.velocity.y = -this.playerSpeed;
        }
        if (keyboardController.IsDownDown())
        {
            this.player.velocity.y = this.playerSpeed;
        }

        // LIMIT MOVEMENT, SINCE TWO ORTHOGONAL VELOCITIES EXCEED THE MAX VELOCITY
        var speed = this.player.velocity.length();
        if (speed > this.playerSpeed)
        {
            this.player.velocity = this.player.velocity.normalize().multiply(this.playerSpeed);
        }
    }

    static CheckOffScreen()
    {
        if (!this.levelHandler.currentLevel)
            return;

        if (this.player.velocity.isZero())
            return;

        var dims:Size = this.levelHandler.currentLevel.dimensions;
        var checkLevel = (dir:Direction) =>{
            var newLevel = MapHandler.GetLevelInDirectionFrom(SaveData.currentLevelStr, dir);
            if (newLevel != "")
            {
                var loadLevel = async () => {
                    this.SaveLevel();
                    
                    await this.levelHandler.LoadLevel(newLevel);

                    // WARP PLAYER POSITION
                    let dimsNewLevel:Size = this.levelHandler.currentLevel.dimensions;
                    var marge = 20;
                    if (dir == "left")
                    {
                        this.player.x = dimsNewLevel.width - marge;
                    }
                    if (dir == "right")
                    {
                        this.player.x = marge;
                    }
                    if (dir == "top")
                    {
                        this.player.y = dimsNewLevel.height - marge;
                        this.player.x = (this.player.x / dims.width) * dimsNewLevel.width;
                    }
                    if (dir == "bottom")
                    {
                        this.player.y = marge;
                        this.player.x = (this.player.x / dims.width) * dimsNewLevel.width;
                    }
                }
                
                loadLevel();
            }
        }

        if (this.player.x < 0)
        {
            this.player.x = 0;
            checkLevel("left");
        }
        else
        if (this.player.x > dims.width)
        {
            this.player.x = dims.width;
            checkLevel("right");
        }
        else
        if (this.player.y < 0)
        {
            this.player.y = 0;
            checkLevel("top");
        }
        else
        if (this.player.y > dims.height)
        {
            this.player.y = dims.height;
            checkLevel("bottom");
        }
    }

    static async SaveLevel()
    {
        // KEEP IN BARE?
        this.levelHandler.SaveLevel();
        //SaveDataHandler.Save();
    }
}