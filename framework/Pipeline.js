const registeredMiddleware = {};

export const Pipeline = {
    register(name, fn) {
        registeredMiddleware[name] = fn;
    },

    run(middlewareNames, ctx) {
        for (const name of middlewareNames) {
            const fn = registeredMiddleware[name];
            if (!fn) {
                response.setStatus(500);
                print(`Middleware "${name}" not registered`);
                return false;
            }
            const result = fn(ctx);
            if (result === false) return false;
        }
        return true;
    }
};
