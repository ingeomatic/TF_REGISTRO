# Sistema de Administración de Tierras Fiscales — INRA Bolivia

Sistema integral web desarrollado con HTML5, CSS3, JavaScript ES6+ y base de datos Supabase (PostgreSQL con Row Level Security).

---

## 📁 Estructura del Proyecto

```
8. TIERRAS FISCALES/
├── index.html                   -> Inicio de sesión y configuración de Supabase
├── dashboard.html               -> Panel de control con métricas, alertas y gráficos
├── tierras-fiscales.html        -> Registro general con filtros en tiempo real y exportación
├── tf-detalle.html              -> Ficha técnica completa de 7 secciones + pestaña expediente
├── remisiones.html              -> Módulo de trazabilidad y remisión de expedientes
├── administracion.html          -> Gestión de usuarios, asignación de roles y catálogos
├── css/
│   ├── main.css                 -> Variables institucionales INRA, reset y notificaciones
│   ├── layout.css               -> Sidebar, topbar institucional y responsive
│   ├── components.css           -> Botones, inputs, badges de expediente, tablas, tabs
│   └── dashboard.css            -> Tarjetas de métricas, distribución geográfica y alertas
├── js/
│   ├── supabase-client.js       -> Inicializador y persistencia de URL/Key
│   ├── auth.js                  -> Control de sesión, permisos y roles
│   ├── catalogos.js             -> Desplegables parametrizables con caché
│   ├── territorios.js           -> Cascada Departamento -> Provincia -> Municipio
│   ├── tierras-fiscales.js      -> Lógica de cálculo (sup_disp, gestión) y CRUD
│   ├── remisiones.js            -> Registro de salidas y retornos de expedientes
│   ├── dashboard.js             -> Métricas de superficies y alertas operativas
│   ├── admin.js                 -> Administración de usuarios y catálogos
│   └── utils.js                 -> Formatos bolivianos de fecha, hectáreas y export CSV
└── sql/
    ├── 01_schema.sql            -> Tablas, índices, triggers y cálculos automáticos
    ├── 02_rls.sql               -> Políticas de seguridad por roles (admin, editor, lectura)
    ├── 03_catalogos_seed.sql    -> Opciones de catálogos extraídas de los datos reales
    ├── 04_territorios_seed.sql  -> Municipios y provincias de Bolivia
    └── 05_datos_iniciales_seed.sql -> 158 registros migrados del archivo consolidado
```

---

## 🚀 Pasos para Poner en Marcha el Sistema con Supabase

### Paso 1: Ejecutar los Scripts SQL en Supabase
1. Ingresa a tu panel de control en [supabase.com](https://supabase.com).
2. Entra en tu proyecto y ve al menú **SQL Editor** (icono de terminal o código SQL).
3. Abre y ejecuta los archivos en el siguiente orden secuencial:
   - `sql/01_schema.sql` (Crea tablas, triggers automáticos y relaciones)
   - `sql/02_rls.sql` (Aplica seguridad de roles a nivel de base de datos)
   - `sql/03_catalogos_seed.sql` (Carga catálogos parametrizables)
   - `sql/04_territorios_seed.sql` (Carga la división territorial de Bolivia)
   - `sql/05_datos_iniciales_seed.sql` (Carga los 158 registros consolidados)

### Paso 2: Crear tu Usuario Administrador
En Supabase:
1. Ve a **Authentication** -> **Users** -> **Add User** -> **Create User**.
2. Escribe tu correo (ejemplo: `admin@inra.gob.bo`) y una contraseña segura.
3. Luego, en el **SQL Editor**, asígnate el rol de `administrador` ejecutando:
   ```sql
   UPDATE public.perfiles 
   SET rol = 'administrador', nombre_completo = 'Administrador General INRA' 
   WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@inra.gob.bo');
   ```

### Paso 3: Iniciar el Sistema en el Navegador
1. Puedes abrir `index.html` directamente en tu navegador o servirlo con cualquier servidor local ligero (por ejemplo, con la extensión *Live Server* de VS Code, o con `npx serve`, o Python: `python -m http.server 8000`).
2. En la pantalla de inicio de sesión, haz clic en **"⚙ Configurar Credenciales de Supabase"**.
3. Pega el **Project URL** y el **Anon Key** de tu proyecto (los obtienes en Supabase en *Project Settings* -> *API*).
4. Inicia sesión con las credenciales que creaste en el Paso 2.

---

## 🛡️ Niveles de Rol y Permisos

| Rol | Alcance en el Sistema |
|---|---|
| **Administrador** | Control total: Crear, editar, eliminar tierras fiscales, registrar salidas/retornos de expedientes, cambiar roles a otros usuarios y crear nuevos valores de catálogos. |
| **Editor** | Personal técnico: Puede registrar nuevas tierras fiscales, actualizar información técnica y registrar movimientos de salida y retorno de expedientes. |
| **Lectura** | Personal de consulta: Puede visualizar y buscar información, consultar la ubicación de expedientes y exportar listados a CSV/Excel sin modificar datos. |

---

## ⚙️ Reglas de Negocio Implementadas Automáticamente

- **`NOMBRE_TF`**: Se asigna y bloquea de manera fija como `"TIERRA FISCAL"`.
- **`SUP_DISP`**: Se calcula en tiempo real tanto en la pantalla como en los triggers de base de datos mediante:
  $$\text{sup\_disp} = \max(0, \text{superficie\_predio} - \text{sup\_nodisp})$$
- **`GESTION_REPORTE`**: Se extrae de forma automática a partir del año de la `FECHA_REM`.
- **Ubicación del Expediente**: Se determina dinámicamente mediante el último movimiento registrado en la tabla `remision_expedientes`. Si el último movimiento es de tipo `SALIDA`, se muestra el badge de alerta con la Dirección de destino (ej. *DIRECCIÓN JURÍDICA*). Si no registra salida o el último movimiento es `RETORNO`, se muestra en verde como *EN ARCHIVO INRA*.
