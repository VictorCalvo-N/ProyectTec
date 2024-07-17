import { Router } from "express";
import { pool } from "../database/connectionMySQL.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const [result] = await pool.query("SELECT id, nombre, autor, descripcion, precio FROM contenidos");
    res.render("contents", { contents: result });
  } catch (error) {
    console.log(error);
    res.status(500).send("Error retrieving contents");
  }
});

router.post("/add", async (req, res) => {
  const { nombre, autor, descripcion, precio, categoria_id, tipo_archivo, tamano_archivo, archivo } = req.body;
  try {
    await pool.query("INSERT INTO contenidos (nombre, autor, descripcion, precio, categoria_id, tipo_archivo, tamano_archivo, archivo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [nombre, autor, descripcion, precio, categoria_id, tipo_archivo, tamano_archivo, archivo]);
    res.redirect("/contents");
  } catch (error) {
    console.log(error);
    res.status(500).send("Error adding content");
  }
});

router.post("/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM contenidos WHERE id = ?", [id]);
    res.redirect("/contents");
  } catch (error) {
    console.log(error);
    res.status(500).send("Error deleting content");
  }
});

export default router;
