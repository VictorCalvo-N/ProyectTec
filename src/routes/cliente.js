import { Router } from "express";
import { pool } from "../database/connectionMySQL.js";

const router = Router();

router.get('/menu_principal', async (req, res) => {
  try {
    // Verifica que req.session.userId esté definido y no sea nulo
    if (!req.session.userId) {
      throw new Error('Usuario no autenticado');
    }

    // Consulta para obtener los datos del usuario
    const [usuario] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);

    // Verifica que el usuario exista
    if (usuario.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    // Consulta para obtener los contenidos más descargados
    const [contenidos] = await pool.query('SELECT * FROM contenidos ORDER BY descargas DESC LIMIT 10');

    // Renderiza la vista con los datos obtenidos
    res.render('cliente/menu_principal', {
      loggedIn: req.session.loggedIn,
      usuario: usuario[0],
      contenidos: contenidos
    });
  } catch (error) {
    console.error('Error al obtener datos:', error);
    res.send('Error al obtener datos');
  }
});

router.get("/agregar_saldo", (req, res) => {
  if (req.session.loggedIn && req.session.tipo_usuario === 'cliente') {
    res.render("cliente/agregar_saldo", { loggedIn: req.session.loggedIn });
  } else {
    res.redirect("/login");
  }
});

router.post('/solicitar_saldo', async (req, res) => {
  const { usuario_id, saldo_solicitado } = req.body;
  try {
    const [result] = await pool.query('INSERT INTO pedidos_saldo (usuario_id, saldo_solicitado) VALUES (?, ?)', [usuario_id, saldo_solicitado]);
    res.redirect('/cliente/menu_principal');
  } catch (error) {
    console.error(error);
    res.send('Error al solicitar saldo');
  }
});

export default router;
