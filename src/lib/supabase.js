import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

/*
  ══════════════════════════════════════════════════════════════
  INSTRUCCIONES: Ejecuta este SQL completo en Supabase → SQL Editor
  ══════════════════════════════════════════════════════════════

  ── TABLAS BASE (si no existen aún) ──────────────────────────

  CREATE TABLE IF NOT EXISTS personas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text NOT NULL,
    color text DEFAULT '#6366f1',
    created_at timestamptz DEFAULT now()
  );

  INSERT INTO personas (nombre, color)
  SELECT nombre, color FROM (VALUES
    ('Persona 1', '#7C6FE0'),
    ('Persona 2', '#1D9E75'),
    ('Persona 3', '#D85A30'),
    ('Persona 4', '#D4537E')
  ) AS v(nombre, color)
  WHERE NOT EXISTS (SELECT 1 FROM personas LIMIT 1);

  CREATE TABLE IF NOT EXISTS gastos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    descripcion text NOT NULL,
    monto numeric(12,2) NOT NULL,
    categoria text NOT NULL,
    pagado_por uuid REFERENCES personas(id),
    fecha date NOT NULL DEFAULT CURRENT_DATE,
    mes text GENERATED ALWAYS AS (to_char(fecha, 'YYYY-MM')) STORED,
    split_entre uuid[] NOT NULL,
    notas text,
    creado_por uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
  );

  -- Añadir creado_por a gastos si ya existe la tabla
  ALTER TABLE gastos ADD COLUMN IF NOT EXISTS creado_por uuid REFERENCES auth.users(id);

  CREATE INDEX IF NOT EXISTS idx_gastos_mes       ON gastos(mes);
  CREATE INDEX IF NOT EXISTS idx_gastos_fecha     ON gastos(fecha);
  CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON gastos(categoria);

  ── NUEVAS TABLAS AUTH ────────────────────────────────────────

  -- Perfiles de usuario (se crea automáticamente al registrarse)
  CREATE TABLE IF NOT EXISTS perfiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    nombre text NOT NULL,
    email text NOT NULL,
    created_at timestamptz DEFAULT now()
  );

  -- Trigger: crear perfil automáticamente al registrarse
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger AS $$
  BEGIN
    INSERT INTO public.perfiles (id, nombre, email)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
      new.email
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

  -- Presupuesto del hogar (compartido, un monto por mes)
  CREATE TABLE IF NOT EXISTS presupuestos_hogar (
    mes text PRIMARY KEY,
    monto numeric(12,2) NOT NULL,
    updated_at timestamptz DEFAULT now()
  );

  -- Presupuestos personales (privados por usuario, múltiples por mes)
  CREATE TABLE IF NOT EXISTS presupuestos_personales (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    mes text NOT NULL,
    descripcion text NOT NULL,
    monto numeric(12,2) NOT NULL,
    created_at timestamptz DEFAULT now()
  );

  ── ROW LEVEL SECURITY ────────────────────────────────────────

  -- Gastos: solo usuarios autenticados
  ALTER TABLE gastos  ENABLE ROW LEVEL SECURITY;
  ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "acceso_publico_gastos"   ON gastos;
  DROP POLICY IF EXISTS "acceso_publico_personas" ON personas;
  CREATE POLICY "gastos_autenticados"   ON gastos   FOR ALL USING (auth.role() = 'authenticated');
  CREATE POLICY "personas_autenticadas" ON personas FOR ALL USING (auth.role() = 'authenticated');

  -- Perfiles: lectura pública entre autenticados, escritura solo propia
  ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "perfil_lectura"  ON perfiles;
  DROP POLICY IF EXISTS "perfil_insert"   ON perfiles;
  DROP POLICY IF EXISTS "perfil_update"   ON perfiles;
  CREATE POLICY "perfil_lectura" ON perfiles FOR SELECT USING (auth.role() = 'authenticated');
  CREATE POLICY "perfil_insert"  ON perfiles FOR INSERT WITH CHECK (auth.uid() = id);
  CREATE POLICY "perfil_update"  ON perfiles FOR UPDATE USING (auth.uid() = id);

  -- Presupuesto del hogar: todos los autenticados
  ALTER TABLE presupuestos_hogar ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "ph_autenticados" ON presupuestos_hogar;
  CREATE POLICY "ph_autenticados" ON presupuestos_hogar FOR ALL USING (auth.role() = 'authenticated');

  -- Presupuestos personales: solo el propietario
  ALTER TABLE presupuestos_personales ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "pp_privado" ON presupuestos_personales;
  CREATE POLICY "pp_privado" ON presupuestos_personales FOR ALL USING (auth.uid() = usuario_id);

  ── FOTO DE PERFIL ────────────────────────────────────────────

  -- Columna avatar_url en perfiles
  ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS avatar_url text;

  -- Bucket público "avatares" (crear en Supabase → Storage → New bucket)
  -- Name: avatares  |  Public: true
  -- O ejecutar:
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatares', 'avatares', true)
  ON CONFLICT (id) DO NOTHING;

  -- RLS para storage: cualquier autenticado puede subir/actualizar
  DROP POLICY IF EXISTS "avatares_select" ON storage.objects;
  DROP POLICY IF EXISTS "avatares_insert" ON storage.objects;
  DROP POLICY IF EXISTS "avatares_update" ON storage.objects;
  DROP POLICY IF EXISTS "avatares_delete" ON storage.objects;

  CREATE POLICY "avatares_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatares');

  CREATE POLICY "avatares_insert" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatares' AND auth.role() = 'authenticated');

  CREATE POLICY "avatares_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'avatares' AND auth.role() = 'authenticated');

  CREATE POLICY "avatares_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'avatares' AND auth.role() = 'authenticated');

  ── FACTURAS ─────────────────────────────────────────────────

  -- Columna factura_url en gastos
  ALTER TABLE gastos ADD COLUMN IF NOT EXISTS factura_url text;

  -- Bucket público "facturas"
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('facturas', 'facturas', true)
  ON CONFLICT (id) DO NOTHING;

  -- RLS para storage bucket facturas
  DROP POLICY IF EXISTS "facturas_select" ON storage.objects;
  DROP POLICY IF EXISTS "facturas_insert" ON storage.objects;
  DROP POLICY IF EXISTS "facturas_update" ON storage.objects;
  DROP POLICY IF EXISTS "facturas_delete" ON storage.objects;

  CREATE POLICY "facturas_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'facturas');

  CREATE POLICY "facturas_insert" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'facturas' AND auth.role() = 'authenticated');

  CREATE POLICY "facturas_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'facturas' AND auth.role() = 'authenticated');

  CREATE POLICY "facturas_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'facturas' AND auth.role() = 'authenticated');

  ── GASTOS PERSONALES ─────────────────────────────────────────

  -- Tabla privada de gastos personales (solo el propietario los ve)
  CREATE TABLE IF NOT EXISTS gastos_personales (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    fecha date NOT NULL DEFAULT CURRENT_DATE,
    mes text GENERATED ALWAYS AS (to_char(fecha, 'YYYY-MM')) STORED,
    descripcion text NOT NULL,
    monto numeric(12,2) NOT NULL,
    categoria text NOT NULL DEFAULT 'otros',
    notas text,
    factura_url text,
    created_at timestamptz DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_gp_usuario_mes ON gastos_personales(usuario_id, mes);

  ALTER TABLE gastos_personales ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "gp_privado" ON gastos_personales;
  CREATE POLICY "gp_privado" ON gastos_personales FOR ALL USING (auth.uid() = usuario_id);
*/
