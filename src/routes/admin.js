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

export default router;
