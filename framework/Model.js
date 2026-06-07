import { DB } from "./DB.js";

export class Model {
    table = null;
    fillable = [];
    hidden = [];
    timestamps = true;

    constructor(attributes) {
        if (attributes) {
            Object.assign(this, attributes);
        }
    }

    static _instance() {
        return new this();
    }

    static find(id) {
        const instance = this._instance();
        const row = DB.table(instance.table).where("id", id).first();
        if (!row) return null;
        return new this(row);
    }

    static all() {
        const instance = this._instance();
        const rows = DB.table(instance.table).get();
        return rows.map(row => new this(row));
    }

    static where(field, operator, value) {
        const instance = this._instance();
        return new ModelQuery(this, instance.table).where(field, operator, value);
    }

    static create(data) {
        const instance = this._instance();
        const filtered = {};

        for (const key of instance.fillable) {
            if (data[key] !== undefined) {
                filtered[key] = data[key];
            }
        }

        if (instance.timestamps) {
            const now = new Date().toISOString();
            filtered.created_at = now;
            filtered.updated_at = now;
        }

        const id = DB.table(instance.table).insert(filtered);
        return this.find(id);
    }

    save() {
        const instance = this.constructor._instance();
        const data = {};

        for (const key of instance.fillable) {
            if (this[key] !== undefined) {
                data[key] = this[key];
            }
        }

        if (instance.timestamps) {
            data.updated_at = new Date().toISOString();
        }

        DB.table(instance.table).where("id", this.id).update(data);
        return this;
    }

    update(data) {
        const instance = this.constructor._instance();

        for (const key of instance.fillable) {
            if (data[key] !== undefined) {
                this[key] = data[key];
            }
        }

        if (instance.timestamps) {
            this.updated_at = new Date().toISOString();
        }

        const filtered = {};
        for (const key of instance.fillable) {
            if (this[key] !== undefined) {
                filtered[key] = this[key];
            }
        }
        if (instance.timestamps) {
            filtered.updated_at = this.updated_at;
        }

        DB.table(instance.table).where("id", this.id).update(filtered);
        return this;
    }

    delete() {
        const instance = this.constructor._instance();
        DB.table(instance.table).where("id", this.id).delete();
    }

    toJSON() {
        const instance = this.constructor._instance();
        const internal = ["table", "fillable", "hidden", "timestamps"];
        const obj = {};

        for (const key of Object.keys(this)) {
            if (internal.includes(key)) continue;
            if (instance.hidden.includes(key)) continue;
            obj[key] = this[key];
        }

        return obj;
    }
}

class ModelQuery {
    constructor(modelClass, table) {
        this._modelClass = modelClass;
        this._builder = DB.table(table);
    }

    where(field, operator, value) {
        this._builder = this._builder.where(field, operator, value);
        return this;
    }

    orderBy(field, direction) {
        this._builder = this._builder.orderBy(field, direction);
        return this;
    }

    limit(n) {
        this._builder = this._builder.limit(n);
        return this;
    }

    offset(n) {
        this._builder = this._builder.offset(n);
        return this;
    }

    get() {
        const rows = this._builder.get();
        return rows.map(row => new this._modelClass(row));
    }

    first() {
        const row = this._builder.first();
        if (!row) return null;
        return new this._modelClass(row);
    }

    count() {
        return this._builder.count();
    }
}
