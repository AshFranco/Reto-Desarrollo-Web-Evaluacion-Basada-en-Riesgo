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
];
