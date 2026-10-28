# CRUD de cargas académicas — Node.js + Express + Supabase

Aplicación educativa para practicar Create, Read, Update y Delete sobre la tabla `workload`. La base de datos es PostgreSQL alojada en Supabase.

## Requisitos

- Node.js 18 o superior
- Proyecto de Supabase con las tablas `workload`, `course` y `teacher`
- Registros en `course` y `teacher` para poblar las listas desplegables

## 1. Obtener la conexión de Supabase

En Supabase Dashboard, abre tu proyecto y selecciona **Connect**. Copia los datos de conexión PostgreSQL. Usa los valores que muestra el panel; no copies los ejemplos literalmente.

Si usas Session pooler, el usuario normalmente tiene el formato `postgres.PROJECT_REF`. Usa el host y puerto que aparecen en la cadena de conexión elegida.

## 2. Configurar credenciales

```bash
cp .env.example .env
vim .env
```

Edita el archivo `.env` con los datos reales de Supabase:

```dotenv
PORT=3000
PGHOST=TU_HOST_DE_SUPABASE
PGPORT=5432
PGDATABASE=postgres
PGUSER=TU_USUARIO_DE_CONEXION
PGPASSWORD=TU_CONTRASENA
PGSSL=true
```

No subas el archivo `.env` a Git. Está excluido mediante `.gitignore`.

## 3. Instalar y ejecutar

```bash
npm install
npm start
```

Abre http://localhost:3000

Verifica la conexión en http://localhost:3000/health. Si funciona, la respuesta incluye `status: "ok"` y `database: "connected"`.

## 4. Tablas esperadas

La aplicación presupone las tablas del esquema académico:

- `course`: `id` UUID, `name`, `code`
- `teacher`: `id` numérico, `names`, `father_surname`, `mother_surname`
- `workload`: `id`, `course`, `teacher`, `capacity`, `"group"`, `laboratory`, `modified`, `status`

Las columnas `workload.course` y `workload.teacher` deben tener claves foráneas hacia `course.id` y `teacher.id`.

## 5. Rutas CRUD

| Método | Ruta | Operación |
|---|---|---|
| GET | `/` | Listar cargas (Read) |
| GET | `/workloads/new` | Mostrar formulario (Create) |
| POST | `/workloads` | Guardar carga (Create) |
| GET | `/workloads/:id/edit` | Mostrar edición (Update) |
| POST | `/workloads/:id/edit` | Guardar cambios (Update) |
| POST | `/workloads/:id/delete` | Eliminar carga (Delete) |

## 6. Seguridad y despliegue

- Nunca incluyas contraseñas ni claves de Supabase en el código.
- `PGSSL=true` habilita SSL para la conexión. Para producción, configura la verificación del certificado del servidor cuando sea posible.
- Este ejemplo es educativo y no incorpora autenticación de usuarios, protección CSRF ni autorización por roles. No lo publiques directamente en Internet sin agregar esas protecciones.
- El borrado puede ser rechazado por PostgreSQL si una matrícula de `inscription` referencia la carga.
