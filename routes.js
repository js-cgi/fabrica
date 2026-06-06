import { Router } from "./framework/Router.js";
import { HomeController } from "./app/controllers/HomeController.js";
import { AuthController } from "./app/controllers/AuthController.js";
import { DocsController } from "./app/controllers/DocsController.js";

Router.get("/", HomeController.index);

Router.get("/docs", DocsController.index);
Router.get("/docs/routing", DocsController.routing);
Router.get("/docs/controllers", DocsController.controllers);
Router.get("/docs/middleware", DocsController.middleware);
Router.get("/docs/database", DocsController.database);
Router.get("/docs/authentication", DocsController.authentication);
Router.get("/docs/views", DocsController.views);

Router.post("/register", AuthController.register);
Router.post("/login", AuthController.login);

Router.group({ prefix: "/auth", middleware: ["auth"] }, () => {
    Router.post("/logout", AuthController.logout);
    Router.get("/me", AuthController.me);
});
