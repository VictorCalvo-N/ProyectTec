import { Router } from "express";
import { pool } from "../database/connectionMySQL.js";
import multer from 'multer';
import path from 'path';

const router = Router();

// Función para obtener los pedidos de saldo pendientes
const obtenerPedidosPendientes = async () => {
  const [pedidos] = await pool.query(`
    SELECT ps.id, u.nombre_completo, u.login, u.saldo, ps.saldo_solicitado
    FROM pedidos_saldo ps
    JOIN usuarios u ON ps.usuario_id = u.id
    WHERE ps.estado = 'pendiente'
  `);
  return pedidos;
};

// Ruta para mostrar la página de confirmar pedidos
router.get("/confirmar_pedidos", async (req, res) => {
  try {
    if (req.session.loggedIn && req.session.tipo_usuario === 'admin') {
      const pedidos = await obtenerPedidosPendientes();

      // Obtener los 20 productos más comprados en los últimos 6 meses
      const [productosMasComprados] = await pool.query(`
        SELECT h.contenido_id, c.nombre AS contenido_nombre, c.tipo_archivo, u.nombre_completo, u.login, COUNT(h.contenido_id) AS total_compras
        FROM historial_compras h
        JOIN contenidos c ON h.contenido_id = c.id
        JOIN usuarios u ON h.usuario_id = u.id
        WHERE h.fecha_compra >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY h.contenido_id, h.usuario_id
        ORDER BY total_compras DESC
        LIMIT 20
      `);

      res.render("admin/confirmar_pedidos", { 
        loggedIn: req.session.loggedIn, 
        pedidos, 
        pedidoSeleccionado: null,
        productosMasComprados: productosMasComprados
      });
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.error('Error al obtener los pedidos de saldo:', error);
    res.send('Error al obtener los pedidos de saldo');
  }
});

// Ruta para mostrar un pedido específico
router.get("/confirmar_pedidos/:id", async (req, res) => {
  const pedidoId = req.params.id;
  try {
    if (req.session.loggedIn && req.session.tipo_usuario === 'admin') {
      const pedidos = await obtenerPedidosPendientes();
      const [pedido] = await pool.query(`
        SELECT ps.id, u.nombre_completo, u.login, u.saldo, ps.saldo_solicitado 
        FROM pedidos_saldo ps
        JOIN usuarios u ON ps.usuario_id = u.id
        WHERE ps.id = ?
      `, [pedidoId]);

      // Obtener los 20 productos más comprados en los últimos 6 meses
      const [productosMasComprados] = await pool.query(`
        SELECT h.contenido_id, c.nombre AS contenido_nombre, c.tipo_archivo, u.nombre_completo, u.login, COUNT(h.contenido_id) AS total_compras
        FROM historial_compras h
        JOIN contenidos c ON h.contenido_id = c.id
        JOIN usuarios u ON h.usuario_id = u.id
        WHERE h.fecha_compra >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY h.contenido_id, h.usuario_id
        ORDER BY total_compras DESC
        LIMIT 20
      `);

      res.render("admin/confirmar_pedidos", { 
        loggedIn: req.session.loggedIn, 
        pedidos, 
        pedidoSeleccionado: pedido[0] || null,
        productosMasComprados: productosMasComprados
      });
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.error('Error al obtener el pedido de saldo:', error);
    res.send('Error al obtener el pedido de saldo');
  }
});

// Ruta para aceptar un pedido
router.post('/confirmar_pedidos/aceptar', async (req, res) => {
  const { pedido_id } = req.body;
  try {
    // Obtener el pedido
    const [pedido] = await pool.query('SELECT usuario_id, saldo_solicitado FROM pedidos_saldo WHERE id = ?', [pedido_id]);

    if (pedido.length === 0) {
      throw new Error('Pedido no encontrado');
    }

    const { usuario_id, saldo_solicitado } = pedido[0];

    // Actualizar el saldo del usuario
    await pool.query('UPDATE usuarios SET saldo = saldo + ? WHERE id = ?', [saldo_solicitado, usuario_id]);

    // Actualizar el estado del pedido
    await pool.query('UPDATE pedidos_saldo SET estado = ? WHERE id = ?', ['aceptado', pedido_id]);

    res.redirect('/admin/confirmar_pedidos');
  } catch (error) {
    console.error('Error al aceptar el pedido:', error);
    res.send('Error al aceptar el pedido');
  }
});

// Ruta para rechazar un pedido
router.post('/confirmar_pedidos/rechazar', async (req, res) => {
  const { pedido_id } = req.body;
  try {
    await pool.query('UPDATE pedidos_saldo SET estado = ? WHERE id = ?', ['rechazado', pedido_id]);
    res.redirect('/admin/confirmar_pedidos');
  } catch (error) {
    console.error('Error al rechazar el pedido:', error);
    res.send('Error al rechazar el pedido');
  }
});

// Ruta para eliminar un contenido
router.post("/eliminar_contenido", async (req, res) => {
  const { id } = req.body;
  try {
    if (req.session.loggedIn && req.session.tipo_usuario === 'admin') {
      // Eliminar las calificaciones relacionadas
      await pool.query('DELETE FROM calificaciones WHERE contenido_id = ?', [id]);
      // Eliminar las compras relacionadas
      await pool.query('DELETE FROM historial_compras WHERE contenido_id = ?', [id]);
      // Eliminar el contenido de la base de datos
      await pool.query('DELETE FROM contenidos WHERE id = ?', [id]);
      // Redirigir de nuevo a la vista de contenidos
      res.redirect("/admin/ver_contenido");
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.error('Error al eliminar el contenido:', error);
    res.send('Error al eliminar el contenido');
  }
});

router.get("/clientes", (req, res) => {
  if (req.session.loggedIn && req.session.tipo_usuario === 'admin') {
    res.render("admin/clientes", { loggedIn: req.session.loggedIn });
  } else {
    res.redirect("/login");
  }
});



// Configuración de multer para guardar archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "src/public/uploads");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const obtenerCategoriaId = (tipoArchivo) => {
  const extensionesImagenes = ['PNG', 'JPG', 'GIF', 'BMP'];
  const extensionesSonidos = ['MP3', 'MID', 'WAV','MPEG'];
  const extensionesVideos = ['WMV', 'AVI', 'MPG', 'MOV', 'MP4'];

  if (extensionesImagenes.includes(tipoArchivo)) {
    return 1;
  } else if (extensionesSonidos.includes(tipoArchivo)) {
    return 2;
  } else if (extensionesVideos.includes(tipoArchivo)) {
    return 3;
  } else {
    return null;
  }
};

router.get("/agregar_contenido", (req, res) => {
  if (req.session.loggedIn && req.session.tipo_usuario === 'admin') {
    res.render("admin/agregar_contenido", { loggedIn: req.session.loggedIn });
  } else {
    res.redirect("/login");
  }
});

router.post("/agregar_contenido", upload.single('archivo'), async (req, res) => {
  try {
    const { nombre, autor, descripcion, precio } = req.body;
    const tipoArchivo = path.extname(req.file.originalname).toUpperCase().replace('.', '');
    const categoriaId = obtenerCategoriaId(tipoArchivo);
    const tamanoArchivo = req.file.size;
    const archivo = req.file.filename;

    if (!categoriaId) {
      throw new Error("Tipo de archivo no soportado");
    }

    await pool.query('INSERT INTO contenidos (nombre, autor, descripcion, precio, categoria_id, tipo_archivo, tamano_archivo, archivo, descargas, calificacion_promedio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)', [nombre, autor, descripcion, precio, categoriaId, tipoArchivo, tamanoArchivo, archivo]);

    res.redirect("/admin/agregar_contenido");
  } catch (error) {
    console.error('Error al agregar contenido:', error);
    res.send('Error al agregar contenido');
  }
});

router.get('/ver_contenido', async (req, res) => {
  try {
    if (!req.session.userId) {
      throw new Error('Usuario no autenticado');
    }

    const [usuario] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);

    if (usuario.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    const [contenidos] = await pool.query('SELECT * FROM contenidos ORDER BY descargas DESC LIMIT 10');

    res.render('admin/ver_contenido', {
      loggedIn: req.session.loggedIn,
      usuario: usuario[0],
      contenidos: contenidos
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

    res.render('admin/ver_contenido', {
      loggedIn: req.session.loggedIn,
      usuario: usuario[0],
      contenidos: contenidos
    });
  } catch (error) {
    console.error('Error al obtener datos:', error);
    res.send('Error al obtener datos');
  }
};

router.get('/ver_contenido', (req, res) => obtenerContenidosPorTipo(req, res, 'imagen'));
router.get('/ver_contenido/imagenes', (req, res) => obtenerContenidosPorTipo(req, res, 'imagen'));
router.get('/ver_contenido/sonidos', (req, res) => obtenerContenidosPorTipo(req, res, 'sonidos'));
router.get('/ver_contenido/video', (req, res) => obtenerContenidosPorTipo(req, res, 'video'));

export default router;
