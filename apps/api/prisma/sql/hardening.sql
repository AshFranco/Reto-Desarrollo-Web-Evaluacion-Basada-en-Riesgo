-- ============================================================================
-- EBR/BPM - Row-Level Security (RLS) Políticas Oficiales para Esquema 51 Tablas
-- ============================================================================

-- Habilitar RLS en tablas principales
ALTER TABLE empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE establecimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitud_bpm ENABLE ROW LEVEL SECURITY;
ALTER TABLE caso ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

-- 1. Políticas para EMPRESA:
DROP POLICY IF EXISTS empresa_select_policy ON empresa;
CREATE POLICY empresa_select_policy ON empresa
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR', 'EVALUADOR', 'TECNICO')
    OR id::text = current_setting('app.current_empresa_id', true)
  );

DROP POLICY IF EXISTS empresa_update_policy ON empresa;
CREATE POLICY empresa_update_policy ON empresa
  FOR UPDATE
  USING (
    current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR', 'ADMINISTRADOR_EMPRESA')
    AND (
      current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR')
      OR id::text = current_setting('app.current_empresa_id', true)
    )
  );

-- 2. Políticas para ESTABLECIMIENTO:
DROP POLICY IF EXISTS establecimiento_select_policy ON establecimiento;
CREATE POLICY establecimiento_select_policy ON establecimiento
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR', 'EVALUADOR', 'TECNICO')
    OR id_empresa::text = current_setting('app.current_empresa_id', true)
  );

-- 3. Políticas para SOLICITUD_BPM:
DROP POLICY IF EXISTS solicitud_bpm_select_policy ON solicitud_bpm;
CREATE POLICY solicitud_bpm_select_policy ON solicitud_bpm
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR', 'EVALUADOR', 'TECNICO')
    OR id_empresa::text = current_setting('app.current_empresa_id', true)
  );

-- 4. Políticas para CASO:
DROP POLICY IF EXISTS caso_select_policy ON caso;
CREATE POLICY caso_select_policy ON caso
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR', 'EVALUADOR', 'TECNICO')
    OR id_establecimiento IN (
      SELECT id FROM establecimiento WHERE id_empresa::text = current_setting('app.current_empresa_id', true)
    )
  );

-- 5. Políticas para EVALUACION:
DROP POLICY IF EXISTS evaluacion_select_policy ON evaluacion;
CREATE POLICY evaluacion_select_policy ON evaluacion
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR')
    OR (
      current_setting('app.current_user_role', true) IN ('EVALUADOR', 'TECNICO')
      AND id_evaluador::text = current_setting('app.current_user_id', true)
    )
    OR id_establecimiento IN (
      SELECT id FROM establecimiento WHERE id_empresa::text = current_setting('app.current_empresa_id', true)
    )
  );

-- 6. Políticas para AUDITORIA:
DROP POLICY IF EXISTS auditoria_select_policy ON auditoria;
CREATE POLICY auditoria_select_policy ON auditoria
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR')
  );
