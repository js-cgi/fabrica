import { DB } from "../../framework/DB.js";

export function up() {
    DB.exec(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at TEXT NOT NULL
    )`);
}

export function down() {
    DB.exec(`DROP TABLE IF EXISTS users`);
}
