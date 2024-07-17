import { Router } from "express";
import { pool } from "../database/connectionMySQL.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const [result] = await pool.query("SELECT id, nombre_completo, login, saldo, tipo_usuario, estado FROM usuarios");
    res.render("users", { users: result, loggedIn: req.session.loggedIn });
  } catch (error) {
    console.log(error);
    res.status(500).send("Error retrieving users");
  }
});

router.post("/register", async (req, res) => {
  const { nombre_completo, login, password, tipo_usuario } = req.body;
  try {
    const [existingUser] = await pool.query("SELECT * FROM usuarios WHERE login = ?", [login]);
    if (existingUser.length > 0) {
      return res.render("register", { error: "El nombre de usuario ya está en uso", page: 'register', loggedIn: false });
    }
    await pool.query("INSERT INTO usuarios (nombre_completo, login, password, tipo_usuario) VALUES (?, ?, ?, ?)", [nombre_completo, login, password, tipo_usuario]);
    res.redirect("/users");
  } catch (error) {
    console.log("Error during registration: ", error);
    res.status(500).send("Error registering user");
  }
});

router.post("/login", async (req, res) => {
  const { login, password } = req.body;
  try {
    const [result] = await pool.query("SELECT * FROM usuarios WHERE login = ? AND password = ?", [login, password]);
    if (result.length > 0) {
      req.session.loggedIn = true;
      req.session.tipo_usuario = result[0].tipo_usuario;
      if (req.session.tipo_usuario === 'admin') {
        res.redirect("/admin/confirmar_pedidos");
      } else {
        res.redirect("/cliente/dashboard");
      }
    } else {
      res.render("login", { error: "Usuario o contraseña incorrectos", page: 'login', loggedIn: false });
    }
  } catch (error) {
    console.log("Error during login: ", error);
    res.status(500).send("Error logging in user");
  }
});

// Ruta GET para cerrar sesión
router.get("/logout", (req, res) => {
  req.session.loggedIn = false;
  req.session.tipo_usuario = null;
  res.redirect("/");
});

router.post("/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("UPDATE usuarios SET estado = 'ex-cliente' WHERE id = ?", [id]);
    res.redirect("/users");
  } catch (error) {
    console.log(error);
    res.status(500).send("Error deleting user");
  }
});

export default router;
