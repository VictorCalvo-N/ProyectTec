import { Router } from "express";
import { pool } from "../database/connectionMySQL.js";

const router = Router();

let carrito = []; // Array temporal para almacenar los items del carrito

// Ruta para mostrar el carrito
router.get('/carrito', async (req, res) => {
  try {
    if (!req.session.userId) {
      throw new Error('Usuario no autenticado');
    }

    const [usuario] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);
    if (usuario.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    const total = carrito.reduce((sum, item) => sum + item.precio, 0);

    res.render('cliente/carrito', {
      loggedIn: req.session.loggedIn,
      usuario: usuario[0],
      carrito: carrito,
      total: total
    });
  } catch (error) {
    console.error('Error al obtener datos del carrito:', error);
    res.send('Error al obtener datos del carrito');
  }
});

// Ruta para agregar un item al carrito
router.post('/carrito/agregar', async (req, res) => {
  const { id, nombre, precio } = req.body;

  // Verificar si el usuario ya posee el contenido
  const [compras] = await pool.query('SELECT * FROM historial_compras WHERE usuario_id = ? AND contenido_id = ?', [req.session.userId, id]);
  if (compras.length > 0) {
    return res.send('<script>alert("Ya posee este archivo, revisar Cuenta"); window.location.href = "/cliente/carrito";</script>');
  }

  if (!carrito.some(item => item.id === id)) {
    carrito.push({ id, nombre, precio: parseFloat(precio) });
  }
  res.redirect('/cliente/carrito');
});

// Ruta para quitar un item del carrito
router.post('/carrito/quitar', (req, res) => {
  const { id } = req.body;
  carrito = carrito.filter(item => item.id !== id);
  res.redirect('/cliente/carrito');
});

// Ruta para realizar la compra
router.post('/carrito/comprar', async (req, res) => {
  try {
    if (!req.session.userId) {
      throw new Error('Usuario no autenticado');
    }

    const [usuario] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);
    if (usuario.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    const total = carrito.reduce((sum, item) => sum + item.precio, 0);
    if (usuario[0].saldo < total) {
      res.redirect('/cliente/carrito');
    } else {
      // Registrar la compra en historial_compras
      for (let item of carrito) {
        await pool.query('INSERT INTO historial_compras (usuario_id, contenido_id) VALUES (?, ?)', [req.session.userId, item.id]);
      }

      // Actualizar el saldo del usuario
      await pool.query('UPDATE usuarios SET saldo = saldo - ? WHERE id = ?', [total, req.session.userId]);
      carrito = [];
      res.redirect('/cliente/carrito');
    }
  } catch (error) {
    console.error('Error al realizar la compra:', error);
    res.send('Error al realizar la compra');
  }
});

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

router.get("/agregar_saldo", async (req, res) => {
  try {
    if (!req.session.userId) {
      throw new Error('Usuario no autenticado');
    }

    const [usuario] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);

    if (usuario.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    res.render('cliente/agregar_saldo', {
      loggedIn: req.session.loggedIn,
      usuario: usuario[0]
    });
  } catch (error) {
    console.error('Error al obtener datos:', error);
    res.send('Error al obtener datos');
  }
});

router.post('/solicitar_saldo', async (req, res) => {
  const { usuario_id, saldo_solicitado } = req.body;
  try {
    if (!usuario_id || saldo_solicitado <= 0) {
      throw new Error('Datos de solicitud inválidos');
    }

    const [result] = await pool.query('INSERT INTO pedidos_saldo (usuario_id, saldo_solicitado) VALUES (?, ?)', [usuario_id, saldo_solicitado]);
    res.redirect('/cliente/menu_principal');
  } catch (error) {
    console.error(error);
    res.send('Error al solicitar saldo');
  }
});

router.get('/cuenta', async (req, res) => {
  try {
    if (!req.session.userId) {
      throw new Error('Usuario no autenticado');
    }

    const [usuario] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);
    const [compras] = await pool.query(`
      SELECT c.* FROM historial_compras hc
      JOIN contenidos c ON hc.contenido_id = c.id
      WHERE hc.usuario_id = ?
    `, [req.session.userId]);

    if (usuario.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    res.render('cliente/cuenta', {
      loggedIn: req.session.loggedIn,
      usuario: usuario[0],
      compras: compras
    });
  } catch (error) {
    console.error('Error al obtener datos:', error);
    res.send('Error al obtener datos');
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

export default router;
