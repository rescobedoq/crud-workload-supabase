require("dotenv").config();

const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

// PGSSL=true habilita SSL para la conexión a Supabase.
// No guardes las credenciales reales en el código fuente.
const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "postgres",
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: process.env.PGSSL === "true"
    ? { rejectUnauthorized: false }
    : false
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

function formValues(body) {
  return {
    course: body.course || "",
    teacher: body.teacher || "",
    capacity: body.capacity || "",
    group: body.group || "",
    laboratory: body.laboratory || "",
    status: body.status === "on"
  };
}

async function getOptions() {
  const [courses, teachers] = await Promise.all([
    pool.query("SELECT id, name, code FROM course ORDER BY name"),
    pool.query("SELECT id, names, father_surname, mother_surname FROM teacher ORDER BY father_surname, names")
  ]);
  return { courses: courses.rows, teachers: teachers.rows };
}

function validate(values) {
  if (!values.course || !values.teacher) {
    return "Selecciona un curso y un docente.";
  }
  if (!Number.isInteger(Number(values.capacity)) || Number(values.capacity) < 1) {
    return "La capacidad debe ser un número entero mayor que cero.";
  }
  return null;
}

// READ: listar cargas académicas
app.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT w.id, w.capacity, w."group" AS grupo, w.laboratory,
             w.status, c.name AS course_name, c.code AS course_code,
             t.names || ' ' || t.father_surname || ' ' ||
               COALESCE(t.mother_surname, '') AS teacher_name
      FROM workload w
      JOIN course c ON c.id = w.course
      JOIN teacher t ON t.id = w.teacher
      ORDER BY w.id
    `);
    res.render("index", {
      workloads: result.rows,
      message: req.query.message || "",
      error: req.query.error || ""
    });
  } catch (err) {
    console.error("Error al listar cargas académicas:", err.message);
    res.status(500).send(
      "Error al consultar las cargas académicas. Verifica la conexión a Supabase y que las tablas existan."
    );
  }
});

// CREATE: mostrar formulario
app.get("/workloads/new", async (req, res) => {
  try {
    const options = await getOptions();
    res.render("form", {
      title: "Registrar carga académica",
      action: "/workloads",
      workload: { course: "", teacher: "", capacity: 30, group: "A", laboratory: "", status: true },
      ...options,
      error: ""
    });
  } catch (err) {
    console.error("Error al cargar cursos y docentes:", err.message);
    res.status(500).send("No se pudieron cargar cursos y docentes. Revisa la conexión y los datos de Supabase.");
  }
});

// CREATE: guardar nuevo registro
app.post("/workloads", async (req, res) => {
  const workload = formValues(req.body);
  const error = validate(workload);
  if (error) {
    const options = await getOptions();
    return res.status(400).render("form", {
      title: "Registrar carga académica",
      action: "/workloads",
      workload, ...options, error
    });
  }

  try {
    await pool.query(`
      INSERT INTO workload (course, teacher, capacity, "group", laboratory, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      workload.course,
      Number(workload.teacher),
      Number(workload.capacity),
      workload.group || null,
      workload.laboratory || null,
      workload.status
    ]);
    res.redirect("/?message=" + encodeURIComponent("Carga académica registrada correctamente."));
  } catch (err) {
    console.error("Error al registrar carga:", err.message);
    const options = await getOptions();
    res.status(400).render("form", {
      title: "Registrar carga académica",
      action: "/workloads",
      workload, ...options,
      error: "No se pudo registrar. Revisa los datos, las claves foráneas y la conexión."
    });
  }
});

// UPDATE: mostrar formulario con los datos actuales
app.get("/workloads/:id/edit", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, course, teacher, capacity, "group" AS "group",
             laboratory, status
      FROM workload WHERE id = $1
    `, [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).send("Carga académica no encontrada.");
    }

    const options = await getOptions();
    res.render("form", {
      title: "Editar carga académica",
      action: `/workloads/${req.params.id}/edit`,
      workload: result.rows[0],
      ...options,
      error: ""
    });
  } catch (err) {
    console.error("Error al buscar carga:", err.message);
    res.status(500).send("Error al buscar la carga académica.");
  }
});

// UPDATE: guardar cambios
app.post("/workloads/:id/edit", async (req, res) => {
  const workload = formValues(req.body);
  const error = validate(workload);

  if (error) {
    const options = await getOptions();
    return res.status(400).render("form", {
      title: "Editar carga académica",
      action: `/workloads/${req.params.id}/edit`,
      workload, ...options, error
    });
  }

  try {
    const result = await pool.query(`
      UPDATE workload
      SET course = $1, teacher = $2, capacity = $3,
          "group" = $4, laboratory = $5, status = $6,
          modified = CURRENT_TIMESTAMP
      WHERE id = $7
    `, [
      workload.course,
      Number(workload.teacher),
      Number(workload.capacity),
      workload.group || null,
      workload.laboratory || null,
      workload.status,
      req.params.id
    ]);

    if (result.rowCount === 0) {
      return res.status(404).send("Carga académica no encontrada.");
    }
    res.redirect("/?message=" + encodeURIComponent("Carga académica actualizada correctamente."));
  } catch (err) {
    console.error("Error al actualizar carga:", err.message);
    const options = await getOptions();
    res.status(400).render("form", {
      title: "Editar carga académica",
      action: `/workloads/${req.params.id}/edit`,
      workload, ...options,
      error: "No se pudo actualizar. Revisa los datos ingresados y la conexión."
    });
  }
});

// DELETE: eliminar registro
app.post("/workloads/:id/delete", async (req, res) => {
  try {
    await pool.query("DELETE FROM workload WHERE id = $1", [req.params.id]);
    res.redirect("/?message=" + encodeURIComponent("Carga académica eliminada."));
  } catch (err) {
    console.error("Error al eliminar carga:", err.message);
    res.redirect("/?error=" + encodeURIComponent(
      "No se pudo eliminar. Es posible que existan matrículas relacionadas con esta carga."
    ));
  }
});

// Comprobar conectividad con PostgreSQL/Supabase
app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT current_database() AS database, NOW() AS server_time");
    res.json({
      status: "ok",
      database: "connected",
      name: result.rows[0].database,
      serverTime: result.rows[0].server_time
    });
  } catch (err) {
    console.error("Health check falló:", err.message);
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

app.listen(PORT, () => {
  console.log(`Aplicación disponible en http://localhost:${PORT}`);
});
