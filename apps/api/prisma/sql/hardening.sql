-- ============================================================================
-- EBR/BPM - Row-Level Security (RLS) Políticas Oficiales para Esquema 51 Tablas
-- ============================================================================

-- Habilitar RLS en tablas principales
ALTER TABLE ebr.empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebr.establecimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebr.solicitud_bpm ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebr.caso ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebr.evaluacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebr.auditoria ENABLE ROW LEVEL SECURITY;

-- 1. Políticas para EMPRESA:
DROP POLICY IF EXISTS empresa_select_policy ON ebr.empresa;
CREATE POLICY empresa_select_policy ON ebr.empresa
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR', 'EVALUADOR', 'TECNICO')
    OR id::text = current_setting('app.current_empresa_id', true)
  );

DROP POLICY IF EXISTS empresa_update_policy ON ebr.empresa;
CREATE POLICY empresa_update_policy ON ebr.empresa
  FOR UPDATE
  USING (
    current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR', 'ADMINISTRADOR_EMPRESA')
    AND (
      current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR')
      OR id::text = current_setting('app.current_empresa_id', true)
    )
  );

-- 2. Políticas para ESTABLECIMIENTO:
DROP POLICY IF EXISTS establecimiento_select_policy ON ebr.establecimiento;
CREATE POLICY establecimiento_select_policy ON ebr.establecimiento
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR', 'EVALUADOR', 'TECNICO')
    OR id_empresa::text = current_setting('app.current_empresa_id', true)
  );

-- 3. Políticas para SOLICITUD_BPM:
DROP POLICY IF EXISTS solicitud_bpm_select_policy ON ebr.solicitud_bpm;
CREATE POLICY solicitud_bpm_select_policy ON ebr.solicitud_bpm
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR', 'EVALUADOR', 'TECNICO')
    OR id_empresa::text = current_setting('app.current_empresa_id', true)
  );

-- 4. Políticas para CASO:
DROP POLICY IF EXISTS caso_select_policy ON ebr.caso;
CREATE POLICY caso_select_policy ON ebr.caso
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR', 'EVALUADOR', 'TECNICO')
    OR id_establecimiento IN (
      SELECT id FROM ebr.establecimiento WHERE id_empresa::text = current_setting('app.current_empresa_id', true)
    )
  );

-- 5. Políticas para EVALUACION:
DROP POLICY IF EXISTS evaluacion_select_policy ON ebr.evaluacion;
CREATE POLICY evaluacion_select_policy ON ebr.evaluacion
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR')
    OR (
      current_setting('app.current_user_role', true) IN ('EVALUADOR', 'TECNICO')
      AND id_evaluador::text = current_setting('app.current_user_id', true)
    )
    OR id_establecimiento IN (
      SELECT id FROM ebr.establecimiento WHERE id_empresa::text = current_setting('app.current_empresa_id', true)
    )
  );

-- 6. Políticas para AUDITORIA:
DROP POLICY IF EXISTS auditoria_select_policy ON ebr.auditoria;
CREATE POLICY auditoria_select_policy ON ebr.auditoria
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) IN ('ADMINISTRADOR', 'COORDINADOR')
  );
