import { BaseComponent } from "bare-engine";
import { flashShader } from "../game";

export class FlashOnHitComponent extends BaseComponent
{
    OnHit(): void
    {
        this.go.AddShader(flashShader);
    }
}