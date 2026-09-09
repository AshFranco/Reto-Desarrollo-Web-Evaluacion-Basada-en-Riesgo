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
  ultimaAccionCoordinador: null,
};

export const MOCK_TECNICO = {
  id: '2',
  nombreCompleto: 'Juan Técnico',
  correoElectronico: 'tecnico.prueba@ebr.local',
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
  http.post(`${BASE}/api/v1/evaluaciones/:id/respuestas`, () =>
    HttpResponse.json({ mensaje: 'Avance guardado.' })
  ),
  http.post(`${BASE}/api/v1/evaluaciones/:id/finalizar`, () =>
    HttpResponse.json({ ...MOCK_EVALUACION_DETALLE, idEstado: 3, bloqueada: true })
  ),
  http.post(`${BASE}/api/v1/evidencias`, () =>
    HttpResponse.json({ id: '1', url: '/uploads/mock.jpg' })
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
  http.get(`${BASE}/api/v1/casos/:id`, () => HttpResponse.json(MOCK_CASO_DETALLE)),
  http.post(`${BASE}/api/v1/asignaciones`, () => HttpResponse.json(MOCK_ASIGNACION)),
  http.get(`${BASE}/api/v1/calendario`, () => HttpResponse.json([])),
  http.get(`${BASE}/api/v1/usuarios/por-rol/:codigoRol`, () => HttpResponse.json([MOCK_TECNICO])),
  http.patch(`${BASE}/api/v1/informes/:evaluacionId/revisar`, () =>
    HttpResponse.json({ id: '1', idEstado: 5 })
  ),
  http.get(`${BASE}/api/v1/expedientes`, () => HttpResponse.json([MOCK_EXPEDIENTE])),
  http.patch(`${BASE}/api/v1/expedientes/:casoId/cerrar`, () => HttpResponse.json(MOCK_EXPEDIENTE)),
];
