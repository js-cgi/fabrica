import { Router } from "./framework/Router.js";
import { Pipeline } from "./framework/Pipeline.js";
import { DB } from "./framework/DB.js";
import { Auth } from "./framework/Auth.js";
import { Response } from "./framework/Response.js";
import { authMiddleware } from "./app/middleware/auth.js";
import "./routes.js";
import { up as migration001 } from "./database/migrations/001_create_users.js";

const DB_PATH = "./storage/app.db";

DB.connect(DB_PATH);

migration001();

Pipeline.register("auth", authMiddleware);

Auth.init();

const method = request.method;
const path = request.path === "/index.js" ? "/" : request.path;

const route = Router.resolve(method, path);

if (!route) {
    Response.abort(404, "Not Found");
} else {
    const ctx = {
        params: route.params,
        query: request.query,
        body: request.body ? (typeof request.body === "string" ? (() => { try { return JSON.parse(request.body); } catch(e) { return request.body; } })() : request.body) : {},
        headers: request.headers,
        cookies: request.cookies
    };

    const passed = Pipeline.run(route.middleware, ctx);
    if (passed) {
        route.handler(ctx);
    }
}

DB.close();
