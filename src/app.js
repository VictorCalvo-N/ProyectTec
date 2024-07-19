import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import session from "express-session";

import userRoutes from "./routes/users.js";
import adminRoutes from "./routes/admin.js";
import clienteRoutes from "./routes/cliente.js";
import contentRoutes from "./routes/contents.js";
import bodyParser from "body-parser";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.urlencoded({ extended: true }));

// Configurar middleware de sesión
app.use(session({
  secret: 'mySecretKey',
  resave: false,
  saveUninitialized: true
}));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para pasar el estado de sesión a las vistas
app.use((req, res, next) => {
  res.locals.loggedIn = req.session.loggedIn || false;
  next();
});

app.use("/users", userRoutes);
app.use("/admin", adminRoutes);
app.use("/cliente", clienteRoutes);
app.use("/contents", contentRoutes);

app.get("/", (req, res) => {
  res.render("index", { page: 'index', loggedIn: res.locals.loggedIn });
});

app.get("/login", (req, res) => {
  res.render("login", { error: null, page: 'login', loggedIn: res.locals.loggedIn });
});

app.get("/register", (req, res) => {
  res.render("register", { error: null, page: 'register', loggedIn: res.locals.loggedIn });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
