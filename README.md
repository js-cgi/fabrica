# Fabrica

A lightweight MVC framework for [js-cgi](https://github.com/js-cgi/js-cgi). Build structured web applications with routing, controllers, a template engine, database queries, authentication, and middleware — all in plain JavaScript with zero dependencies.

## Requirements

- [js-cgi](https://js-cgi.com/download) v0.1.1+
- Extensions: `session.so`, `file.so`, `crypto.so`
- Database extensions (optional): `sqlite.so`, `mysql.so`

## Quick Start

```bash
git clone https://github.com/js-cgi/fabrica.git myapp
cd myapp
js-cgi --serve 8000 --router index.js
```

Visit `http://localhost:8000` — you should see the framework welcome page.

The `--router index.js` flag tells the dev server to pass all unmatched requests to `index.js`, which handles routing internally.

## Project Structure

```
myapp/
├── fabrica                     # CLI tool (migrations, seeders)
├── index.js                    # Entry point (front controller)
├── routes.js                   # Route definitions
├── .htaccess                   # Apache rewrite rules
├── config/
│   ├── database.js             # Database configuration
│   └── mail.js                 # Mail configuration
├── framework/                  # Core framework
│   ├── Router.js               # Route registration and resolution
│   ├── DB.js                   # Database connection and query builder
│   ├── Model.js                # Base model with relationships
│   ├── Auth.js                 # Session-based authentication
│   ├── Validator.js            # Request validation
│   ├── Mail.js                 # Email (SMTP and SES)
│   ├── Response.js             # Response helpers (JSON, HTML, view, redirect)
│   ├── View.js                 # Template engine with Blade-like syntax
│   └── Pipeline.js             # Middleware pipeline
├── app/
│   ├── controllers/            # Application controllers
│   ├── models/                 # Eloquent-style models
│   └── middleware/             # Custom middleware
├── views/
│   ├── layouts/                # Layout templates
│   ├── pages/                  # Page templates
│   ├── partials/               # Reusable partials
│   └── components/             # Components with slots
├── database/
│   ├── migrations/             # Database migrations
│   └── seeders/                # Database seeders
└── storage/
    └── app.db                  # SQLite database (when using sqlite driver)
```

## CLI

Fabrica includes a command-line tool for managing your application:

```bash
js-cgi fabrica <command>
```

### Available Commands

| Command | Description |
|---------|-------------|
| `migrate` | Run all pending migrations |
| `migrate:rollback` | Rollback the last batch of migrations |
| `migrate:status` | Show which migrations have run and which are pending |
| `db:seed` | Run the default DatabaseSeeder |
| `db:seed <name>` | Run a specific seeder |

## Database Configuration

Configure your database connection in `config/database.js`:

```js
export const database = {
    driver: "none",       // "sqlite", "mysql", or "none"

    sqlite: {
        path: "./storage/app.db"
    },

    mysql: {
        host: "localhost",
        port: 3306,
        user: "root",
        password: "",
        database: "fabrica"
    }
};
```

Set `driver` to `"none"` if your application does not use a database. The framework will run without any database connection.

## Migrations

Migration files live in `database/migrations/` and are ordered by filename prefix:

```js
// database/migrations/001_create_users.js
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
```

Run migrations:

```bash
js-cgi fabrica migrate
js-cgi fabrica migrate:status
js-cgi fabrica migrate:rollback
```

Migrations are tracked in a `migrations` table with batch numbers. Rolling back reverts the last batch only.

## Seeders

Seeders populate the database with data. They live in `database/seeders/`:

```js
// database/seeders/UserSeeder.js
import { DB } from "../../framework/DB.js";
import { Auth } from "../../framework/Auth.js";

export function run() {
    DB.table("users").insert({
        name: "Admin",
        email: "admin@example.com",
        password: Auth.hashPassword("password"),
        created_at: "2026-01-01T00:00:00.000Z"
    });
}
```

Run seeders:

```bash
js-cgi fabrica db:seed              # Runs DatabaseSeeder.js
js-cgi fabrica db:seed UserSeeder   # Runs a specific seeder
```

## Routing

Define routes in `routes.js`:

```js
import { Router } from "./framework/Router.js";
import { HomeController } from "./app/controllers/HomeController.js";

Router.get("/", HomeController.index);
Router.post("/login", AuthController.login);

// Route parameters
Router.get("/users/:id", UserController.show);

// Route groups with prefix and middleware
Router.group({ prefix: "/admin", middleware: ["auth"] }, () => {
    Router.get("/dashboard", AdminController.dashboard);
});
```

## Controllers

```js
import { Response } from "../../framework/Response.js";

export const UserController = {
    index(ctx) {
        Response.view("pages/users", { title: "Users" });
    },

    show(ctx) {
        const user = DB.table("users").where("id", ctx.params.id).first();
        Response.json({ user });
    }
};
```

The `ctx` object contains: `params`, `query`, `body`, `headers`, `cookies`.

## Models

Models represent database tables. Create them in `app/models/`:

```js
// app/models/User.js
import { Model } from "../../framework/Model.js";

export class User extends Model {
    table = "users";
    fillable = ["name", "email", "password"];
    hidden = ["password"];
}
```

### Usage

```js
import { User } from "../models/User.js";

// Find by ID
const user = User.find(1);

// Get all records
const users = User.all();

// Query with conditions
const admins = User.where("role", "admin").get();
const alice = User.where("email", "alice@example.com").first();

// Create a new record
const user = User.create({ name: "Alice", email: "alice@example.com", password: "..." });

// Update via instance
user.update({ name: "Alice Updated" });

// Modify and save
user.name = "New Name";
user.save();

// Delete
user.delete();
```

### Timestamps

Models automatically set `created_at` on creation and `updated_at` on creation and every save/update. To disable timestamps on a model:

```js
export class Log extends Model {
    table = "logs";
    fillable = ["message", "level"];
    timestamps = false;
}
```

### Hidden Fields

Fields listed in `hidden` are stripped from `toJSON()` output. This prevents sensitive data like passwords from appearing in API responses:

```js
const user = User.find(1);
user.password;          // exists on the instance
user.toJSON().password; // undefined — stripped from output
Response.json({ user: user.toJSON() });
```

### Fillable

Only fields listed in `fillable` can be set via `create()` or `update()`. This prevents mass-assignment of fields like `id` or `role` that shouldn't be user-controlled.

### Relationships

Models support `hasMany`, `hasOne`, and `belongsTo` relationships. Define named methods on your models:

```js
// app/models/User.js
import { Model } from "../../framework/Model.js";
import { Post } from "./Post.js";

export class User extends Model {
    table = "users";
    fillable = ["name", "email", "password"];
    hidden = ["password"];

    posts() {
        return this.hasMany(Post, "user_id");
    }
}
```

```js
// app/models/Post.js
import { Model } from "../../framework/Model.js";
import { User } from "./User.js";

export class Post extends Model {
    table = "posts";
    fillable = ["user_id", "title", "body"];

    user() {
        return this.belongsTo(User, "user_id");
    }
}
```

Usage in controllers:

```js
const post = Post.find(1);
const author = post.user();        // returns User instance

const user = User.find(1);
const posts = user.posts();        // returns array of Post instances
```

## Validation

Validate request data with rules:

```js
import { Validator } from "../../framework/Validator.js";

const validation = Validator.validate(ctx.body, {
    name: "required|min:2|max:50",
    email: "required|email",
    password: "required|min:6|confirmed"
});

if (validation.fails) {
    const firstError = Object.values(validation.errors)[0][0];
    // handle error
}
```

### Available Rules

| Rule | Description |
|------|-------------|
| `required` | Field must be present and not empty |
| `email` | Must be a valid email address |
| `min:n` | Must be at least n characters |
| `max:n` | Must not exceed n characters |
| `confirmed` | Field must match `field_confirmation` |
| `numeric` | Must be a number |
| `in:a,b,c` | Must be one of the listed values |

Rules are separated by `|` and can be combined: `"required|email|max:255"`.

The `validate()` method returns an object with:
- `passes` — boolean, true if all rules pass
- `fails` — boolean, true if any rule fails
- `errors` — object keyed by field name, each value is an array of error messages

## Mail

Send emails using SMTP or Amazon SES:

```js
import { Mail } from "../../framework/Mail.js";

Mail.send({
    to: "recipient@example.com",
    subject: "Hello",
    body: "This is the email body."
});
```

### Configuration

Configure your mail driver in `config/mail.js`:

```js
export const mail = {
    driver: "none",       // "smtp", "ses", or "none"

    smtp: {
        host: "",
        port: 587,
        user: "",
        password: "",
        from: ""
    },

    ses: {
        region: "us-east-1",
        key: "",
        secret: "",
        from: ""
    }
};
```

### Drivers

- **`smtp`** — sends via any SMTP server using the `smtp.so` extension (STARTTLS on port 587, direct TLS on port 465)
- **`ses`** — sends via the Amazon SES API using AWS Signature V4 (requires `http.so` and `crypto.so` extensions)
- **`none`** — mail is disabled, `Mail.send()` throws an error

### Overriding the From Address

The `from` address is read from config by default. Override per-email:

```js
Mail.send({
    from: "custom@example.com",
    to: "recipient@example.com",
    subject: "Hello",
    body: "Sent from a different address."
});
```

## Database Query Builder

A chainable API that works with both SQLite and MySQL:

```js
import { DB } from "./framework/DB.js";

// Select
const users = DB.table("users").where("active", 1).orderBy("name").get();
const user = DB.table("users").where("id", 1).first();
const count = DB.table("users").count();

// Insert
const id = DB.table("users").insert({ name: "Alice", email: "alice@example.com" });

// Update
DB.table("users").where("id", 1).update({ name: "Bob" });

// Delete
DB.table("users").where("id", 1).delete();

// Raw queries
DB.raw("SELECT * FROM users WHERE email LIKE ?", ["%@example.com"]);
```

## Views

A template engine with Blade-like syntax:

```html
@extends('layouts/base')

@section('content')
<h1>{{ title }}</h1>

@foreach(users as user)
    <p>{{ user.name }} - {{ user.email }}</p>
@endforeach

@if(showAdmin)
    <a href="/admin">Admin Panel</a>
@endif
@endsection
```

### Features

- **Layouts** — `@extends`, `@section`, `@yield`
- **Includes** — `@include('partials/header')`
- **Components** — `@component('components/card')` with `@slot` support
- **Control flow** — `@if`/`@elseif`/`@else`/`@endif`, `@unless`, `@foreach`, `@for`
- **Output** — `{{ escaped }}` and `{!! raw !!}`
- **Directives** — `@json`, `@class`, `@checked`, `@selected`, `@disabled`, `@required`, `@date`
- **Stacks** — `@push('scripts')` / `@stack('scripts')`
- **Verbatim** — `@verbatim` blocks for raw template content

## Authentication

Session-based authentication built in:

```js
import { Auth } from "./framework/Auth.js";

// In a controller
Auth.attempt(email, password);   // Login (returns true/false)
Auth.check();                    // Is user logged in?
Auth.user();                     // Get current user
Auth.logout();                   // End session
Auth.hashPassword(password);     // SHA256 hash
```

Protect routes with the `auth` middleware:

```js
Router.group({ middleware: ["auth"] }, () => {
    Router.get("/profile", ProfileController.show);
});
```

## Middleware

```js
// app/middleware/auth.js
import { Auth } from "../../framework/Auth.js";
import { Response } from "../../framework/Response.js";

export function authMiddleware(ctx) {
    if (!Auth.check()) {
        Response.json({ error: "Unauthorized" }, 401);
        return false;
    }
    return true;
}
```

Register in `index.js`:

```js
Pipeline.register("auth", authMiddleware);
```

## Response Methods

```js
Response.json({ key: "value" }, 200);      // JSON response
Response.html("<h1>Hello</h1>");            // Raw HTML
Response.view("pages/home", { data });      // Render a view
Response.redirect("/login");                // 302 redirect
Response.abort(404, "Not Found");           // Error page
```

## Apache Configuration

The included `.htaccess` routes all requests through `index.js`:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^(.*)$ /index.js [QSA,L]
```

For Nginx with FastCGI, route all non-file requests to `/index.js`:

```nginx
location / {
    try_files $uri /index.js?$query_string;
}

location ~ \.js$ {
    fastcgi_pass unix:/var/run/js-cgi.sock;
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
}
```

## License

MIT
