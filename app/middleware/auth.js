import { Auth } from "../../framework/Auth.js";
import { Response } from "../../framework/Response.js";

export function authMiddleware(ctx) {
    if (!Auth.check()) {
        Response.json({ error: "Unauthorized" }, 401);
        return false;
    }
    return true;
}
