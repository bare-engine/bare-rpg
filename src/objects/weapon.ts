import { GameObject, InspectorField, PhysicsObjectBare, Scene } from "bare-engine";

export class Weapon extends PhysicsObjectBare
{   
    @InspectorField
    strength:number = 1;

    constructor(scene: Scene)
    {
        super(scene)
    }
}