import { DB } from "./DB.js";

export const Auth = {
    _user: null,

    init() {
        session.start();
        const userId = session.get("auth_user_id");
        if (userId) {
            this._user = DB.table("users").where("id", userId).first();
        }
    },

    user() {
        return this._user;
    },

    check() {
        return this._user !== null;
    },

    attempt(email, password) {
        const hash = crypto.sha256(password);
        const user = DB.table("users")
            .where("email", email)
            .where("password", hash)
            .first();

        if (user) {
            session.set("auth_user_id", user.id);
            this._user = user;
            return true;
        }
        return false;
    },

    logout() {
        session.set("auth_user_id", null);
        this._user = null;
    },

    hashPassword(password) {
        return crypto.sha256(password);
    }
};
