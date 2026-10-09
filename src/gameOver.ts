import { Color, Scene, TextObject } from "bare-engine";

export class GameOver extends Scene
{
    override async OnStart()
    {
        bare.SetBackgroundColor(Color.fromHex("#ff5c55"));

        this.AddGameObject(new TextObject(this, {text: "Game Over", fill: "#ffffff", fontSize: 38}))
            .SetPosition(bare.width * .5, bare.height * .5)
            .CenterPivot();

        this.RestartWithDelay(1.5);
    }

    async RestartWithDelay(delaySeconds: number)
    {
        await wait(delaySeconds);
        bare.Restart();
    }
}