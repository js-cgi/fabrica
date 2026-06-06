const routes = [];
const groupStack = [];

function normalizePath(path) {
    if (path === "/") return "/";
    return "/" + path.replace(/^\/+|\/+$/g, "");
}

function buildPattern(path) {
    const paramNames = [];
    const regexStr = path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
        paramNames.push(name);
        return "([^/]+)";
    });
    return { regex: new RegExp("^" + regexStr + "$"), paramNames };
}

export const Router = {
    get(path, handler, middleware) {
        return this.add("GET", path, handler, middleware);
    },

    post(path, handler, middleware) {
        return this.add("POST", path, handler, middleware);
    },

    put(path, handler, middleware) {
        return this.add("PUT", path, handler, middleware);
    },

    delete(path, handler, middleware) {
        return this.add("DELETE", path, handler, middleware);
    },

    add(method, path, handler, middleware) {
        const prefix = groupStack.reduce((acc, g) => acc + (g.prefix || ""), "");
        const groupMiddleware = groupStack.reduce((acc, g) => acc.concat(g.middleware || []), []);
        const fullPath = normalizePath(prefix + path);
        const allMiddleware = groupMiddleware.concat(middleware || []);
        const { regex, paramNames } = buildPattern(fullPath);

        routes.push({ method, path: fullPath, regex, paramNames, handler, middleware: allMiddleware });
        return this;
    },

    group(options, fn) {
        groupStack.push(options);
        fn();
        groupStack.pop();
        return this;
    },

    resolve(method, path) {
        const normalizedPath = normalizePath(path);
        for (const route of routes) {
            if (route.method !== method) continue;
            const match = normalizedPath.match(route.regex);
            if (match) {
                const params = {};
                route.paramNames.forEach((name, i) => {
                    params[name] = decodeURIComponent(match[i + 1]);
                });
                return { handler: route.handler, params, middleware: route.middleware };
            }
        }
        return null;
    },

    list() {
        return routes.map(r => ({ method: r.method, path: r.path, middleware: r.middleware }));
    }
};
