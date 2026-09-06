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
      nivel: 1, orden: 1, esEvaluable: false, peso: 0, idCriticidad: null,
      hijos: [
        {
          id: '2', idPadre: '1', numeracion: '1.1', titulo: 'Ítem evaluable',
          nivel: 2, orden: 1, esEvaluable: true, peso: 1.0, idCriticidad: '1',
          hijos: [],
        },
      ],
    },
  ],
  opcionesRespuesta: [
    { id: '1', codigo: 'C',   nombre: 'Cumple',               valor: 1.0, excluyeDelCalculo: false, generaNc: false },
    { id: '2', codigo: 'CP',  nombre: 'Cumplimiento parcial',  valor: 0.5, excluyeDelCalculo: false, generaNc: true  },
    { id: '3', codigo: 'IT',  nombre: 'Incumple totalmente',   valor: 0.0, excluyeDelCalculo: false, generaNc: true  },
    { id: '4', codigo: 'N/A', nombre: 'No aplica',             valor: 0.0, excluyeDelCalculo: true,  generaNc: false },
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

export const MOCK_ASIGNACION = {
  id: '1',
  idCaso: '1',
  idEvaluador: '2',
  idCoordinador: '3',
  fechaAsignacion: '2026-01-03T00:00:00.000Z',
  estado: 'Asignado',
  evaluador: { nombreCompleto: 'Juan Técnico' },
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
    HttpResponse.json([])
  ),
  http.post(`${BASE}/api/v1/evaluaciones/:id/iniciar`, () =>
    HttpResponse.json({ estado: 'En_Curso' })
  ),
  http.post(`${BASE}/api/v1/evaluaciones/:id/respuestas`, () =>
    HttpResponse.json({ procesadas: 1 })
  ),
  http.post(`${BASE}/api/v1/evaluaciones/:id/finalizar`, () =>
    HttpResponse.json({ bloqueada: true })
  ),
  http.post(`${BASE}/api/v1/evidencias`, () =>
    HttpResponse.json({ id: '1', url: '/uploads/mock.jpg' })
  ),
  http.get(`${BASE}/api/v1/empresas`, () => HttpResponse.json([MOCK_EMPRESA])),
  http.get(`${BASE}/api/v1/empresas/:id`, () => HttpResponse.json(MOCK_EMPRESA)),
  http.post(`${BASE}/api/v1/empresas`, () => HttpResponse.json(MOCK_EMPRESA)),
  http.patch(`${BASE}/api/v1/empresas/:id`, () => HttpResponse.json(MOCK_EMPRESA)),
  http.get(`${BASE}/api/v1/solicitudes-bpm/mias`, () => HttpResponse.json([MOCK_SOLICITUD])),
  http.post(`${BASE}/api/v1/solicitudes-bpm`, () => HttpResponse.json(MOCK_SOLICITUD)),
  http.post(`${BASE}/api/v1/solicitudes-bpm/:id/enviar`, () =>
    HttpResponse.json({ ...MOCK_SOLICITUD, estado: 'Asignada', fechaEnvio: '2026-01-02T00:00:00.000Z' })
  ),
  http.get(`${BASE}/api/v1/casos`, () => HttpResponse.json([MOCK_CASO_RESUMEN])),
  http.get(`${BASE}/api/v1/casos/:id`, () => HttpResponse.json(MOCK_CASO_DETALLE)),
  http.post(`${BASE}/api/v1/asignaciones`, () => HttpResponse.json(MOCK_ASIGNACION)),
  http.get(`${BASE}/api/v1/calendario`, () => HttpResponse.json([])),
];
