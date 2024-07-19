import { Router } from "express";
import { pool } from "../database/connectionMySQL.js";

const router = Router();

router.get('/menu_principal', async (req, res) => {
  try {
    if (!req.session.userId) {
      throw new Error('Usuario no autenticado');
    }

    const [usuario] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);

    if (usuario.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    const [contenidos] = await pool.query('SELECT * FROM contenidos ORDER BY descargas DESC LIMIT 10');

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

const obtenerContenidosPorTipo = async (req, res, tipo) => {
  try {
    if (!req.session.userId) {
      throw new Error('Usuario no autenticado');
    }

    const [usuario] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);

    if (usuario.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    const query = `
      SELECT * FROM contenidos
      WHERE tipo_archivo IN (?)
      ORDER BY descargas DESC LIMIT 10
    `;
    const valores = {
      imagen: ['PNG', 'JPG', 'GIF', 'BMP'],
      sonidos: ['MP3', 'MID', 'WAV'],
      video: ['WMV', 'AVI', 'MPG', 'MOV']
    }[tipo];

    const [contenidos] = await pool.query(query, [valores]);

    res.render('cliente/menu_principal', {
      loggedIn: req.session.loggedIn,
      usuario: usuario[0],
      contenidos: contenidos
    });
  } catch (error) {
    console.error('Error al obtener datos:', error);
    res.send('Error al obtener datos');
  }
};

router.get('/menu_principal', (req, res) => obtenerContenidosPorTipo(req, res, 'imagen'));
router.get('/menu_principal/imagenes', (req, res) => obtenerContenidosPorTipo(req, res, 'imagen'));
router.get('/menu_principal/sonidos', (req, res) => obtenerContenidosPorTipo(req, res, 'sonidos'));
router.get('/menu_principal/video', (req, res) => obtenerContenidosPorTipo(req, res, 'video'));

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
