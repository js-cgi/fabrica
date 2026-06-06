import { Auth } from "../../framework/Auth.js";
import { Response } from "../../framework/Response.js";
import { DB } from "../../framework/DB.js";

export const AuthController = {
    register(ctx) {
        const { name, email, password } = ctx.body;

        if (!name || !email || !password) {
            Response.json({ error: "Name, email and password are required" }, 422);
            return;
        }

        const existing = DB.table("users").where("email", email).first();
        if (existing) {
            Response.json({ error: "Email already registered" }, 422);
            return;
        }

        const id = DB.table("users").insert({
            name,
            email,
            password: Auth.hashPassword(password),
            created_at: new Date().toISOString()
        });

        Auth.attempt(email, password);

        Response.json({ message: "Registration successful", user: { id, name, email } }, 201);
    },

    login(ctx) {
        const { email, password } = ctx.body;

        if (!email || !password) {
            Response.json({ error: "Email and password are required" }, 422);
            return;
        }

        if (Auth.attempt(email, password)) {
            const user = Auth.user();
            Response.json({ message: "Login successful", user: { id: user.id, name: user.name, email: user.email } });
        } else {
            Response.json({ error: "Invalid credentials" }, 401);
        }
    },

    logout(ctx) {
        Auth.logout();
        Response.json({ message: "Logged out" });
    },

    me(ctx) {
        const user = Auth.user();
        Response.json({ user: { id: user.id, name: user.name, email: user.email } });
    }
};
