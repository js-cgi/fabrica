# JS-CGI-MVC

A lightweight MVC framework for [js-cgi](https://github.com/js-cgi/js-cgi). Build structured web applications with routing, controllers, a template engine, database queries, authentication, and middleware — all in plain JavaScript with zero dependencies.

## Requirements

- [js-cgi](https://js-cgi.com/download) v0.1.0+
- Extensions: `sqlite.so`, `session.so`, `file.so`, `crypto.so`

## Quick Start

```bash
git clone https://github.com/js-cgi/js-cgi-mvc.git myapp
cd myapp
js-cgi --serve 8000
```

Visit `http://localhost:8000` — you should see the framework welcome page.

## Project Structure

```
myapp/
├── index.js                    # Entry point (front controller)
├── routes.js                   # Route definitions
├── .htaccess                   # Apache rewrite rules
├── framework/                  # Core framework
│   ├── Router.js               # Route registration and resolution
│   ├── DB.js                   # Database connection and query builder
│   ├── Auth.js                 # Session-based authentication
│   ├── Response.js             # Response helpers (JSON, HTML, view, redirect)
│   ├── View.js                 # Template engine with Blade-like syntax
│   └── Pipeline.js             # Middleware pipeline
├── app/
│   ├── controllers/            # Application controllers
│   │   ├── HomeController.js
│   │   └── AuthController.js
│   └── middleware/             # Custom middleware
│       └── auth.js
├── views/
│   ├── layouts/                # Layout templates
│   ├── pages/                  # Page templates
│   ├── partials/               # Reusable partials
│   └── components/             # Components with slots
├── database/
│   └── migrations/             # Database migrations
└── storage/
    └── app.db                  # SQLite database
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

## Database

SQLite query builder with a chainable API:

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
- **Directives** — `@json`, `@class`, `@checked`, `@selected`, `@disabled`, `@required`
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
