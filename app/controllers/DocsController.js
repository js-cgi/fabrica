import { Response } from "../../framework/Response.js";

export const DocsController = {
    index(ctx) {
        Response.view("docs/index");
    },

    routing(ctx) {
        Response.view("docs/routing");
    },

    controllers(ctx) {
        Response.view("docs/controllers");
    },

    middleware(ctx) {
        Response.view("docs/middleware");
    },

    database(ctx) {
        Response.view("docs/database");
    },

    authentication(ctx) {
        Response.view("docs/authentication");
    },

    views(ctx) {
        Response.view("docs/views");
    }
};
