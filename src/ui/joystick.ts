import { BareEvent, Easing, Events, GameObject, mouseController, PhysicsObjectBare, Scene, tweenController, TweenTo, Vec2 } from "bare-engine";

export class Joystick extends GameObject
{
    private controlledObject: PhysicsObjectBare;
    private moveSpeed: number = 500;

    private stick: GameObject;
    private interactDistance: number = 13;
    private stickDeltaNormalized: Vec2 = new Vec2(0, 0);
    private callback: (normalizedVec: Vec2) => void;
    
    constructor(scene: Scene, callback: (normalizedVec: Vec2) => void)
    {
        super(scene, "ring");

        this.persistent = true;
        this.alpha = .5;

        this.callback = callback;

        this.CenterPivot();
        this.SetPosition(bare.width * .75, bare.height * .75);

        this.stick = new GameObject(scene, "circle");
        this.stick.CenterPivot();
        this.stick.SetPosition(this.pivotX, this.pivotY);
        this.AddChild(this.stick)
        
        events.on(BareEvent.pointer_down, this.PointerDown.bind(this), 'pointer_down');
        events.on(BareEvent.pointer_move, this.PointerMove.bind(this), 'pointer_move');
        events.on(BareEvent.pointer_up, this.PointerUp.bind(this), 'pointer_up');
    }

    OnUpdate(): void
    {
        var vec = this.stickDeltaNormalized;
        if (vec.squaredLength() > 0)
        {
            this.callback(vec);
        }
    }


    private PointerDown({ mouseX, mouseY, event, isLeftButton }: Events['pointerDown']): void
    {
        if (!isLeftButton)
            return;

        var p = mouseController.screen.position;
        this.SetPosition(p.x, p.y);

        this.SetStickPosition(0, 0);
        this.stickDeltaNormalized.set(0, 0);

        this.alpha = .7;
        
        tweenController.RemoveTweensFrom(this.stick.innerPosition);
        tweenController.RemoveTweensFrom(this);
    }

    private PointerMove({ mouseX, mouseY, event, isLeftButton }: Events['pointerMove']): void
    {
        if (!mouseController.IsMouseDown())
            return;

        if (mouseController.IsRightMouseDown() || mouseController.IsMiddleMouseDown())
            return;

        var p = mouseController.screen.position;
        var localPos = this.ToLocal(p).subtract(this.pivot);
        this.SetStickPosition(localPos.x, localPos.y);

        var normalized = this.NormalizedStickVector;
        this.stickDeltaNormalized.set(normalized.x, normalized.y);
    }

    private PointerUp({ mouseX, mouseY, event, isLeftButton }: Events['pointerUp']): void
    {
        if (!isLeftButton)
            return;

        TweenTo(this.stick.innerPosition, .4, { delay: .12, x: 0, y: 0, ease: Easing.Sinusoidal.InOut });
        TweenTo(this, .6, { delay: .4, alpha: 0 });

        this.stickDeltaNormalized.set(0, 0);
    }

    SetStickPosition(x: number, y: number): Vec2
    {
        var deltaVec = new Vec2(x, y);

        var l = deltaVec.length();
        deltaVec = deltaVec.normalize();
        deltaVec = deltaVec.multiply(l / this.scale.x);

        var deltaVecLength = deltaVec.length();

        var maxForMove = 500;
        if (deltaVecLength > maxForMove)
        {
            var overshoot = (deltaVecLength - maxForMove) * this.scale.x;
            var dir = deltaVec.normalize();
            this.x += dir.x * overshoot;
            this.y += dir.y * overshoot;
            deltaVec = dir.multiply(maxForMove);
            deltaVecLength = maxForMove;
        }

        if (deltaVecLength > this.interactDistance)
        {
            deltaVec = deltaVec.normalize();
            deltaVec = deltaVec.multiply(this.interactDistance);
        }
        
        this.stick.innerPosition.set(deltaVec.x, deltaVec.y);

        return deltaVec;
    }

    get NormalizedStickVector(): Vec2
    {
        var normStickVec = this.stick.innerPosition;
        normStickVec = normStickVec.divide(this.interactDistance);

        return normStickVec;
    }
}