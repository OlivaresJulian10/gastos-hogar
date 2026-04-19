# 🏠 Gastos del Hogar

App web para llevar el control de gastos compartidos entre 4 personas.

## Características
- Registro de gastos por categoría (mercado, servicios, internet, arriendo…)
- Balance automático: ¿quién le debe qué a quién?
- Gráficas de torta, barras y líneas
- Comparativo mensual (3, 6 o 12 meses)
- Historial filtrable por mes, categoría y persona
- Base de datos en la nube — todos ven los datos en tiempo real

---

## 🚀 Instrucciones de instalación

### Paso 1 — Clonar y abrir en VS Code

```bash
# Abre la carpeta en VS Code y en la terminal ejecuta:
npm install
```

---

### Paso 2 — Crear la base de datos en Supabase (gratis)

1. Ve a **https://supabase.com** y crea una cuenta
2. Crea un nuevo proyecto
3. En el menú lateral ve a **SQL Editor**
4. Pega y ejecuta este SQL:

```sql
-- Tabla de personas
CREATE TABLE personas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  color text DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

-- Insertar las 4 personas del hogar (edita los nombres)
INSERT INTO personas (nombre, color) VALUES
  ('Persona 1', '#7C6FE0'),
  ('Persona 2', '#1D9E75'),
  ('Persona 3', '#D85A30'),
  ('Persona 4', '#D4537E');

-- Tabla de gastos
CREATE TABLE gastos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  descripcion text NOT NULL,
  monto numeric(12,2) NOT NULL,
  categoria text NOT NULL,
  pagado_por uuid REFERENCES personas(id),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  mes text GENERATED ALWAYS AS (to_char(fecha, 'YYYY-MM')) STORED,
  split_entre uuid[] NOT NULL,
  notas text,
  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_gastos_mes ON gastos(mes);
CREATE INDEX idx_gastos_fecha ON gastos(fecha);

-- Permisos de acceso (acceso compartido sin login)
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso_publico_gastos" ON gastos FOR ALL USING (true);
CREATE POLICY "acceso_publico_personas" ON personas FOR ALL USING (true);
```

---

### Paso 3 — Conectar Supabase al proyecto

1. En Supabase ve a **Settings → API**
2. Copia **Project URL** y **anon public key**
3. En la raíz del proyecto copia el archivo `.env.example` como `.env`:

```bash
cp .env.example .env
```

4. Abre `.env` y llena tus datos:

```
VITE_SUPABASE_URL=https://tuproyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

---

### Paso 4 — Correr en local

```bash
npm run dev
```

Abre http://localhost:5173 en tu navegador.

---

### Paso 5 — Publicar en Vercel (para compartir con la familia)

1. Sube el proyecto a GitHub
2. Ve a **https://vercel.com** y conecta tu repositorio
3. En Vercel, ve a **Settings → Environment Variables** y agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Despliega — obtendrás un link tipo `https://gastos-hogar-xxx.vercel.app`
5. Comparte ese link con tu familia 🎉

---

## 📱 Uso diario

- Entra a la app desde cualquier dispositivo con el link de Vercel
- Todos ven los mismos datos en tiempo real
- Ve a **Personas** para editar los nombres del hogar
- Registra gastos en **Registrar gasto**
- Revisa quién debe qué en **Balance**
- Compara meses en **Comparativos**
