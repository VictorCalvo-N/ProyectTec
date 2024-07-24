import { Router } from "express";
import { pool } from "../database/connectionMySQL.js";

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
      res.render("admin/confirmar_pedidos", { loggedIn: req.session.loggedIn, pedidos, pedidoSeleccionado: null });
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

      res.render("admin/confirmar_pedidos", { 
        loggedIn: req.session.loggedIn, 
        pedidos, 
        pedidoSeleccionado: pedido[0] || null 
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

router.get("/eliminar_contenido", (req, res) => {
  if (req.session.loggedIn && req.session.tipo_usuario === 'admin') {
    res.render("admin/eliminar_contenido", { loggedIn: req.session.loggedIn });
  } else {
    res.redirect("/login");
  }
});

router.get("/clientes", (req, res) => {
  if (req.session.loggedIn && req.session.tipo_usuario === 'admin') {
    res.render("admin/clientes", { loggedIn: req.session.loggedIn });
  } else {
    res.redirect("/login");
  }
});

router.get("/ver_contenido", (req, res) => {
  if (req.session.loggedIn && req.session.tipo_usuario === 'admin') {
    res.render("admin/ver_contenido", { loggedIn: req.session.loggedIn });
  } else {
    res.redirect("/login");
  }
});

router.get("/agregar_contenido", (req, res) => {
  if (req.session.loggedIn && req.session.tipo_usuario === 'admin') {
    res.render("admin/agregar_contenido", { loggedIn: req.session.loggedIn });
  } else {
    res.redirect("/login");
  }
});

export default router;
