import { Response } from "../../framework/Response.js";

export const HomeController = {
    index(ctx) {
        Response.view("pages/home");
    }
};
