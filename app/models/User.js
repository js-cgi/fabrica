import { Model } from "../../framework/Model.js";

export class User extends Model {
    table = "users";
    fillable = ["name", "email", "password"];
    hidden = ["password"];
}
