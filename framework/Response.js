import { View } from "./View.js";

export const Response = {
    json(data, status) {
        if (status) response.setStatus(status);
        response.setHeader("Content-Type", "application/json");
        print(JSON.stringify(data));
    },

    html(content, status) {
        if (status) response.setStatus(status);
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        print(content);
    },

    view(name, data, status) {
        const content = View.render(name, data);
        this.html(content, status);
    },

    redirect(url, status) {
        response.setStatus(status || 302);
        response.setHeader("Location", url);
    },

    abort(status, message) {
        response.setStatus(status);
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        print(`<h1>${status}</h1><p>${message || ""}</p>`);
    }
};
