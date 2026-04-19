import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

/*
  ══════════════════════════════════════════════════════
  INSTRUCCIONES: Ejecuta este SQL en Supabase → SQL Editor
  ══════════════════════════════════════════════════════

  -- Tabla de personas del hogar
  CREATE TABLE personas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text NOT NULL,
    color text DEFAULT '#6366f1',
    created_at timestamptz DEFAULT now()
  );

  -- Insertar las 4 personas
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

  -- Índices para consultas rápidas
  CREATE INDEX idx_gastos_mes ON gastos(mes);
  CREATE INDEX idx_gastos_fecha ON gastos(fecha);
  CREATE INDEX idx_gastos_categoria ON gastos(categoria);

  -- Habilitar Row Level Security (acceso público de lectura/escritura)
  ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
  ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "acceso_publico_gastos" ON gastos FOR ALL USING (true);
  CREATE POLICY "acceso_publico_personas" ON personas FOR ALL USING (true);
*/
