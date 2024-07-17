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
  const { nombre_completo, login, password } = req.body;
  try {
    // Comprobar si el nombre de usuario ya existe
    const [existingUser] = await pool.query("SELECT * FROM usuarios WHERE login = ?", [login]);
    if (existingUser.length > 0) {
      // Si el usuario ya existe, renderizar la vista de registro con un mensaje de error
      return res.render("register", { error: "El nombre de usuario ya está en uso", page: 'register', loggedIn: false });
    }
    
    // Si el usuario no existe, insertar el nuevo usuario
    await pool.query("INSERT INTO usuarios (nombre_completo, login, password) VALUES (?, ?, ?)", [nombre_completo, login, password]);
    res.redirect("/users");
  } catch (error) {
    console.log("Error during registration: ", error); // Agregar más detalles del error
    res.status(500).send("Error registering user");
  }
});

router.post("/login", async (req, res) => {
  const { login, password } = req.body;
  try {
    const [result] = await pool.query("SELECT * FROM usuarios WHERE login = ? AND password = ?", [login, password]);
    if (result.length > 0) {
      req.session.loggedIn = true; // Establecer el estado de sesión como logueado
      res.redirect("/contents");
    } else {
      res.render("login", { error: "Usuario o contraseña incorrectos", page: 'login', loggedIn: false });
    }
  } catch (error) {
    console.log("Error during login: ", error); // Agregar más detalles del error
    res.status(500).send("Error logging in user");
  }
});

router.post("/logout", (req, res) => {
  req.session.loggedIn = false; // Simulación de cierre de sesión
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
