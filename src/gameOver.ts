import { Color, Scene, TextTexture } from "bare-engine";

export class GameOver extends Scene
{
    async OnStart()
    {
        bare.SetBackgroundColor(Color.fromHex("#ff5c55"));

        this.AddGameObject(new TextTexture(rapid, {text: "Game Over", fill: "#ffffff"}))
            .SetPosition(this.width * .5, this.height * .5)
            .CenterPivot();

        this.RestartWithDelay(1.5);
    }

    async RestartWithDelay(delaySeconds: number)
    {
        await wait(delaySeconds, true);
        bare.Restart();
    }
}