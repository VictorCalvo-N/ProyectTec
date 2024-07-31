import { Router } from "express";
import { pool } from "../database/connectionMySQL.js";

const router = Router();

let carritos = []; // Array temporal para almacenar los items del carrito

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

    const carrito = carritos[req.session.userId] || [];
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
  const userId = req.session.userId;

  if (!carritos[userId]) {
    carritos[userId] = [];
  }

  // Verificar si el producto ya fue comprado por el usuario
  const [existing] = await pool.query('SELECT * FROM historial_compras WHERE usuario_id = ? AND contenido_id = ?', [userId, id]);

  if (existing.length === 0) {
    if (!carritos[userId].some(item => item.id === id)) {
      carritos[userId].push({ id, nombre, precio: parseFloat(precio) });
    }
    res.redirect('/cliente/carrito');
  } else {
    // Redirigir al carrito con un mensaje de que ya posee este archivo
    res.redirect('/cliente/carrito?error=ya_posee');
  }
});

// Ruta para quitar un item del carrito
router.post('/carrito/quitar', (req, res) => {
  const { id } = req.body;
  const userId = req.session.userId;

  if (carritos[userId]) {
    carritos[userId] = carritos[userId].filter(item => item.id !== id);
  }

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

    const carrito = carritos[req.session.userId] || [];
    const total = carrito.reduce((sum, item) => sum + item.precio, 0);

    if (usuario[0].saldo < total) {
      res.redirect('/cliente/carrito');
    } else {
      await pool.query('UPDATE usuarios SET saldo = saldo - ? WHERE id = ?', [total, req.session.userId]);

      for (const item of carrito) {
        // Verificar si ya existe un historial de compra para este usuario y contenido
        const [existing] = await pool.query('SELECT * FROM historial_compras WHERE usuario_id = ? AND contenido_id = ?', [req.session.userId, item.id]);

        if (existing.length === 0) {
          await pool.query('INSERT INTO historial_compras (usuario_id, contenido_id, fecha_compra) VALUES (?, ?, NOW())', [req.session.userId, item.id]);
        }
      }

      carritos[req.session.userId] = [];
      res.redirect('/cliente/carrito');
    }
  } catch (error) {
    console.error('Error al realizar la compra:', error);
    res.send('Error al realizar la compra');
  }
});

//Rutas para el cliente
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
    if (usuario.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    // Obtener el historial de compras del usuario
    const [compras] = await pool.query(`
      SELECT c.*, hc.fecha_compra 
      FROM contenidos c 
      JOIN historial_compras hc ON c.id = hc.contenido_id 
      WHERE hc.usuario_id = ?
    `, [req.session.userId]);

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
      sonidos: ['MP3', 'MID', 'WAV','MPEG'],
      video: ['WMV', 'AVI', 'MPG', 'MOV', 'MP4']
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

// Función para obtener las compras del usuario
const obtenerComprasUsuario = async (usuarioId) => {
  const [compras] = await pool.query(`
    SELECT c.id, c.nombre, c.tipo_archivo, h.fecha_compra
    FROM historial_compras h
    JOIN contenidos c ON h.contenido_id = c.id
    WHERE h.usuario_id = ?
  `, [usuarioId]);
  return compras;
};

// Ruta para mostrar la cuenta del usuario
router.get("/cuenta", async (req, res) => {
  try {
    if (!req.session.userId) {
      throw new Error('Usuario no autenticado');
    }

    const [usuario] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);

    if (usuario.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    const compras = await obtenerComprasUsuario(req.session.userId);

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

// Ruta para enviar la calificación
router.post('/calificar', async (req, res) => {
  const { contenido_id, calificacion } = req.body;
  try {
    if (!req.session.userId) {
      throw new Error('Usuario no autenticado');
    }

    // Verificar si el usuario ya ha calificado este contenido
    const [calificaciones] = await pool.query(`
      SELECT * FROM calificaciones WHERE usuario_id = ? AND contenido_id = ?
    `, [req.session.userId, contenido_id]);

    if (calificaciones.length > 0) {
      return res.send('Ya has calificado este contenido');
    }

    // Insertar la calificación
    await pool.query('INSERT INTO calificaciones (usuario_id, contenido_id, nota) VALUES (?, ?, ?)', 
      [req.session.userId, contenido_id, calificacion]);

    // Calcular la nueva calificación promedio
    const [result] = await pool.query(`
      SELECT AVG(nota) AS promedio FROM calificaciones WHERE contenido_id = ?
    `, [contenido_id]);

    const promedio = result[0].promedio;

    // Actualizar la calificación promedio del contenido
    await pool.query('UPDATE contenidos SET calificacion_promedio = ? WHERE id = ?', [promedio, contenido_id]);

    res.redirect('/cliente/cuenta');
  } catch (error) {
    console.error('Error al calificar el contenido:', error);
    res.send('Error al calificar el contenido');
  }
});

router.get('/menu_principal', (req, res) => obtenerContenidosPorTipo(req, res, 'imagen'));
router.get('/menu_principal/imagenes', (req, res) => obtenerContenidosPorTipo(req, res, 'imagen'));
router.get('/menu_principal/sonidos', (req, res) => obtenerContenidosPorTipo(req, res, 'sonidos'));
router.get('/menu_principal/video', (req, res) => obtenerContenidosPorTipo(req, res, 'video'));

export default router;
