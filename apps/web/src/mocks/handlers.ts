import { http, HttpResponse } from 'msw';

export const MOCK_ACCESS_TOKEN = 'mock-access-token-abc123';

export const MOCK_LOGIN_RESPONSE = {
  accessToken: MOCK_ACCESS_TOKEN,
  usuario: {
    id: '1',
    nombreCompleto: 'Ana Pérez',
    rol: 'TECNICO_EVALUADOR',
    empresaId: null,
  },
};

export const MOCK_CATALOGO = {
  id: '1',
  secciones: [
    {
      id: '1', idPadre: null, numeracion: '1', titulo: 'Sección A',
      nivel: 1, orden: 1, esEvaluable: false, peso: null, idCriticidad: null,
      hijos: [
        {
          id: '2', idPadre: '1', numeracion: '1.1', titulo: 'Ítem evaluable',
          nivel: 2, orden: 1, esEvaluable: true, peso: '1', idCriticidad: null,
          hijos: [],
        },
      ],
    },
  ],
  opcionesRespuesta: [
    { id: '1', codigo: 'C',   valor: '1',   excluyeDelCalculo: false, generaNc: false },
    { id: '2', codigo: 'CP',  valor: '0.5', excluyeDelCalculo: false, generaNc: true  },
    { id: '3', codigo: 'IT',  valor: '0',   excluyeDelCalculo: false, generaNc: true  },
    { id: '4', codigo: 'N/A', valor: '0',   excluyeDelCalculo: true,  generaNc: false },
  ],
};

export const MOCK_EMPRESA = {
  id: '1',
  razonSocial: 'Alimentos de Prueba SRL',
  rnc: '130000001',
  nombreComercial: null,
  direccion: null,
  idMunicipio: null,
  telefono: null,
  correo: null,
  actividadEconomica: null,
  fechaRegistro: '2026-01-01T00:00:00.000Z',
  establecimientos: [],
};

export const MOCK_SOLICITUD = {
  id: '1',
  idEmpresa: '1',
  idUsuario: '1',
  tipoEstablecimiento: 'Planta procesadora',
  motivo: 'Solicitud de inspección BPM',
  observaciones: null,
  estado: 'Pendiente de Asignacion',
  fechaCreacion: '2026-01-01T00:00:00.000Z',
  fechaEnvio: null,
};

export const MOCK_CASO_RESUMEN = {
  id: '1',
  idEstablecimiento: '1',
  idOrigen: '1',
  estado: 'Pendiente',
  prioridad: 'NORMAL',
  fechaCreacion: '2026-01-01T00:00:00.000Z',
  establecimiento: { nombre: 'Planta Piloto de Prueba', idEmpresa: '1' },
  origen: { id: '1', codigo: 'SOLICITUD', nombre: 'Solicitud de Empresa', orden: 1 },
  asignaciones: [],
};

export const MOCK_CASO_DETALLE = {
  id: '1',
  idEstablecimiento: '1',
  estado: 'Pendiente',
  prioridad: 'NORMAL',
  fechaCreacion: '2026-01-01T00:00:00.000Z',
  fechaCierre: null,
  establecimiento: { id: '1', nombre: 'Planta Piloto de Prueba', empresa: MOCK_EMPRESA },
  solicitud: MOCK_SOLICITUD,
  alerta: null,
  denuncia: null,
  programacion: null,
  evaluaciones: [],
  expediente: null,
};

export const MOCK_ASIGNACION_MIA = {
  id: '1',
  idCaso: '1',
  idEvaluador: '1',
  idCoordinador: '3',
  fechaAsignacion: '2026-01-03T00:00:00.000Z',
  estado: 'Asignado',
  evaluacionId: '1',
  caso: {
    id: '1',
    idEstablecimiento: '1',
    estado: 'Asignado',
    prioridad: 'NORMAL',
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    establecimiento: { nombre: 'Planta Piloto de Prueba', calle: 'Calle Falsa 123' },
  },
};

export const MOCK_ASIGNACION = {
  id: '1',
  idCaso: '1',
  idEvaluador: '2',
  idCoordinador: '3',
  fechaAsignacion: '2026-01-03T00:00:00.000Z',
  estado: 'Asignado',
  evaluador: { nombreCompleto: 'Juan Técnico' },
};

export const MOCK_ESTABLECIMIENTO = {
  id: '1',
  idEmpresa: '1',
  idMunicipio: null,
  idDpsDas: null,
  nombre: 'Planta de Prueba',
  rnc: null,
  calle: 'Calle Falsa 123',
  telefono: null,
  correo: null,
  fechaInicioOperaciones: null,
  numeroPermisoSanitario: 'PS-0001',
  fechaVencimientoPermiso: null,
  produccionAnual: null,
  empleadosMasculino: 0,
  empleadosFemenino: 0,
  mercadoObjetivo: null,
  latitud: null,
  longitud: null,
  activo: true,
};

export const MOCK_EVALUACION_DETALLE = {
  id: '1',
  idCaso: '1',
  idEstablecimiento: '1',
  idVersionFicha: '1',
  idEvaluador: '1',
  idEstado: 1,
  bloqueada: false,
  fechaInicio: null,
  fechaFinalizacion: null,
  establecimiento: { ...MOCK_ESTABLECIMIENTO, empresa: MOCK_EMPRESA },
  versionFicha: {
    id: '1',
    numeroVersion: '2024-10-Rev-FSP-FD',
    nombre: 'Ficha de Inspección BPM',
    totalItemsEvaluables: 1,
    puntajeTotalPosible: '1',
  },
  estado: { id: 1, codigo: 'PROGRAMADA', nombre: 'Programada', esFinal: false, bloqueaDatos: false, orden: 1 },
  respuestas: [],
  evidencias: [] as any[],
  ultimaAccionCoordinador: null,
};

export const MOCK_TECNICO = {
  id: '2',
  nombreCompleto: 'Juan Técnico',
  correoElectronico: 'tecnico.prueba@ebr.local',
};

export const MOCK_REGISTRO_RESPONSE = {
  mensaje: 'Registro recibido. Su cuenta quedará activa tras la validación del Administrador.',
  usuario: { id: '10', correoElectronico: 'nuevo@ebr.local', nombreCompleto: 'Usuario Nuevo' },
};

export const MOCK_EVIDENCIA = {
  id: '1',
  uuidLocal: 'a4508e28-6731-4079-8e63-69ab1adc60bb',
  idEvaluacion: '1',
  idRespuestaItem: null,
  tipo: 'FOTO',
  nombreArchivo: 'ff8b6ae7-81f6-4238-9627-c9e2e965a5e0.png',
  rutaAlmacenamiento: 'ff8b6ae7-81f6-4238-9627-c9e2e965a5e0.png',
  tipoMime: 'image/png',
  tamanoBytes: '68',
  hashSha256: null,
  latitud: null,
  longitud: null,
  comentario: null,
  fechaCaptura: '2026-01-01T00:00:00.000Z',
  sincronizado: false,
};

// Formato raw del backend (usado por los tests de Rol 4 de Jorge)
export const MOCK_CATALOGO_MOTOR_RIESGO = {
  idVersionFicha: '1',
  idVersionMatriz: '1',
  reglaAprobacion: {
    porcentajeMinimoAprobacion: 60,
    maxNcCriticas: 1,
    maxNcMayores: 5,
    porcentajePermisoSanitario: 81,
  },
  factores: [
    {
      id: '1', numero: 1, nombre: 'Volumen de producción', peso: 0.16, esAutomatico: false,
      opciones: [
        { id: '1', descripcion: 'Grande', puntaje: 3, limiteInf: null, limiteSup: null },
        { id: '2', descripcion: 'Mediano', puntaje: 2.33, limiteInf: null, limiteSup: null },
      ],
    },
    {
      id: '3', numero: 3, nombre: 'Cumplimiento con las BPM', peso: 0.56, esAutomatico: true,
      opciones: [
        { id: '9', descripcion: '≤ 60%', puntaje: 3, limiteInf: 0, limiteSup: 60 },
        { id: '12', descripcion: '>80%', puntaje: 1, limiteInf: 80, limiteSup: 100 },
      ],
    },
  ],
  rangosCalificacion: [],
  rangosFrecuencia: [
    { id: '1', limiteInferior: 1, limiteSuperior: 3.6, incluyeInferior: true, incluyeSuperior: true, nivelRiesgo: 'BAJO', frecuencia: 'ANUAL', mesesHastaProxima: 12 },
    { id: '2', limiteInferior: 3.6, limiteSuperior: 6.3, incluyeInferior: false, incluyeSuperior: true, nivelRiesgo: 'MEDIO', frecuencia: 'SEMESTRAL', mesesHastaProxima: 6 },
    { id: '3', limiteInferior: 6.3, limiteSuperior: null, incluyeInferior: false, incluyeSuperior: true, nivelRiesgo: 'ALTO', frecuencia: 'TRIMESTRAL', mesesHastaProxima: 3 },
  ],
};

export const MOCK_RESULTADO_RIESGO = {
  id: '1',
  idEvaluacion: '1',
  idNivelRiesgo: 1,
  idSubcategoriaRp: null,
  idRangoCalificacion: null,
  porcentajeCumplimiento: '100.00',
  rpValor: '1.0000',
  reValor: '1.0000',
  rtValor: '1.0000',
  frecuencia: 'ANUAL',
  puntosObtenidos: '45.00',
  puntosExcluidosNa: '0.00',
  puntajeTotalPosible: '45.00',
  denominadorEfectivo: '45.00',
  itemsRespondidos: 45,
  itemsNa: 0,
  calificacionTexto: 'Aprueba la inspección',
  aprueba: true,
  otorgaPermisoSanitario: true,
  ncCriticas: 0,
  ncMayores: 0,
  ncMenores: 0,
  fechaProximaInspeccion: '2027-01-01T00:00:00.000Z',
  fechaCalculo: '2026-01-01T00:00:00.000Z',
  reDetalle: [{ numero: 1, factor: 'Volumen de producción', puntaje: 3, peso: 0.16, aporte: 0.48 }],
};

// Formato Omit<EntradaCalculo, 'respuestas'> que loaderMotor.ts almacena en Dexie
export const MOCK_CATALOGO_MOTOR = {
  factoresManuales: [
    { numero: 1, nombre: 'Volumen de producción',       peso: 0.16, puntaje: 1.00, esAutomatico: false },
    { numero: 2, nombre: 'Implementación HACCP',        peso: 0.09, puntaje: 3.00, esAutomatico: false },
    { numero: 4, nombre: 'Proveedor INABIE',            peso: 0.05, puntaje: 2.33, esAutomatico: false },
    { numero: 5, nombre: 'Rechazos Registro Sanitario', peso: 0.06, puntaje: 1.67, esAutomatico: false },
    { numero: 6, nombre: 'Plan de muestreo',            peso: 0.08, puntaje: 2.33, esAutomatico: false },
  ],
  factorAutomatico: {
    numero: 3,
    nombre: 'Cumplimiento con las BPM',
    peso: 0.56,
    opciones: [
      { id: 1, descripcion: '≤ 60%',      puntaje: 3.00, limiteInf: 0,     limiteSup: 60  },
      { id: 2, descripcion: '>60% - 70%', puntaje: 2.33, limiteInf: 60.01, limiteSup: 70  },
      { id: 3, descripcion: '>70% - 80%', puntaje: 1.67, limiteInf: 70.01, limiteSup: 80  },
      { id: 4, descripcion: '>80%',       puntaje: 1.00, limiteInf: 80.01, limiteSup: 100 },
    ],
  },
  puntajesRpCategorias: [1],
  rangosCalificacion: [
    { limiteInferior: 0,  limiteSuperior: 60,  incluyeInferior: true,  incluyeSuperior: true,  descripcion: 'Condiciones inaceptables', accion: 'Considerar cierre' },
    { limiteInferior: 60, limiteSuperior: 70,  incluyeInferior: false, incluyeSuperior: true,  descripcion: 'Condiciones deficientes',  accion: 'Urge corregir' },
    { limiteInferior: 70, limiteSuperior: 80,  incluyeInferior: false, incluyeSuperior: true,  descripcion: 'Condiciones regulares',    accion: 'Necesario hacer correcciones' },
    { limiteInferior: 80, limiteSuperior: 100, incluyeInferior: false, incluyeSuperior: true,  descripcion: 'Buenas condiciones',       accion: 'Hacer algunas correcciones' },
  ],
  rangosFrecuencia: [
    { id: 1, limiteInferior: 1.0, limiteSuperior: 3.6, incluyeInferior: true,  incluyeSuperior: true,  nivelRiesgo: 'BAJO',  frecuencia: 'Anual',      mesesHastaProxima: 12 },
    { id: 2, limiteInferior: 3.6, limiteSuperior: 6.3, incluyeInferior: false, incluyeSuperior: true,  nivelRiesgo: 'MEDIO', frecuencia: 'Semestral',  mesesHastaProxima: 6  },
    { id: 3, limiteInferior: 6.3, limiteSuperior: 9.0, incluyeInferior: false, incluyeSuperior: true,  nivelRiesgo: 'ALTO',  frecuencia: 'Trimestral', mesesHastaProxima: 3  },
  ],
  reglaAprobacion: {
    porcentajeMinimoAprobacion: 60,
    maxNcCriticas: 1,
    maxNcMayores: 5,
    porcentajePermisoSanitario: 81,
  },
};

export const MOCK_CASO_HISTORICO = {
  id: '1',
  idEstablecimiento: '1',
  idOrigen: 1,
  idSolicitud: '1',
  idAlerta: null,
  idDenuncia: null,
  idProgramacion: null,
  estado: 'Cerrado',
  prioridad: 'NORMAL',
  fechaCreacion: '2026-01-01T00:00:00.000Z',
  establecimiento: { id: '1', nombre: 'Planta Piloto de Prueba', empresa: { id: '1', razonSocial: 'Alimentos de Prueba SRL' } },
  origen: { id: 1, codigo: 'SOLICITUD', nombre: 'Solicitud de Empresa', orden: 1 },
  solicitud: MOCK_SOLICITUD,
  evaluaciones: [{ id: '1', idEstado: 5, fechaFinalizacion: '2026-01-04T00:00:00.000Z' }],
  expediente: {
    id: '1',
    idCaso: '1',
    resultadoFinal: 'Aprueba la inspección',
    fechaCierre: '2026-01-05T00:00:00.000Z',
    informeOficialUrl: null,
    estado: 'Cerrado',
  },
};

export const MOCK_EXPEDIENTE = {
  id: '1',
  idCaso: '1',
  resultadoFinal: null,
  fechaCierre: '2026-01-05T00:00:00.000Z',
  informeOficialUrl: null,
  estado: 'Cerrado',
  caso: {
    id: '1',
    estado: 'Cerrado',
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    establecimiento: { ...MOCK_ESTABLECIMIENTO, empresa: MOCK_EMPRESA },
  },
};

const BASE = 'http://localhost:3000';

export const handlers = [
  http.post(`${BASE}/api/v1/auth/login`, () =>
    HttpResponse.json(MOCK_LOGIN_RESPONSE)
  ),
  http.post(`${BASE}/api/v1/auth/registro`, () =>
    HttpResponse.json(MOCK_REGISTRO_RESPONSE, { status: 201 })
  ),
  http.post(`${BASE}/api/v1/auth/refresh`, () =>
    HttpResponse.json({ accessToken: MOCK_ACCESS_TOKEN })
  ),
  http.post(`${BASE}/api/v1/auth/logout`, () =>
    new HttpResponse(null, { status: 204 })
  ),
  http.get(`${BASE}/api/v1/formularios/vigente`, () =>
    HttpResponse.json(MOCK_CATALOGO)
  ),
  http.get(`${BASE}/api/v1/asignaciones/mias`, () =>
    HttpResponse.json([MOCK_ASIGNACION_MIA])
  ),
  http.get(`${BASE}/api/v1/evaluaciones/:id`, () => HttpResponse.json(MOCK_EVALUACION_DETALLE)),
  http.post(`${BASE}/api/v1/evaluaciones/:id/iniciar`, () =>
    HttpResponse.json({ ...MOCK_EVALUACION_DETALLE, idEstado: 2 })
  ),
  http.post(`${BASE}/api/v1/evaluaciones/:id/respuestas`, async ({ request, params }) => {
    try {
      const body = (await request.json()) as any;
      if (body?.respuestas && Array.isArray(body.respuestas)) {
        for (const r of body.respuestas) {
          const opcion = MOCK_CATALOGO.opcionesRespuesta.find((o) => o.codigo === r.codigoOpcion);
          const opcionId = opcion ? opcion.id : '1';
          const existingIdx = (MOCK_EVALUACION_DETALLE.respuestas as any[]).findIndex(
            (existente: any) => String(existente.idItemFicha) === String(r.itemId)
          );
          const nuevaRespuesta = {
            id: existingIdx >= 0 ? (MOCK_EVALUACION_DETALLE.respuestas as any[])[existingIdx].id : String(Date.now()),
            idEvaluacion: params.id as string,
            idItemFicha: String(r.itemId),
            idOpcionRespuesta: opcionId,
            valorAplicado: opcion?.valor ?? '1',
            excluidoDelCalculo: opcion?.excluyeDelCalculo ?? false,
            idCriticidad: r.nivelCriticidad ?? null,
            observacion: r.observacion ?? null,
          };
          if (existingIdx >= 0) {
            (MOCK_EVALUACION_DETALLE.respuestas as any[])[existingIdx] = nuevaRespuesta;
          } else {
            (MOCK_EVALUACION_DETALLE.respuestas as any[]).push(nuevaRespuesta);
          }
        }
      }
    } catch {
      // Ignorar si no hay cuerpo JSON
    }
    return HttpResponse.json({ mensaje: 'Avance guardado.' });
  }),
  http.post(`${BASE}/api/v1/evaluaciones/:id/finalizar`, () => {
    MOCK_EVALUACION_DETALLE.idEstado = 3;
    MOCK_EVALUACION_DETALLE.bloqueada = true;
    return HttpResponse.json({ ...MOCK_EVALUACION_DETALLE });
  }),
  http.post(`${BASE}/api/v1/evidencias`, async ({ request }) => {
    try {
      const formData = await request.formData();
      const evaluacionId = (formData.get('evaluacionId') as string) ?? '1';
      const respuestaItemId = (formData.get('respuestaItemId') as string) ?? null;
      const tipo = (formData.get('tipo') as string) ?? 'FOTO';
      const archivo = formData.get('archivo') as File;
      const nuevaEvidencia = {
        id: String(Date.now()),
        uuidLocal: String(Date.now()),
        idEvaluacion: evaluacionId,
        idRespuestaItem: respuestaItemId,
        tipo,
        nombreArchivo: archivo?.name || 'evidencia.png',
        rutaAlmacenamiento: archivo?.name || 'evidencia.png',
        tipoMime: archivo?.type || 'image/png',
        tamanoBytes: String(archivo?.size || 1024),
        hashSha256: null,
        latitud: null,
        longitud: null,
        comentario: null,
        fechaCaptura: new Date().toISOString(),
        sincronizado: true,
      };
      if (!MOCK_EVALUACION_DETALLE.evidencias) {
        (MOCK_EVALUACION_DETALLE as any).evidencias = [];
      }
      (MOCK_EVALUACION_DETALLE.evidencias as any[]).push(nuevaEvidencia);
      return HttpResponse.json(nuevaEvidencia);
    } catch {
      return HttpResponse.json(MOCK_EVIDENCIA);
    }
  }),
  http.delete(`${BASE}/api/v1/evidencias/:id`, ({ params }) => {
    if (MOCK_EVALUACION_DETALLE.evidencias) {
      MOCK_EVALUACION_DETALLE.evidencias = (MOCK_EVALUACION_DETALLE.evidencias as any[]).filter(
        (ev: any) => String(ev.id) !== String(params.id)
      );
    }
    return HttpResponse.json({ mensaje: 'Evidencia eliminada correctamente.' });
  }),
  http.get(`${BASE}/api/v1/motor-riesgo/catalogo`, () => HttpResponse.json(MOCK_CATALOGO_MOTOR_RIESGO)),
  http.post(`${BASE}/api/v1/motor-riesgo/calcular`, () => HttpResponse.json(MOCK_RESULTADO_RIESGO)),
  http.get(`${BASE}/api/v1/empresas/publicas`, () =>
    HttpResponse.json([{ id: '1', razonSocial: MOCK_EMPRESA.razonSocial, rnc: MOCK_EMPRESA.rnc, nombreComercial: null }])
  ),
  http.get(`${BASE}/api/v1/empresas`, () => HttpResponse.json([MOCK_EMPRESA])),
  http.get(`${BASE}/api/v1/empresas/:id`, () => HttpResponse.json(MOCK_EMPRESA)),
  http.post(`${BASE}/api/v1/empresas`, () => HttpResponse.json(MOCK_EMPRESA)),
  http.patch(`${BASE}/api/v1/empresas/:id`, () => HttpResponse.json(MOCK_EMPRESA)),
  http.get(`${BASE}/api/v1/establecimientos`, () => HttpResponse.json([MOCK_ESTABLECIMIENTO])),
  http.get(`${BASE}/api/v1/establecimientos/:id`, () =>
    HttpResponse.json({ ...MOCK_ESTABLECIMIENTO, empresa: MOCK_EMPRESA })
  ),
  http.post(`${BASE}/api/v1/establecimientos`, () => HttpResponse.json(MOCK_ESTABLECIMIENTO)),
  http.patch(`${BASE}/api/v1/establecimientos/:id`, () => HttpResponse.json(MOCK_ESTABLECIMIENTO)),
  http.get(`${BASE}/api/v1/solicitudes-bpm/mias`, () => HttpResponse.json([MOCK_SOLICITUD])),
  http.post(`${BASE}/api/v1/solicitudes-bpm`, () => HttpResponse.json(MOCK_SOLICITUD)),
  http.post(`${BASE}/api/v1/solicitudes-bpm/:id/enviar`, () =>
    HttpResponse.json({ ...MOCK_SOLICITUD, estado: 'Asignada', fechaEnvio: '2026-01-02T00:00:00.000Z' })
  ),
  http.get(`${BASE}/api/v1/casos`, () => HttpResponse.json([MOCK_CASO_RESUMEN])),
  http.get(`${BASE}/api/v1/casos/historico`, () => HttpResponse.json([MOCK_CASO_HISTORICO])),
  http.get(`${BASE}/api/v1/casos/:id`, () => HttpResponse.json(MOCK_CASO_DETALLE)),
  http.post(`${BASE}/api/v1/asignaciones`, () => HttpResponse.json(MOCK_ASIGNACION)),
  http.get(`${BASE}/api/v1/calendario`, () => HttpResponse.json([])),
  http.get(`${BASE}/api/v1/usuarios/por-rol/:codigoRol`, () => HttpResponse.json([MOCK_TECNICO])),
  http.get(`${BASE}/api/v1/usuarios/registros/pendientes`, () =>
    HttpResponse.json([
      {
        id: '10',
        nombreCompleto: 'Juan Pérez',
        correoElectronico: 'juan@empresa.com',
        cedulaPasaporte: '001-1234567-8',
        telefono: '+18095551234',
        cartaAutorizacionUrl: 'https://storage.example.com/cartas/carta-juan.pdf',
        fechaCreacion: '2026-03-01T10:00:00.000Z',
        roles: ['ADMINISTRADOR_EMPRESA'],
      },
    ])
  ),
  http.patch(`${BASE}/api/v1/usuarios/registros/:id/resolver`, () =>
    HttpResponse.json({ id: '10', estado: 'APROBADO' })
  ),
  http.patch(`${BASE}/api/v1/informes/:evaluacionId/revisar`, () =>
    HttpResponse.json({ id: '1', idEstado: 5 })
  ),
  http.patch(`${BASE}/api/v1/informes/:evaluacionId/revertir-revision`, () =>
    HttpResponse.json({ id: '1', idEstado: 4 })
  ),
  http.get(`${BASE}/api/v1/expedientes`, () => HttpResponse.json([MOCK_EXPEDIENTE])),
  http.patch(`${BASE}/api/v1/expedientes/:casoId/cerrar`, () => HttpResponse.json(MOCK_EXPEDIENTE)),
  http.get(`${BASE}/api/v1/usuarios/todos`, () =>
    HttpResponse.json([
      {
        id: '1',
        nombreCompleto: 'Admin General',
        correoElectronico: 'admin@digemaps.gob.do',
        telefono: null,
        estado: 'APROBADO',
        roles: [{ codigo: 'ADMINISTRADOR', nombre: 'Administrador' }],
        empresa: null,
        fechaCreacion: '2026-01-01T00:00:00.000Z',
      },
      {
        id: '2',
        nombreCompleto: 'Carlos Técnico',
        correoElectronico: 'tecnico@digemaps.gob.do',
        telefono: null,
        estado: 'APROBADO',
        roles: [{ codigo: 'TECNICO_EVALUADOR', nombre: 'Técnico Evaluador' }],
        empresa: null,
        fechaCreacion: '2026-01-01T00:00:00.000Z',
      },
      {
        id: '3',
        nombreCompleto: 'Rosa Delegada',
        correoElectronico: 'delegado@empresa.com',
        telefono: '+18095551234',
        estado: 'BLOQUEADO',
        roles: [{ codigo: 'ADMINISTRADOR_EMPRESA', nombre: 'Administrador de Empresa' }],
        empresa: { razonSocial: 'Empresa Delegada SRL', rnc: '131-99988-7' },
        fechaCreacion: '2026-01-02T00:00:00.000Z',
      },
    ])
  ),
  http.patch(`${BASE}/api/v1/usuarios/:id/rol`, () =>
    HttpResponse.json({ mensaje: 'Rol actualizado exitosamente.' })
  ),
  http.patch(`${BASE}/api/v1/usuarios/:id/estado`, () =>
    HttpResponse.json({ mensaje: 'Estado actualizado exitosamente.' })
  ),
  http.get(`${BASE}/api/v1/catalogos/tipos-establecimiento`, () =>
    HttpResponse.json([
      { id: '1', nombre: 'Planta de Procesamiento de Alimentos', activo: true },
      { id: '2', nombre: 'Centro de Almacenamiento y Distribución', activo: true },
      { id: '3', nombre: 'Laboratorio de Control de Calidad', activo: true },
    ])
  ),
  http.post(`${BASE}/api/v1/catalogos/tipos-establecimiento`, () =>
    HttpResponse.json({ id: '4', nombre: 'Nuevo Tipo', descripcion: '', activo: true })
  ),
  http.patch(`${BASE}/api/v1/catalogos/tipos-establecimiento/:id`, () =>
    HttpResponse.json({ id: '1', nombre: 'Planta Modificada', descripcion: '', activo: true })
  ),
];

