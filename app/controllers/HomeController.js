import { Response } from "../../framework/Response.js";
import { Fabrica } from "../../framework/Fabrica.js";

export const HomeController = {
    index(ctx) {
        Response.view("pages/home", { version: Fabrica.VERSION });
    }
};
