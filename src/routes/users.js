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

router.post('/register', async (req, res) => {
  const { nombre_completo, login, password, tipo_usuario } = req.body;
  try {
    const [result] = await pool.query('INSERT INTO usuarios (nombre_completo, login, password, tipo_usuario) VALUES (?, ?, ?, ?)', 
      [nombre_completo, login, password, tipo_usuario]);

    req.session.userId = result.insertId;
    req.session.loggedIn = true;
    req.session.tipo_usuario = tipo_usuario;

    if (tipo_usuario === 'admin') {
      res.redirect('/admin/confirmar_pedidos');
    } else {
      res.redirect('/cliente/menu_principal');
    }
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.render('register', { error: 'Error al registrar usuario', page: 'register', loggedIn: false });
  }
});

// Ruta para manejar el inicio de sesión
router.post('/login', async (req, res) => {
  const { login, password } = req.body;
  try {
    const [results] = await pool.query('SELECT * FROM usuarios WHERE login = ? AND password = ?', [login, password]);

    if (results.length > 0) {
      req.session.userId = results[0].id;
      req.session.loggedIn = true;
      req.session.tipo_usuario = results[0].tipo_usuario;

      if (results[0].tipo_usuario === 'admin') {
        res.redirect('/admin/confirmar_pedidos');
      } else {
        res.redirect('/cliente/menu_principal');
      }
    } else {
      res.render('login', { error: 'Usuario o contraseña incorrectos', page: 'login', loggedIn: false });
    }
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.send('Error al iniciar sesión');
  }
});


// Ruta para manejar el cierre de sesión
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
    }
    res.redirect('/login');
  });
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
