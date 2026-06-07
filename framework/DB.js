import { database } from "../config/database.js";

let db = null;
let driver = null;

export const DB = {
    connect() {
        driver = database.driver;

        if (driver === "none") return this;

        if (driver === "sqlite") {
            db = sqlite.open(database.sqlite.path);
        } else if (driver === "mysql") {
            const cfg = database.mysql;
            db = mysql.connect(cfg.host, cfg.user, cfg.password, cfg.database, cfg.port);
        }

        return this;
    },

    close() {
        if (db) {
            db.close();
            db = null;
        }
    },

    raw(sql, params) {
        return db.query(sql, params || []);
    },

    exec(sql, params) {
        return db.exec(sql, params || []);
    },

    lastInsertId() {
        return db.lastInsertId();
    },

    changes() {
        return db.changes();
    },

    table(name) {
        return new QueryBuilder(name);
    }
};

class QueryBuilder {
    constructor(tableName) {
        this._table = tableName;
        this._wheres = [];
        this._params = [];
        this._orderBy = null;
        this._limit = null;
        this._offset = null;
        this._select = "*";
    }

    select(...fields) {
        this._select = fields.join(", ");
        return this;
    }

    where(field, operator, value) {
        if (value === undefined) {
            value = operator;
            operator = "=";
        }
        this._wheres.push(`${field} ${operator} ?`);
        this._params.push(value);
        return this;
    }

    orderBy(field, direction) {
        this._orderBy = `${field} ${(direction || "ASC").toUpperCase()}`;
        return this;
    }

    limit(n) {
        this._limit = n;
        return this;
    }

    offset(n) {
        this._offset = n;
        return this;
    }

    _buildSelect() {
        let sql = `SELECT ${this._select} FROM ${this._table}`;
        if (this._wheres.length) sql += " WHERE " + this._wheres.join(" AND ");
        if (this._orderBy) sql += " ORDER BY " + this._orderBy;
        if (this._limit) sql += " LIMIT " + this._limit;
        if (this._offset) sql += " OFFSET " + this._offset;
        return sql;
    }

    get() {
        return db.query(this._buildSelect(), this._params);
    }

    first() {
        this._limit = 1;
        const rows = this.get();
        return rows.length ? rows[0] : null;
    }

    count() {
        const sql = `SELECT COUNT(*) as count FROM ${this._table}` +
            (this._wheres.length ? " WHERE " + this._wheres.join(" AND ") : "");
        const rows = db.query(sql, this._params);
        return rows[0].count;
    }

    insert(data) {
        const keys = Object.keys(data);
        const placeholders = keys.map(() => "?").join(", ");
        const sql = `INSERT INTO ${this._table} (${keys.join(", ")}) VALUES (${placeholders})`;
        db.exec(sql, keys.map(k => data[k]));
        return db.lastInsertId();
    }

    update(data) {
        const keys = Object.keys(data);
        const sets = keys.map(k => `${k} = ?`).join(", ");
        const params = keys.map(k => data[k]).concat(this._params);
        const sql = `UPDATE ${this._table} SET ${sets}` +
            (this._wheres.length ? " WHERE " + this._wheres.join(" AND ") : "");
        db.exec(sql, params);
    }

    delete() {
        const sql = `DELETE FROM ${this._table}` +
            (this._wheres.length ? " WHERE " + this._wheres.join(" AND ") : "");
        db.exec(sql, this._params);
    }
}
