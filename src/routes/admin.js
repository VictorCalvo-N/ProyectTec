import { Router } from "express";
import { pool } from "../database/connectionMySQL.js";

const router = Router();

router.get("/confirmar_pedidos", (req, res) => {
  if (req.session.loggedIn && req.session.tipo_usuario === 'admin') {
    res.render("admin/confirmar_pedidos", { loggedIn: req.session.loggedIn });
  } else {
    res.redirect("/login");
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

router.get('/confirmar_pedidos', async (req, res) => {
  try {
    const [pedidos] = await pool.query(`
      SELECT ps.id, u.nombre_completo, u.login, u.codigo, u.saldo, ps.saldo_solicitado
      FROM pedidos_saldo ps
      JOIN usuarios u ON ps.usuario_id = u.id
      WHERE ps.estado = 'pendiente'
    `);
    res.render('admin/confirmar_pedidos', { loggedIn: req.session.loggedIn, pedidos: pedidos });
  } catch (error) {
    console.error(error);
    res.send('Error al obtener los pedidos de saldo');
  }
});

router.post('/aceptar_pedido', async (req, res) => {
  const { pedido_id, usuario_id, saldo_solicitado } = req.body;
  try {
    await pool.query('UPDATE usuarios SET saldo = saldo + ? WHERE id = ?', [saldo_solicitado, usuario_id]);
    await pool.query('UPDATE pedidos_saldo SET estado = "aceptado" WHERE id = ?', [pedido_id]);
    res.redirect('/admin/confirmar_pedidos');
  } catch (error) {
    console.error(error);
    res.send('Error al aceptar el pedido de saldo');
  }
});

router.post('/rechazar_pedido', async (req, res) => {
  const { pedido_id } = req.body;
  try {
    await pool.query('UPDATE pedidos_saldo SET estado = "rechazado" WHERE id = ?', [pedido_id]);
    res.redirect('/admin/confirmar_pedidos');
  } catch (error) {
    console.error(error);
    res.send('Error al rechazar el pedido de saldo');
  }
});



export default router;
