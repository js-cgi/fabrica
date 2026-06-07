import { Auth } from "../../framework/Auth.js";
import { Response } from "../../framework/Response.js";
import { User } from "../models/User.js";

export const AuthController = {
    register(ctx) {
        const { name, email, password } = ctx.body;

        if (!name || !email || !password) {
            Response.json({ error: "Name, email and password are required" }, 422);
            return;
        }

        const existing = User.where("email", email).first();
        if (existing) {
            Response.json({ error: "Email already registered" }, 422);
            return;
        }

        const user = User.create({
            name,
            email,
            password: Auth.hashPassword(password)
        });

        Auth.attempt(email, password);

        Response.json({ message: "Registration successful", user: user.toJSON() }, 201);
    },

    login(ctx) {
        const { email, password } = ctx.body;

        if (!email || !password) {
            Response.json({ error: "Email and password are required" }, 422);
            return;
        }

        if (Auth.attempt(email, password)) {
            const user = User.find(Auth.user().id);
            Response.json({ message: "Login successful", user: user.toJSON() });
        } else {
            Response.json({ error: "Invalid credentials" }, 401);
        }
    },

    logout(ctx) {
        Auth.logout();
        Response.json({ message: "Logged out" });
    },

    me(ctx) {
        const user = User.find(Auth.user().id);
        Response.json({ user: user.toJSON() });
    }
};
