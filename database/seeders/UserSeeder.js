import { DB } from "../../framework/DB.js";
import { Auth } from "../../framework/Auth.js";

export function run() {
    DB.table("users").insert({
        name: "Admin",
        email: "admin@example.com",
        password: Auth.hashPassword("password"),
        created_at: "2026-01-01T00:00:00.000Z"
    });
}
