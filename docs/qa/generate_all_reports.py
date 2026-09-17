import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=80, bottom=80, left=120, right=120):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def set_table_borders(table, color="D1D5DB", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:left w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def build_single_report(defect_info, output_dir):
    doc = docx.Document()

    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    style_normal = doc.styles['Normal']
    style_normal.font.name = 'Arial'
    style_normal.font.size = Pt(10)
    style_normal.font.color.rgb = RGBColor(30, 30, 30)

    # 1. ENCABEZADO INSTITUCIONAL
    header_table = doc.add_table(rows=1, cols=2)
    header_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    header_table.autofit = False
    header_table.columns[0].width = Inches(4.5)
    header_table.columns[1].width = Inches(2.0)

    cell_l = header_table.cell(0, 0)
    cell_r = header_table.cell(0, 1)

    p_org = cell_l.paragraphs[0]
    p_org.paragraph_format.space_after = Pt(2)
    r1 = p_org.add_run("DIRECCIÓN GENERAL DE MEDICAMENTOS, ALIMENTOS Y PRODUCTOS SANITARIOS\n")
    r1.font.size = Pt(8.5)
    r1.font.bold = True
    r2 = p_org.add_run("DEPARTAMENTO DE ASEGURAMIENTO DE CALIDAD (QA)")
    r2.font.size = Pt(8)
    r2.font.color.rgb = RGBColor(90, 90, 90)

    p_meta = cell_r.paragraphs[0]
    p_meta.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_meta.paragraph_format.space_after = Pt(2)
    r3 = p_meta.add_run("CÓDIGO: ")
    r3.font.size = Pt(8)
    r3.font.bold = True
    r4 = p_meta.add_run(f"{defect_info['codigo']}\n")
    r4.font.size = Pt(8.5)
    r4.font.bold = True
    r5 = p_meta.add_run("VERSIÓN: 1.0 | ESTADO: CERRADO")
    r5.font.size = Pt(7.5)
    r5.font.color.rgb = RGBColor(90, 90, 90)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 2. TÍTULO
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_after = Pt(4)
    r_t = p_title.add_run("INFORME DE NO CONFORMIDAD / DEFECTO TÉCNICO")
    r_t.font.size = Pt(13)
    r_t.font.bold = True
    r_t.font.color.rgb = RGBColor(20, 20, 20)

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(14)
    r_s = p_sub.add_run(f"Sistema: Evaluación Basada en Riesgo (EBR / BPM) | {defect_info['titulo_corto']}")
    r_s.font.size = Pt(9.5)
    r_s.font.color.rgb = RGBColor(90, 90, 90)

    # 3. FICHA TÉCNICA METADATOS
    meta_table = doc.add_table(rows=5, cols=4)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_table.autofit = False
    set_table_borders(meta_table, color="D1D5DB", sz="4")

    col_widths = [Inches(1.5), Inches(2.0), Inches(1.4), Inches(1.6)]
    for row in meta_table.rows:
        for i, cell in enumerate(row.cells):
            cell.width = col_widths[i]
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_margins(cell, top=70, bottom=70, left=100, right=100)

    meta_rows = [
        ("Identificador:", defect_info['codigo'], "Fecha de Reporte:", defect_info.get('fecha_reporte', '13/09/2026')),
        ("Módulo:", defect_info['modulo'], "Fecha de Cierre:", defect_info.get('fecha_cierre', '13/09/2026')),
        ("Severidad:", defect_info['severidad'], "Prioridad:", defect_info['prioridad']),
        ("Tipo de Defecto:", defect_info['tipo'], "Ambiente:", "Staging / QA Local (Win 11 / Chrome)"),
        ("Reportado Por:", "Equipo de Pruebas de Calidad", "Dictamen Final:", "RESUELTO / VERIFICADO"),
    ]

    for r_idx, (c0_t, c1_t, c2_t, c3_t) in enumerate(meta_rows):
        c0 = meta_table.cell(r_idx, 0)
        c1 = meta_table.cell(r_idx, 1)
        c2 = meta_table.cell(r_idx, 2)
        c3 = meta_table.cell(r_idx, 3)

        set_cell_background(c0, "F9FAFB")
        set_cell_background(c2, "F9FAFB")

        p = c0.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(c0_t)
        r.font.bold = True
        r.font.size = Pt(8.5)

        p = c1.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(c1_t)
        r.font.size = Pt(8.5)

        p = c2.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(c2_t)
        r.font.bold = True
        r.font.size = Pt(8.5)

        p = c3.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(c3_t)
        r.font.size = Pt(8.5)
        if "RESUELTO" in c3_t:
            r.font.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    def add_sec(title):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(title)
        r.font.bold = True
        r.font.size = Pt(11)
        r.font.color.rgb = RGBColor(20, 20, 20)

    # 1. DESCRIPCIÓN
    add_sec("1. DESCRIPCIÓN DEL DEFECTO")
    p_desc = doc.add_paragraph()
    p_desc.paragraph_format.line_spacing = 1.15
    p_desc.paragraph_format.space_after = Pt(6)
    r = p_desc.add_run(defect_info['descripcion'])
    r.font.size = Pt(9.5)

    # 2. PASOS DE REPRODUCCIÓN
    add_sec("2. PASOS PARA LA REPRODUCCIÓN DEL HALLAZGO")
    for idx, st in enumerate(defect_info['pasos'], 1):
        p_st = doc.add_paragraph()
        p_st.paragraph_format.left_indent = Inches(0.25)
        p_st.paragraph_format.space_after = Pt(2)
        r_num = p_st.add_run(f"2.{idx} ")
        r_num.font.bold = True
        r_num.font.size = Pt(9)
        r_txt = p_st.add_run(st)
        r_txt.font.size = Pt(9)

    # 3. OBSERVADO VS ESPERADO
    add_sec("3. COMPORTAMIENTO OBSERVADO Y COMPORTAMIENTO ESPERADO")
    table_comp = doc.add_table(rows=2, cols=2)
    table_comp.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_comp.autofit = False
    set_table_borders(table_comp, color="D1D5DB", sz="4")

    table_comp.columns[0].width = Inches(3.25)
    table_comp.columns[1].width = Inches(3.25)

    c_h1 = table_comp.cell(0, 0)
    c_h2 = table_comp.cell(0, 1)
    set_cell_background(c_h1, "F3F4F6")
    set_cell_background(c_h2, "F3F4F6")
    set_cell_margins(c_h1, 60, 60, 80, 80)
    set_cell_margins(c_h2, 60, 60, 80, 80)

    p = c_h1.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run("Comportamiento Observado (Fallo)")
    r.font.bold = True
    r.font.size = Pt(8.5)

    p = c_h2.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run("Comportamiento Requerido (Correcto)")
    r.font.bold = True
    r.font.size = Pt(8.5)

    c_b1 = table_comp.cell(1, 0)
    c_b2 = table_comp.cell(1, 1)
    set_cell_margins(c_b1, 80, 80, 80, 80)
    set_cell_margins(c_b2, 80, 80, 80, 80)

    p = c_b1.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.15
    r = p.add_run(defect_info['observado'])
    r.font.size = Pt(8.5)

    p = c_b2.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.15
    r = p.add_run(defect_info['esperado'])
    r.font.size = Pt(8.5)

    # 4. RCA
    add_sec("4. ANÁLISIS TÉCNICO DE CAUSA RAÍZ (RCA)")
    p_rca = doc.add_paragraph()
    p_rca.paragraph_format.line_spacing = 1.15
    p_rca.paragraph_format.space_after = Pt(6)
    r = p_rca.add_run(defect_info['rca'])
    r.font.size = Pt(9.5)

    # 5. ACCIÓN CORRECTIVA
    add_sec("5. ACCIÓN CORRECTIVA Y CAMBIOS EN EL CÓDIGO")
    for label, desc in defect_info['solucion']:
        p_act = doc.add_paragraph()
        p_act.paragraph_format.left_indent = Inches(0.25)
        p_act.paragraph_format.space_after = Pt(3)
        r_lbl = p_act.add_run(label + " ")
        r_lbl.font.bold = True
        r_lbl.font.size = Pt(9)
        r_dsc = p_act.add_run(desc)
        r_dsc.font.size = Pt(9)

    # 6. VERIFICACIÓN
    add_sec("6. VERIFICACIÓN Y RESULTADOS DE PRUEBA")
    table_verif = doc.add_table(rows=len(defect_info['verificacion']) + 1, cols=3)
    table_verif.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_verif.autofit = False
    set_table_borders(table_verif, color="D1D5DB", sz="4")

    table_verif.columns[0].width = Inches(3.0)
    table_verif.columns[1].width = Inches(2.2)
    table_verif.columns[2].width = Inches(1.3)

    vh0 = table_verif.cell(0, 0)
    vh1 = table_verif.cell(0, 1)
    vh2 = table_verif.cell(0, 2)
    for vh, t in [(vh0, "Prueba Ejecutada"), (vh1, "Comando de Verificación"), (vh2, "Resultado")]:
        set_cell_background(vh, "F3F4F6")
        set_cell_margins(vh, 60, 60, 80, 80)
        p = vh.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(t)
        r.font.bold = True
        r.font.size = Pt(8.5)

    for r_i, (t1, t2, t3) in enumerate(defect_info['verificacion'], 1):
        c0 = table_verif.cell(r_i, 0)
        c1 = table_verif.cell(r_i, 1)
        c2 = table_verif.cell(r_i, 2)
        set_cell_margins(c0, 60, 60, 80, 80)
        set_cell_margins(c1, 60, 60, 80, 80)
        set_cell_margins(c2, 60, 60, 80, 80)

        p = c0.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(t1)
        r.font.size = Pt(8.5)

        p = c1.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(t2)
        r.font.size = Pt(8)
        r.font.color.rgb = RGBColor(90, 90, 90)

        p = c2.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(t3)
        r.font.bold = True
        r.font.size = Pt(8.5)

    # 7. FIRMAS DE CONFORMIDAD
    add_sec("7. APROBACIÓN Y CONFORMIDAD")
    table_sign = doc.add_table(rows=2, cols=3)
    table_sign.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_sign.autofit = False
    set_table_borders(table_sign, color="D1D5DB", sz="4")

    for row in table_sign.rows:
        for cell in row.cells:
            cell.width = Inches(2.16)
            set_cell_margins(cell, 80, 80, 80, 80)

    for idx, rol in enumerate(["Reportado por", "Corregido por", "Aprobado por (QA Lead)"]):
        cell = table_sign.cell(0, idx)
        set_cell_background(cell, "F9FAFB")
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(rol)
        r.font.bold = True
        r.font.size = Pt(8)

    firmas = [
        ("Equipo de Pruebas\nFirma: __________________\nFecha: 13/09/2026"),
        ("Desarrollo Backend/Frontend\nFirma: __________________\nFecha: 13/09/2026"),
        ("Aseguramiento de Calidad\nFirma: __________________\nFecha: 13/09/2026"),
    ]
    for idx, f in enumerate(firmas):
        cell = table_sign.cell(1, idx)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.2
        r = p.add_run(f)
        r.font.size = Pt(8)
        r.font.color.rgb = RGBColor(60, 60, 60)

    out_file = os.path.join(output_dir, f"{defect_info['codigo']}_{defect_info['archivo']}.docx")
    doc.save(out_file)
    print(f"[OK] Generado: {defect_info['codigo']}_{defect_info['archivo']}.docx")

# Lista exhaustiva de los 14 defectos corregidos
DEFECTOS = [
    {
        "codigo": "DEF-2026-001",
        "archivo": "Reabrir_Evaluacion_BPM",
        "titulo_corto": "Módulo: Ficha Técnica BPM — Control de Usuario",
        "modulo": "Técnico Evaluador / Ficha BPM",
        "severidad": "Media (Usabilidad y Heurística de Control)",
        "prioridad": "P2 (Media)",
        "tipo": "Funcional / Flujo Operativo",
        "descripcion": "Una vez finalizada y bloqueada una evaluación de Buenas Prácticas de Manufactura en campo, el sistema no proporcionaba al técnico ni al coordinador un mecanismo para corregir respuestas ingresadas por error o adjuntar evidencias omitidas, aun cuando el expediente no había sido cerrado formalmente.",
        "pasos": [
            "Acceder con el rol Técnico Evaluador a /tecnico/evaluacion/:id.",
            "Completar todos los criterios y finalizar la evaluación.",
            "Observar que el formulario queda bloqueado (bloqueada: true) sin controles visibles para habilitar la edición.",
            "Constatar que si el evaluador detecta un error de digitación, no existe opción de reapertura."
        ],
        "observado": "- El formulario de evaluación queda permanentemente bloqueado tras presionar 'Finalizar'.\n- No existía endpoint ni botón de reapertura para casos activos.",
        "esperado": "- El sistema debe permitir reabrir la evaluación si el caso no ha sido cerrado formalmente.\n- La reapertura debe transicionar el estado a EN_CURSO y desbloquear los controles de calificación.",
        "rca": "El modelo de datos contemplaba bloqueada: Boolean pero el ciclo de vida no exponía una transición de retorno desde idEstado = 5/4 hacia EN_CURSO (2) para casos aún abiertos.",
        "solucion": [
            ("Backend (evaluaciones.controller.ts):", "Se implementó el endpoint POST /api/v1/evaluaciones/:id/reabrir protegido para roles técnicos y coordinadores."),
            ("Frontend (EjecutarEvaluacion.tsx):", "Se agregó el botón condicional 'Reabrir evaluación para edición' con confirmación previa."),
        ],
        "verificacion": [
            ("Prueba de transición de estado en backend", "npm.cmd test -w apps/api", "Aprobado (56/56)"),
            ("Prueba de renderizado condicional en UI", "npm.cmd test -- --run -w apps/web", "Aprobado (160/160)"),
        ]
    },
    {
        "codigo": "DEF-2026-002",
        "archivo": "Categorias_Alimento_Motor_Riesgo",
        "titulo_corto": "Módulo: Motor de Riesgo — Fallo 400 por Subcategorías",
        "modulo": "Motor de Riesgo (EBR)",
        "severidad": "Alta (Bloqueo de Cálculo Automatizado)",
        "prioridad": "P1 (Urgente)",
        "tipo": "Lógica de Negocio / Integridad de Datos",
        "descripcion": "Al disparar el cálculo automatizado de riesgo tras finalizar la evaluación, si el establecimiento no contaba previamente con registros en la tabla establecimiento_categoria, la API retornaba un error HTTP 400 Bad Request deteniendo abruptamente el cálculo del Riesgo Total (RT).",
        "pasos": [
            "Crear un nuevo establecimiento sin asociarle categorías de alimento.",
            "Asignar un técnico y ejecutar la evaluación BPM completa.",
            "Pulsar 'Finalizar evaluación'.",
            "Observar la respuesta de la API: 400 'El establecimiento no tiene categorías de alimento con nivel de riesgo asignado'."
        ],
        "observado": "- Error HTTP 400 interrumpiendo el flujo de finalización.\n- Imposibilidad de obtener el cálculo de frecuencia de inspección.",
        "esperado": "- El motor de cálculo debe operar de manera resiliente, asignando de forma transparente una subcategoría por defecto o tomando el valor base de riesgo.",
        "rca": "El servicio motor-riesgo.service.ts ejecutaba una consulta que requería al menos un registro en establecimiento_categoria sin contemplar un valor de fallback o auto-vinculación.",
        "solucion": [
            ("Backend (motor-riesgo.service.ts):", "Si el establecimiento no tiene categoría registrada, se consulta automáticamente la primera del catálogo de alimentos y se asocia de forma transparente."),
            ("Semilla (seed-demo.ts):", "Se garantizó que todos los establecimientos cuenten con sus categorías vinculadas."),
        ],
        "verificacion": [
            ("Prueba unitaria motor-riesgo-bordes.spec.ts", "npm.cmd test -w apps/api", "Aprobado (56/56)"),
            ("Prueba de integración de cálculo completo", "npm.cmd test -w apps/api", "Aprobado (56/56)"),
        ]
    },
    {
        "codigo": "DEF-2026-003",
        "archivo": "Visibilidad_Antecedentes_Establecimiento",
        "titulo_corto": "Módulo: Ficha Técnica BPM — Contexto de Inspección",
        "modulo": "Técnico Evaluador / UI Inspección",
        "severidad": "Media (Factores Humanos y Visibilidad de Estado)",
        "prioridad": "P2 (Media)",
        "tipo": "Interfaz de Usuario / Contexto Operativo",
        "descripcion": "Durante la inspección en terreno, el técnico evaluador carecía de una vista de consulta sobre los datos clave del establecimiento (RNC, dirección física, volumen de producción, número de empleados y resultados de inspecciones previas), dificultando la toma de decisiones informadas.",
        "pasos": [
            "Iniciar sesión como Técnico e ingresar a una evaluación programada.",
            "Revisar la cabecera y el contenido de la pantalla.",
            "Constatar que únicamente se presentan los ítems de calificación sin información del historial del establecimiento."
        ],
        "observado": "- Ausencia de datos de contexto del establecimiento en la pantalla de ejecución.",
        "esperado": "- Panel colapsable accesible que resuma RNC, razón social, dirección, permisos e historial de evaluaciones sanitarias anteriores.",
        "rca": "El componente de evaluación solo consultaba los ítems de la versión de ficha sin enlazar el historial histórico del caso.",
        "solucion": [
            ("Frontend (EjecutarEvaluacion.tsx):", "Se construyó el componente CardAntecedentesEstablecimiento con acordeón colapsable y métricas del establecimiento."),
        ],
        "verificacion": [
            ("Pruebas unitarias de interfaz EjecutarEvaluacion", "npm.cmd test -- --run -w apps/web", "Aprobado (160/160)"),
        ]
    },
    {
        "codigo": "DEF-2026-004",
        "archivo": "Asignacion_Reasignacion_Tecnicos_Coordinador",
        "titulo_corto": "Módulo: Panel Coordinador — Asignación y Reasignación",
        "modulo": "Coordinador de Calidad / Casos",
        "severidad": "Alta (Gestión Operativa de Casos)",
        "prioridad": "P1 (Urgente)",
        "tipo": "Funcional / Reglas de Negocio",
        "descripcion": "En el panel del coordinador, los casos ya asignados figuraban erróneamente con la leyenda 'Sin asignar' al abrir su detalle. Asimismo, no existía una funcionalidad para desvincular al técnico o reasignar el caso a otro evaluador ante ausencias o licencias médicas.",
        "pasos": [
            "Iniciar sesión como Coordinador en /coordinador.",
            "Asignar un caso a un técnico disponible.",
            "Abrir el detalle del caso asignado.",
            "Observar que el detalle no reflejaba el técnico asignado y no existía botón para desvincular o cambiar técnico."
        ],
        "observado": "- El detalle del caso no incluía la relación del evaluador activo.\n- Imposibilidad de liberar o cambiar el técnico asignado.",
        "esperado": "- Presentación clara del técnico asignado y botón 'Desvincular técnico' con diálogo de confirmación para retornar el caso a Pendiente.",
        "rca": "El método casos.service.ts no incluía la relación asignaciones: { include: { evaluador: true } } en la consulta Prisma, y faltaba el endpoint DELETE en asignaciones.",
        "solucion": [
            ("Backend (asignaciones.service.ts):", "Implementación de DELETE /api/v1/asignaciones/:casoId para cancelar la asignación y devolver el caso a Pendiente."),
            ("Frontend (DashboardCoordinador.tsx):", "Incorporación de la acción 'Desvincular técnico' con modal de confirmación."),
        ],
        "verificacion": [
            ("Pruebas unitarias de casos y asignaciones", "npm.cmd test -w apps/api", "Aprobado (56/56)"),
            ("Pruebas de interfaz en DashboardCoordinador", "npm.cmd test -- --run -w apps/web", "Aprobado (160/160)"),
        ]
    },
    {
        "codigo": "DEF-2026-005",
        "archivo": "Inspeccion_Expedientes_Cerrados_Historico",
        "titulo_corto": "Módulo: Coordinador e Histórico — Trazabilidad de Cierre",
        "modulo": "Coordinación y Consulta Histórica",
        "severidad": "Media (Auditoría y Consulta Legal)",
        "prioridad": "P2 (Media)",
        "tipo": "Funcional / Trazabilidad",
        "descripcion": "En la tabla de expedientes cerrados del Coordinador y en la pantalla de Consulta Histórica, los expedientes finalizados se listaban como registros planos sin permitir consultar el desglose de calificación, informe emitido, no conformidades ni técnico que realizó la inspección.",
        "pasos": [
            "Acceder a /historico o a la sección 'Expedientes cerrados' del coordinador.",
            "Localizar un expediente cerrado.",
            "Constatar que no existe botón de acción para abrir la ficha detallada de resultados."
        ],
        "observado": "- Registros en tablas sin acción de inspección detallada.",
        "esperado": "- Botón 'Inspeccionar' que despliegue un modal con toda la trazabilidad: porcentaje de BPM, puntajes de riesgo, resolución y observaciones.",
        "rca": "Ausencia de un modal centralizado de inspección compartible entre las vistas de consulta histórica y coordinación.",
        "solucion": [
            ("Frontend (ModalInspeccionCaso.tsx):", "Creación del componente modal reutilizable ModalInspeccionCaso e integración en ambas pantallas."),
        ],
        "verificacion": [
            ("Pruebas de ConsultaHistorica.test.tsx", "npm.cmd test -- --run -w apps/web", "Aprobado (160/160)"),
        ]
    },
    {
        "codigo": "DEF-2026-006",
        "archivo": "Validacion_Signos_Negativos_RNC_Telefono",
        "titulo_corto": "Módulo: Empresa — Validación de RNC y Teléfono",
        "modulo": "Portal Empresa / Perfil",
        "severidad": "Media (Integridad de Datos Registrales)",
        "prioridad": "P2 (Media)",
        "tipo": "Validación de Entrada de Datos",
        "descripcion": "El formulario de registro y actualización de datos de la empresa permitía la introducción de caracteres no válidos, tales como signos negativos ('-'), letras o símbolos especiales en los campos de RNC y Teléfono.",
        "pasos": [
            "Ingresar al portal de empresa (/empresa).",
            "Editar los datos de la empresa e ingresar valores como '-130000001' o '809-ABC-1234'.",
            "Pulsar 'Guardar cambios'.",
            "Observar que los datos eran aceptados sin validar la longitud exacta de dígitos."
        ],
        "observado": "- Admisión de signos negativos y cadenas no numéricas.",
        "esperado": "- Validación estricta que exija exactamente 9 u 11 dígitos numéricos para RNC y 10 dígitos para Teléfono, rechazando signos negativos.",
        "rca": "Falta de expresión regular estricta /^[0-9]{9,11}$/ previa al envío de la mutación.",
        "solucion": [
            ("Frontend (DashboardEmpresa.tsx):", "Implementación de la función validarEmpresa() con rechazo inmediato de caracteres no numéricos."),
        ],
        "verificacion": [
            ("Pruebas unitarias de formularios web", "npm.cmd test -- --run -w apps/web", "Aprobado (160/160)"),
        ]
    },
    {
        "codigo": "DEF-2026-007",
        "archivo": "Desbordamiento_Enteros_Establecimiento_P2020",
        "titulo_corto": "Módulo: Establecimientos — Desbordamiento P2020 (Error 500)",
        "modulo": "Establecimientos / Backend API",
        "severidad": "Crítica (Error 500 / Excepción no Controlada)",
        "prioridad": "P1 (Urgente)",
        "tipo": "Robustez / Manejo de Excepciones",
        "descripcion": "Al ingresar números extremadamente grandes (por ejemplo, 20 dígitos) en los campos numéricos de empleados masculinos, empleados femeninos o producción anual, PostgreSQL arrojaba un error de desbordamiento de entero de 32 bits (código Prisma P2020), resultando en una respuesta HTTP 500 Internal Server Error no controlada.",
        "pasos": [
            "Ingresar a /empresa/establecimientos/nuevo.",
            "Completar el formulario e ingresar '99999999999999999999' en empleados.",
            "Pulsar 'Guardar establecimiento'.",
            "Observar en consola de red la respuesta HTTP 500 con traza interna de Prisma P2020."
        ],
        "observado": "- Excepción HTTP 500 no controlada que expone errores de base de datos.",
        "esperado": "- Respuesta HTTP 400 Bad Request controlada con mensaje descriptivo y acotamiento de valores máximos en interfaz (max: 2147483647).",
        "rca": "El filtro de excepciones global all-exceptions.filter.ts no capturaba el código P2020 de Prisma ni los DTOs tenían decoradores @Max().",
        "solucion": [
            ("Backend (establecimiento.dto.ts):", "Se añadieron validadores @Max(2147483647) en los campos enteros."),
            ("Backend (all-exceptions.filter.ts):", "Se añadió captura explícita de P2020 transformándolo en 400 Bad Request."),
            ("Frontend (FormularioEstablecimiento.tsx):", "Se configuraron inputProps con min=0 y max=2147483647."),
        ],
        "verificacion": [
            ("Pruebas unitarias de validación y guards", "npm.cmd test -w apps/api", "Aprobado (56/56)"),
            ("Compilación de tipos NestJS", "npm.cmd run build -w apps/api", "Aprobado (0 errores)"),
        ]
    },
    {
        "codigo": "DEF-2026-008",
        "archivo": "Navegacion_Volver_Mi_Empresa",
        "titulo_corto": "Módulo: Empresa — Navegación y Retorno",
        "modulo": "Portal Empresa / Formularios",
        "severidad": "Baja (Heurística de Navegación)",
        "prioridad": "P3 (Baja)",
        "tipo": "Usabilidad / Factores Humanos",
        "descripcion": "En los formularios secundarios de la empresa (creación de nuevo establecimiento y registro de solicitud BPM), no existía un botón visible de retorno hacia la pantalla principal de Mi Empresa (/empresa), forzando al usuario a utilizar el botón de retroceso del navegador con riesgo de pérdida de contexto.",
        "pasos": [
            "Acceder a /empresa/establecimientos/nuevo o a /empresa/solicitud/nueva.",
            "Observar la cabecera y el pie del formulario.",
            "Constatar la ausencia de controles para cancelar o regresar al panel de empresa."
        ],
        "observado": "- Ausencia de botones explícitos 'Volver a Mi Empresa'.",
        "esperado": "- Botón superior con ícono de retroceso y botón secundario en el pie del formulario.",
        "rca": "Falta de inclusión de botones de navegación estándar en las barras de acciones secundarias.",
        "solucion": [
            ("Frontend (FormularioEstablecimiento.tsx):", "Inclusión de botones de navegación superior e inferior dirigidos a /empresa."),
            ("Frontend (FormularioSolicitud.tsx):", "Inclusión de botones de navegación con redirección segura."),
        ],
        "verificacion": [
            ("Pruebas de rutas y componentes web", "npm.cmd test -- --run -w apps/web", "Aprobado (160/160)"),
        ]
    },
    {
        "codigo": "DEF-2026-009",
        "archivo": "Salida_Comoda_Evaluacion_Tecnico",
        "titulo_corto": "Módulo: Técnico Evaluador — Salida de Evaluación",
        "modulo": "Técnico Evaluador / Ejecución",
        "severidad": "Media (Heurística de Control y Libertad)",
        "prioridad": "P2 (Media)",
        "tipo": "Usabilidad / Ergonomía de Software",
        "descripcion": "En la pantalla de ejecución de evaluación técnica (/tecnico/evaluacion/:id), no existía una forma visible y cómoda para salir del modo de evaluación y regresar al panel del técnico (/tecnico) sin forzar el envío o la finalización formal de la misma.",
        "pasos": [
            "Acceder con el rol Técnico a una evaluación en curso.",
            "Calificar parcialmente algunos ítems.",
            "Observar que el único botón de acción principal era 'Finalizar evaluación', sin opción visible para salir conservando el borrador."
        ],
        "observado": "- Sensación de 'bloqueo' en la interfaz sin botón para salir al panel general.",
        "esperado": "- Botón prominente 'Volver al panel del técnico' en cabecera y botón 'Guardar y salir al panel' en el pie.",
        "rca": "Diseño inicial enfocado solo en el flujo de finalización de inspección.",
        "solucion": [
            ("Frontend (EjecutarEvaluacion.tsx):", "Se agregaron ambos botones con navegación explícita a /tecnico mediante useNavigate."),
        ],
        "verificacion": [
            ("Pruebas unitarias de EjecutarEvaluacion.test.tsx", "npm.cmd test -- --run -w apps/web", "Aprobado (160/160)"),
        ]
    },
    {
        "codigo": "DEF-2026-010",
        "archivo": "Blindaje_Rol_Administrador_Sistema",
        "titulo_corto": "Módulo: Administración — Blindaje del Administrador",
        "modulo": "Administración / Gestión de Usuarios",
        "severidad": "Alta (Seguridad Operativa e Inmutabilidad)",
        "prioridad": "P1 (Urgente)",
        "tipo": "Seguridad / Regla de Autorización",
        "descripcion": "El sistema permitía que el propio Administrador del Sistema pudiera reasignarse otro rol (ej. Administrador de Empresa) o auto-desactivar su cuenta en la tabla de usuarios, provocando la pérdida irrevocable de privilegios administrativos.",
        "pasos": [
            "Iniciar sesión como admin@digemaps.gob.do en /admin.",
            "Ir a la pestaña 'Gestión de Usuarios y Roles'.",
            "En la fila del Administrador, pulsar 'Cambiar rol' y seleccionar 'Administrador de Empresa'.",
            "Comprobar que la solicitud finaliza exitosamente y el administrador queda degradado."
        ],
        "observado": "- Acciones operativas activas en la fila del administrador.\n- La API aceptaba la revocación del rol del administrador sin validación defensiva.",
        "esperado": "- Botones deshabilitados con tooltip protector en UI.\n- Excepción HTTP 400 Bad Request en la API si se intenta degradar o desactivar al Administrador.",
        "rca": "Ausencia de comprobación defensiva contra auto-democión en usuarios.service.ts y DashboardAdmin.tsx.",
        "solucion": [
            ("Backend (usuarios.service.ts):", "Restricción defensiva en actualizarRol y actualizarEstado bloqueando mutaciones a cuentas con rol ADMINISTRADOR."),
            ("Frontend (DashboardAdmin.tsx):", "Insignia 'Administrador (Protegido)' y botones deshabilitados con tooltip explicativo."),
            ("Semilla (seed-demo.ts):", "Restauración inmutable del rol ADMINISTRADOR para admin@digemaps.gob.do."),
        ],
        "verificacion": [
            ("Pruebas unitarias del módulo de usuarios", "npm.cmd test -w apps/api", "Aprobado (56/56)"),
            ("Pruebas unitarias DashboardAdmin.test.tsx", "npm.cmd test -- --run -w apps/web", "Aprobado (160/160)"),
        ]
    },
    {
        "codigo": "DEF-2026-011",
        "archivo": "Estado_Cuenta_Pendiente_Validacion",
        "titulo_corto": "Módulo: Administración — Etiqueta y Estética de Estado",
        "modulo": "Administración / Directorio de Usuarios",
        "severidad": "Media (Usabilidad, Consistencia y Estética)",
        "prioridad": "P2 (Media)",
        "tipo": "Interfaz de Usuario / Factores Humanos",
        "descripcion": "En la tabla de usuarios de administración, el estado de cuenta de los nuevos usuarios se mostraba directamente con el valor de base de datos 'PENDIENTE_VALIDACION' en mayúsculas sostenidas y guion bajo, sobre un chip naranja saturado ('color mamei') discordante con el diseño del sistema.",
        "pasos": [
            "Acceder al panel de administración (/admin) en 'Gestión de Usuarios y Roles'.",
            "Observar la columna 'Estado de cuenta' de los usuarios recién registrados.",
            "Constatar el texto crudo 'PENDIENTE_VALIDACION' y el fondo naranja chillón."
        ],
        "observado": "- Texto en formato técnico de base de datos.\n- Color naranja estridente que genera ruido visual.",
        "esperado": "- Etiqueta formal 'Pendiente de validación' sobre un badge delineado sutil y sobrio acorde a la paleta institucional.",
        "rca": "Renderizado directo de la propiedad u.estado sin mapeo al diccionario de presentación.",
        "solucion": [
            ("Frontend (DashboardAdmin.tsx):", "Implementación del diccionario CONFIG_ESTADO_USUARIO con mapeo a 'Pendiente de validación' y estilos de baja saturación."),
        ],
        "verificacion": [
            ("Pruebas de renderizado de estado en frontend", "npm.cmd test -- --run -w apps/web", "Aprobado (160/160)"),
        ]
    },
    {
        "codigo": "DEF-2026-012",
        "archivo": "Gestion_Informes_Devueltos_Deshacer_Devolucion",
        "titulo_corto": "Módulo: Coordinador — Informes Devueltos y Deshacer Devolución",
        "modulo": "Coordinador de Calidad / Informes",
        "severidad": "Alta (Pérdida de Visibilidad Operativa)",
        "prioridad": "P1 (Urgente)",
        "tipo": "Lógica de Flujo de Trabajo / Trazabilidad",
        "descripcion": "Al devolver un informe de evaluación al técnico para correcciones, la evaluación pasaba a estado DEVUELTA (idEstado 6) y desaparecía por completo de la vista del coordinador al no existir una sección de seguimiento. Además, no se disponía de confirmaciones previas ni de una acción para 'Deshacer devolución' si la acción se ejecutó por equivocación.",
        "pasos": [
            "Acceder como Coordinador a 'Informes pendientes de revisión'.",
            "Pulsar 'Devolver'.",
            "Observar que el informe se esfuma inmediatamente de la pantalla sin poder rastrearlo ni revertir la acción."
        ],
        "observado": "- El informe devuelto se volvía invisible para el coordinador.\n- Ausencia de confirmaciones de seguridad y de opción para deshacer.",
        "esperado": "- Diálogo modal de confirmación antes de devolver.\n- Sección dedicada 'Informes devueltos / en corrección' con botón 'Deshacer devolución' para retornar a EN_REVISION.",
        "rca": "El panel solo consultaba idEstado = 4 (EN_REVISION) y no existía un endpoint de reversión para estado DEVUELTA.",
        "solucion": [
            ("Backend (informes.controller.ts):", "Creación del endpoint PATCH /api/v1/informes/:evaluacionId/revertir-revision."),
            ("Backend (informes.service.ts):", "Método revertirRevision() transicionando de DEVUELTA a EN_REVISION con registro de auditoría."),
            ("Frontend (DashboardCoordinador.tsx):", "Nueva sección 'Informes devueltos / en corrección' con botón 'Deshacer devolución' y confirmaciones modales."),
        ],
        "verificacion": [
            ("Pruebas de controladores y servicios de informes", "npm.cmd test -w apps/api", "Aprobado (56/56)"),
            ("Pruebas unitarias de interfaz DashboardCoordinador", "npm.cmd test -- --run -w apps/web", "Aprobado (160/160)"),
        ]
    },
    {
        "codigo": "DEF-2026-013",
        "archivo": "Eliminacion_Tooltip_Interno_Coordinador",
        "titulo_corto": "Módulo: Coordinador — Retiro de Nota Interna de Desarrollo",
        "modulo": "Coordinador de Calidad / UI",
        "severidad": "Baja (Profesionalismo y Experiencia de Usuario)",
        "prioridad": "P2 (Media)",
        "tipo": "Interfaz de Usuario / Calidad de Producto",
        "descripcion": "En la tabla de informes pendientes de revisión del coordinador, al posar el cursor sobre los botones de acción aparecía un tooltip con una nota técnica interna de desarrollo: 'Hoy el backend registra Devolver y Solicitar corrección exactamente igual (mismo estado, Devuelta)...', además de presentar dos botones redundantes.",
        "pasos": [
            "Iniciar sesión como Coordinador e ingresar a /coordinador.",
            "Posar el cursor del mouse sobre el botón 'Devolver' o 'Solicitar corrección'.",
            "Observar el tooltip emergente con texto técnico de desarrollo visible al usuario final."
        ],
        "observado": "- Mensaje técnico de desarrollo expuesto en producción.\n- Dos botones realizando la misma acción técnica.",
        "esperado": "- Retiro absoluto de tooltips de desarrollo.\n- Unificación clara en dos acciones: 'Aprobar' y 'Devolver para corrección'.",
        "rca": "Presencia de la constante TOOLTIP_ACCION_EQUIVALENTE en el componente React.",
        "solucion": [
            ("Frontend (DashboardCoordinador.tsx):", "Eliminación de la constante y reemplazo de los botones redundantes por 'Aprobar' y 'Devolver para corrección' con colores sobrios."),
        ],
        "verificacion": [
            ("Pruebas unitarias de componentes web", "npm.cmd test -- --run -w apps/web", "Aprobado (160/160)"),
        ]
    },
    {
        "codigo": "DEF-2026-014",
        "archivo": "Catalogo_Tipos_Establecimiento_Dropdown",
        "titulo_corto": "Módulo: Solicitud BPM y Catálogos — Tipos de Establecimiento",
        "modulo": "Solicitudes BPM / Catálogos Admin",
        "severidad": "Media (Integridad y Estandarización de Datos)",
        "prioridad": "P2 (Media)",
        "tipo": "Estandarización de Datos / Arquitectura",
        "descripcion": "En el formulario de nueva solicitud de evaluación BPM, el tipo de establecimiento era un campo de texto libre, lo que provocaba errores tipográficos, inconsistencias y datos sucios en el sistema. Además, el administrador no disponía de una interfaz para configurar las categorías permitidas.",
        "pasos": [
            "Acceder como empresa a /empresa/solicitud/nueva.",
            "Observar el campo 'Tipo de establecimiento'.",
            "Constatar que es un TextField de texto libre sin validación contra catálogo oficial."
        ],
        "observado": "- Campo libre propenso a errores y falta de control administrativo.",
        "esperado": "- Menú desplegable select alimentado dinámicamente desde un catálogo centralizado gestionado por el Administrador.",
        "rca": "Ausencia de un módulo backend de catálogos para tipos de establecimiento.",
        "solucion": [
            ("Backend (catalogos/):", "Módulo CRUD completo /api/v1/catalogos/tipos-establecimiento con 8 categorías iniciales de la industria alimentaria."),
            ("Frontend (FormularioSolicitud.tsx):", "Reemplazo por TextField select conectado a la API de catálogos."),
            ("Frontend (DashboardAdmin.tsx):", "Pestaña 'Catálogos: Tipos de Establecimiento' con creación y edición rápida."),
        ],
        "verificacion": [
            ("Pruebas de la API de catálogos", "npm.cmd test -w apps/api", "Aprobado (56/56)"),
            ("Pruebas de formularios web", "npm.cmd test -- --run -w apps/web", "Aprobado (160/160)"),
        ]
    },
    {
        "codigo": "DEF-2026-015",
        "archivo": "Aislamiento_Perfil_Cache_Sesiones",
        "titulo_corto": "Módulo: Perfil de Usuario — Aislamiento y Purga de Caché de Sesiones",
        "modulo": "Perfil de Usuario / Sesiones Web",
        "severidad": "Mayor (Privacidad de Datos y Seguridad de Sesión)",
        "prioridad": "P1 (Alta)",
        "tipo": "Seguridad de Sesión / Gestión de Caché",
        "descripcion": (
            "Al iniciar sesión con una cuenta distinta (por ejemplo, Administrador tras haber estado autenticado como "
            "Técnico Evaluador), el modal de Mi Perfil desplegaba los datos del usuario previo (nombre, correo, teléfono y estado de 2FA), "
            "debido a la reutilización en memoria de claves de caché no vinculadas al ID del usuario y la falta de purga al cerrar o iniciar sesión."
        ),
        "pasos": [
            "Iniciar sesión como Técnico Evaluador y abrir el modal Mi Perfil.",
            "Cerrar sesión e iniciar sesión como Administrador del Sistema.",
            "Abrir el menú de usuario y presionar 'Mi perfil'.",
            "Observar que se mostraban los datos y configuración del técnico en lugar de los del administrador."
        ],
        "observado": "- Persistencia visual de la identidad, teléfono y estado de autenticación en dos pasos del usuario anterior.",
        "esperado": "- Presentación inmediata y exclusiva de la información y configuración de seguridad correspondiente al usuario activo de la sesión.",
        "rca": "La queryKey de TanStack Query era estática (['perfil-usuario']) sin aislar por ID de usuario, combinada con un staleTime de 5 minutos y ausencia de queryClient.clear() en las transiciones de sesión.",
        "solucion": [
            ("Frontend (usePerfil.ts):", "Parametrización de usePerfil con queryKey ligada a usuarioId, staleTime=0 y validación estricta de identidad contra la respuesta de la API."),
            ("Frontend (DialogPerfil.tsx):", "Blindaje de TabInformacion y TabSeguridad validando que perfil.id coincida con usuarioSesion.id y reseteo reactivo de estados de formulario."),
            ("Frontend (AppLayout.tsx / Login.tsx):", "Purga exhaustiva mediante queryClient.clear() al ejecutar cerrarSesion y al autenticar un nuevo usuario en Login."),
        ],
        "verificacion": [
            ("Pruebas unitarias frontend", "npx.cmd vitest run src/pages/perfil/DialogPerfil.test.tsx", "Aprobado (10/10)"),
            ("Suite completa web", "npm.cmd test -w apps/web", "Aprobado (176/176)"),
        ]
    },
    {
        "codigo": "DEF-2026-016",
        "archivo": "Responsividad_Dashboards_Vistas_Moviles",
        "titulo_corto": "Módulo: Responsividad y Adaptabilidad — Dashboards y Formularios Móviles",
        "modulo": "Interfaz Web / Todos los Roles",
        "severidad": "Mayor (Usabilidad y Accesibilidad)",
        "prioridad": "P1 (Alta)",
        "tipo": "Diseño Responsivo / UI-UX",
        "descripcion": (
            "En dispositivos móviles y pantallas estrechas, los dashboards de Coordinador, Administrador, Empresa, "
            "Técnico y Consulta Histórica presentaban desbordamientos horizontales, tablas cortadas y botones fuera de vista."
        ),
        "pasos": [
            "Acceder a la aplicación desde un dispositivo móvil o emulador (viewport < 600px).",
            "Navegar por los dashboards de Coordinador, Técnico, Empresa y Administrador.",
            "Constatar el corte de columnas en tablas y solapamiento de tarjetas de métricas."
        ],
        "observado": "- Elementos visuales truncados y tablas con pérdida de información lateral.",
        "esperado": "- Adaptación fluida de rejilla (grid/flex), contenedores con scroll horizontal suave y botones táctiles del 100% de ancho.",
        "rca": "Estructuras de layout rígidas con anchos fijos en píxeles y omisión de directivas responsivas por breakpoints de MUI.",
        "solucion": [
            ("Frontend (Dashboards):", "Reestructuración con Box flexWrap, stacks verticales en xs y scroll horizontal seguro en tablas."),
            ("Frontend (Formularios y Modales):", "Ajuste a fullWidth y maxWidth dinámico para adaptación fluida en pantallas táctiles."),
        ],
        "verificacion": [
            ("Pruebas de renderizado responsive", "npx.cmd vitest run src/routes/RoleRoute.test.tsx", "Aprobado (4/4)"),
            ("Suite completa frontend", "npm.cmd test -w apps/web", "Aprobado (182/182)"),
        ]
    },
    {
        "codigo": "DEF-2026-017",
        "archivo": "Bloqueo_Prioridad_Decisiones_Expedientes_Cerrados",
        "titulo_corto": "Módulo: Coordinador — Bloqueo de Prioridad y Decisiones en Casos Cerrados",
        "modulo": "Gestión de Expedientes / Coordinador",
        "severidad": "Mayor (Integridad de Datos)",
        "prioridad": "P1 (Alta)",
        "tipo": "Seguridad Operativa / Integridad",
        "descripcion": (
            "Al inspeccionar un expediente en estado 'Cerrado', el modal permitía alterar la prioridad del caso "
            "y mantenía activos los botones de toma de decisiones operativas, vulnerando la inmutabilidad de registros archivados."
        ),
        "pasos": [
            "Iniciar sesión como Coordinador y acceder a la pestaña de Expedientes Cerrados.",
            "Hacer clic en 'Inspeccionar' sobre un expediente cerrado.",
            "Observar que el selector de prioridad y las acciones operativas se encontraban habilitados."
        ],
        "observado": "- Capacidad de mutar prioridad y disparar transiciones de estado sobre expedientes formalmente concluidos.",
        "esperado": "- Inhabilitación total del selector de prioridad y ocultamiento de botones de acción para casos cerrados.",
        "rca": "Ausencia de validación reactiva sobre el estado del caso en ModalInspeccionCaso.tsx.",
        "solucion": [
            ("Frontend (ModalInspeccionCaso.tsx):", "Incorporación de condición esCerrado y desactivación de controles interactivos."),
            ("Backend (expedientes.service.ts):", "Validación estricta en endpoints de actualización de casos archivados."),
        ],
        "verificacion": [
            ("Pruebas unitarias de expedientes", "npx.cmd vitest run src/lib/coordinador/useExpedientes.test.tsx", "Aprobado (6/6)"),
            ("Suite completa frontend", "npm.cmd test -w apps/web", "Aprobado (182/182)"),
        ]
    },
    {
        "codigo": "DEF-2026-018",
        "archivo": "Reapertura_Expedientes_Cerrados_Motivo",
        "titulo_corto": "Módulo: Coordinador — Reapertura Controlada de Expedientes Archivados",
        "modulo": "Gestión de Expedientes / Coordinador",
        "severidad": "Media (Operabilidad del Sistema)",
        "prioridad": "P2 (Media)",
        "tipo": "Flujo de Negocio / Auditoría",
        "descripcion": (
            "No se permitía la reapertura administrativa de expedientes cerrados cuando se requería una rectificación "
            "o nueva instrucción por parte del Coordinador con su correspondiente justificación formal."
        ),
        "pasos": [
            "Abrir un expediente cerrado como Coordinador.",
            "Intentar reaperturar el caso con una nota explicativa.",
            "Constatar que el sistema bloqueaba la acción o no persistía el motivo de reapertura."
        ],
        "observado": "- Imposibilidad de reiniciar el flujo de trabajo sobre un caso cerrado que ameritaba revisión.",
        "esperado": "- Flujo de reapertura controlado que solicita motivo obligatorio y transiciona el caso a estado activo registrando auditoría.",
        "rca": "Regla de transición de estados excesivamente restrictiva en la lógica de negocio del backend.",
        "solucion": [
            ("Backend (expedientes.service.ts):", "Método reabrirExpediente con validación de estado previo 'Cerrado' y auditoría de motivo."),
            ("Frontend (ModalInspeccionCaso.tsx):", "Modal con campo de texto obligatorio para la justificación de la reapertura."),
        ],
        "verificacion": [
            ("Pruebas unitarias de expedientes", "npx.cmd vitest run src/lib/coordinador/useExpedientes.test.tsx", "Aprobado (6/6)"),
            ("Suite completa frontend", "npm.cmd test -w apps/web", "Aprobado (182/182)"),
        ]
    },
    {
        "codigo": "DEF-2026-019",
        "archivo": "Buscador_Criterios_Ficha_Tecnica_BPM",
        "titulo_corto": "Módulo: Técnico Evaluador — Buscador en Tiempo Real en Ficha Técnica",
        "modulo": "Ficha Técnica BPM / Técnico Evaluador",
        "severidad": "Media (Eficiencia y Usabilidad en Campo)",
        "prioridad": "P2 (Media)",
        "tipo": "Usabilidad / Herramienta de Productividad",
        "descripcion": (
            "En la evaluación técnica en campo, los inspectores debían recorrer manualmente extensas secciones para "
            "ubicar criterios específicos, sin una herramienta de búsqueda inmediata por código o palabra clave."
        ),
        "pasos": [
            "Ingresar a una evaluación técnica en curso.",
            "Intentar buscar un criterio específico como 'plagas', 'agua' o el código '1.1 a'.",
            "Constatar que únicamente se podía navegar pestaña por pestaña sin filtro de texto."
        ],
        "observado": "- Navegación lenta y tediosa durante auditorías presenciales en fábricas de alimentos.",
        "esperado": "- Barra de búsqueda integrada con debounce en tiempo real que filtre inmediatamente por numeración o descripción.",
        "rca": "Omisión de un mecanismo de filtrado de texto en el componente de ejecución de evaluación.",
        "solucion": [
            ("Frontend (EjecutarEvaluacion.tsx):", "Implementación de TextField de búsqueda con debounce y filtrado normalizado sobre el árbol BPM."),
            ("Frontend (FilaCriterio):", "Mantenimiento de estado de respuesta y visualización de resultados sin reiniciar selecciones."),
        ],
        "verificacion": [
            ("Pruebas de ficha técnica", "npx.cmd vitest run src/pages/tecnico/EjecutarEvaluacion.test.tsx", "Aprobado (9/9)"),
            ("Suite completa frontend", "npm.cmd test -w apps/web", "Aprobado (182/182)"),
        ]
    },
    {
        "codigo": "DEF-2026-020",
        "archivo": "Consulta_Historica_Modo_Solo_Lectura",
        "titulo_corto": "Módulo: Consultas Históricas — Blindaje Modo Solo Lectura en Inspección",
        "modulo": "Consulta Histórica / Auditoría General",
        "severidad": "Crítica (Integridad y Trazabilidad Histórica)",
        "prioridad": "P1 (Alta)",
        "tipo": "Seguridad de Datos / Auditoría",
        "descripcion": (
            "Al consultar casos desde la pantalla de Consulta Histórica, el modal de inspección reutilizaba los controles "
            "interactivos del coordinador, posibilitando mutaciones accidentales sobre registros de ejercicios concluidos."
        ),
        "pasos": [
            "Acceder a /historico/consulta como usuario autorizado.",
            "Filtrar y seleccionar un caso archivado para inspeccionar.",
            "Constatar que el modal presentaba selectores de prioridad y botones de decisión editables."
        ],
        "observado": "- Riesgo de alteración involuntaria de información histórica y auditorías pasadas.",
        "esperado": "- Despliegue estricto en modo solo lectura con todos los campos bloqueados y botones mutadores suprimidos.",
        "rca": "Falta de parametrización del modo soloLectura al invocar ModalInspeccionCaso desde ConsultaHistorica.tsx.",
        "solucion": [
            ("Frontend (ConsultaHistorica.tsx):", "Paso forzado de soloLectura={true} en la apertura de expedientes históricos."),
            ("Frontend (ModalInspeccionCaso.tsx):", "Ocultamiento condicional de controles mutadores bajo la bandera soloLectura."),
        ],
        "verificacion": [
            ("Pruebas de consulta histórica", "npx.cmd vitest run src/lib/historico/useCasosHistorico.test.tsx", "Aprobado (3/3)"),
            ("Suite completa frontend", "npm.cmd test -w apps/web", "Aprobado (182/182)"),
        ]
    },
    {
        "codigo": "DEF-2026-021",
        "archivo": "Modal_Geolocalizacion_GPS_Criterio_Y_Advertencia_Borrado",
        "titulo_corto": "Módulo: Técnico Evaluador — Modal Propio con GPS por Criterio y Advertencia de Borrado",
        "modulo": "Ficha Técnica / Evidencias de Campo",
        "severidad": "Mayor (Integridad de Evidencias y Seguridad Operativa)",
        "prioridad": "P1 (Alta)",
        "tipo": "Funcionalidad de Campo / Heurística de Seguridad",
        "descripcion": (
            "Los criterios evaluables no contaban con modal individual para capturar geolocalización geográfica GPS "
            "específica del hallazgo. Asimismo, la eliminación de evidencias operaba sin diálogo de advertencia previo, "
            "ocasionando borrados accidentales en dispositivos móviles táctiles."
        ),
        "pasos": [
            "Ingresar a una evaluación en curso y responder un criterio de inspección.",
            "Pulsar 'Adjuntar evidencia' en dicho criterio.",
            "Constatar que no se abría un modal con GPS y que pulsar la papelera borraba archivos sin confirmar."
        ],
        "observado": "- Falta de georreferenciación puntual del criterio y pérdida de archivos por toques accidentales.",
        "esperado": "- Modal exclusivo por criterio con subida multimedia y captura GPS GeoJSON, junto a diálogo de confirmación antes de eliminar.",
        "rca": "Desactivación de permitirGps en FilaCriterio y carencia de un estado de confirmación en la acción de borrado.",
        "solucion": [
            ("Frontend (EjecutarEvaluacion.tsx):", "Habilitación de modal individual con GPS y exportación GeoJSON vinculado a respuestaItemId."),
            ("Frontend (EjecutarEvaluacion.tsx):", "Implementación de diálogo modal de confirmación y advertencia destructiva previa al borrado."),
            ("Pruebas unitarias:", "Nueva suite validando apertura del modal propio con GPS y diálogo de advertencia de borrado."),
        ],
        "verificacion": [
            ("Pruebas unitarias de modal y confirmación", "npx.cmd vitest run src/pages/tecnico/EjecutarEvaluacion.test.tsx", "Aprobado (9/9)"),
            ("Suite completa frontend", "npm.cmd test -w apps/web", "Aprobado (182/182)"),
        ]
    }
]

def main():
    output_dir = r"c:\Users\rowli\Documents\GitHub\Reto-Desarrollo-Web-Evaluacion-Basada-en-Riesgo\docs\qa"
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Generando {len(DEFECTOS)} informes formales de defectos en {output_dir}...")
    for d in DEFECTOS:
        build_single_report(d, output_dir)
    print("Todos los informes han sido generados exitosamente!")

if __name__ == "__main__":
    main()
