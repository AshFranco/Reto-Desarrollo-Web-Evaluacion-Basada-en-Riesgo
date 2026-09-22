import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { http, HttpResponse, delay } from 'msw';
import { server } from '@/mocks/node';
import { db } from '@/lib/db';
import { saveSession } from '@/lib/auth/session';
import CalendarioTecnico from '@/pages/tecnico/CalendarioTecnico';
import { CalendarioEvaluador } from './CalendarioEvaluador';

const URL_CALENDARIO = 'http://localhost:3000/api/v1/calendario';

const ev = (id: string, dia: string, nombre: string, idEstado = 1, calle: string | null = 'Calle Falsa 123') => ({
  id,
  idEstado,
  fechaProgramada: `2026-09-${dia}T00:00:00.000Z`,
  establecimiento: { nombre, calle },
});

function responderCon(eventos: unknown[], peticiones?: URL[]) {
  server.use(
    http.get(URL_CALENDARIO, ({ request }) => {
      peticiones?.push(new URL(request.url));
      return HttpResponse.json(eventos);
    })
  );
}

function renderCalendario(children: React.ReactNode = <CalendarioEvaluador evaluadorId="7" />) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/tecnico/calendario']}>
        <Routes>
          <Route path="/tecnico/calendario" element={children} />
          <Route path="/tecnico/evaluaciones/:evaluacionId" element={<p>Pantalla de la evaluación</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const celda = (dia: string) => document.querySelector(`[data-dia="2026-09-${dia}"]`) as HTMLElement;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 21, 12, 0, 0)); // lunes 21 de septiembre de 2026, hora local
  await db.open();
});
afterEach(async () => {
  vi.useRealTimers();
  await db.delete();
});

describe('CalendarioEvaluador', () => {
  describe('vista de mes (por defecto)', () => {
    it('muestra el mes actual, los días de la semana empezando por lunes y resalta hoy', async () => {
      responderCon([]);
      renderCalendario();

      expect(screen.getByText('Septiembre de 2026')).toBeInTheDocument();
      for (const d of ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']) {
        expect(screen.getByText(new RegExp(`^${d}$`, 'i'))).toBeInTheDocument();
      }
      expect(celda('21')).toHaveAttribute('aria-current', 'date');
      expect(celda('22')).not.toHaveAttribute('aria-current');
      await screen.findByText('Sin evaluaciones en este período.');
    });

    it('pide al backend exactamente el rango visible del mes, con el id del evaluador', async () => {
      const peticiones: URL[] = [];
      responderCon([], peticiones);
      renderCalendario();

      await waitFor(() => expect(peticiones.length).toBeGreaterThan(0));
      const q = peticiones[0]!.searchParams;
      expect(q.get('evaluadorId')).toBe('7');
      expect(q.get('desde')).toBe('2026-08-31');
      expect(q.get('hasta')).toBe('2026-10-04');
    });

    it('coloca cada evaluación en su día (una fecha a medianoche UTC no cae en el día anterior)', async () => {
      responderCon([ev('1', '15', 'Planta Uno')]);
      renderCalendario();

      const etiqueta = await within(celda('15')).findByRole('button', { name: 'Planta Uno, Programada' });
      expect(etiqueta).toBeInTheDocument();
      expect(within(celda('14')).queryByText('Planta Uno')).not.toBeInTheDocument();
    });

    it('resume el período con la cantidad total y el desglose por estado', async () => {
      responderCon([ev('1', '15', 'A', 1), ev('2', '16', 'B', 1), ev('3', '17', 'C', 5)]);
      renderCalendario();

      expect(await screen.findByText('3 evaluaciones en este período:')).toBeInTheDocument();
      expect(screen.getByText('Programada · 2')).toBeInTheDocument();
      expect(screen.getByText('Aprobada · 1')).toBeInTheDocument();
    });

    it('usa el singular cuando hay una sola evaluación', async () => {
      responderCon([ev('1', '15', 'Planta Uno')]);
      renderCalendario();

      expect(await screen.findByText('1 evaluación en este período:')).toBeInTheDocument();
    });

    it('al cambiar de mes conserva lo que ya tenía en pantalla mientras carga el nuevo', async () => {
      server.use(
        http.get(URL_CALENDARIO, async ({ request }) => {
          const desde = new URL(request.url).searchParams.get('desde');
          if (desde === '2026-09-28') {
            await delay(300);
            return HttpResponse.json([]);
          }
          return HttpResponse.json([ev('1', '30', 'Planta Fin de Mes')]);
        })
      );
      renderCalendario();
      await within(celda('30')).findByRole('button', { name: 'Planta Fin de Mes, Programada' });

      fireEvent.click(screen.getByRole('button', { name: 'Período siguiente' }));
      await screen.findByText('Octubre de 2026');

      // El 30 de septiembre también se ve en la cuadrícula de octubre: sigue ahí mientras llega la respuesta.
      expect(within(celda('30')).getByRole('button', { name: 'Planta Fin de Mes, Programada' })).toBeInTheDocument();
      await waitFor(() => expect(within(celda('30')).queryByRole('button')).not.toBeInTheDocument());
    });

    it('con más de 3 evaluaciones en un día muestra "+N más" y al tocarlo abre ese día', async () => {
      responderCon([ev('1', '23', 'Planta A'), ev('2', '23', 'Planta B'), ev('3', '23', 'Planta C'), ev('4', '23', 'Planta D')]);
      renderCalendario();

      const masEtiqueta = await within(celda('23')).findByText('+1 más');
      fireEvent.click(masEtiqueta);

      expect(await screen.findByText('Miércoles, 23 de septiembre de 2026')).toBeInTheDocument();
      expect(await screen.findAllByRole('button', { name: 'Abrir evaluación' })).toHaveLength(4);
    });

    it('una evaluación cancelada se ve como tal y no se puede abrir', async () => {
      responderCon([ev('1', '17', 'Planta Cancelada', 8)]);
      renderCalendario();

      const etiqueta = await within(celda('17')).findByRole('button', { name: 'Planta Cancelada, Cancelada' });
      expect(etiqueta).toBeDisabled();
    });

    it('al tocar una evaluación abre su pantalla', async () => {
      responderCon([ev('42', '15', 'Planta Uno')]);
      renderCalendario();

      fireEvent.click(await within(celda('15')).findByRole('button', { name: 'Planta Uno, Programada' }));

      expect(await screen.findByText('Pantalla de la evaluación')).toBeInTheDocument();
    });
  });

  describe('navegación', () => {
    it('avanza y retrocede de mes y vuelve a pedir el rango nuevo', async () => {
      const peticiones: URL[] = [];
      responderCon([], peticiones);
      renderCalendario();
      await waitFor(() => expect(peticiones.length).toBe(1));

      fireEvent.click(screen.getByRole('button', { name: 'Período siguiente' }));
      expect(await screen.findByText('Octubre de 2026')).toBeInTheDocument();
      await waitFor(() => expect(peticiones.length).toBe(2));
      expect(peticiones[1]!.searchParams.get('desde')).toBe('2026-09-28');
      expect(peticiones[1]!.searchParams.get('hasta')).toBe('2026-11-01');

      fireEvent.click(screen.getByRole('button', { name: 'Período anterior' }));
      fireEvent.click(screen.getByRole('button', { name: 'Período anterior' }));
      expect(await screen.findByText('Agosto de 2026')).toBeInTheDocument();
    });

    it('"Hoy" regresa al período actual', async () => {
      responderCon([]);
      renderCalendario();

      fireEvent.click(screen.getByRole('button', { name: 'Período siguiente' }));
      expect(await screen.findByText('Octubre de 2026')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));

      expect(await screen.findByText('Septiembre de 2026')).toBeInTheDocument();
    });
  });

  describe('vista de semana', () => {
    it('muestra los siete días de la semana con sus evaluaciones sin volver a pedir datos', async () => {
      const peticiones: URL[] = [];
      responderCon([ev('1', '21', 'Planta Lunes'), ev('2', '25', 'Planta Viernes')], peticiones);
      renderCalendario();
      await waitFor(() => expect(peticiones.length).toBe(1));

      fireEvent.click(screen.getByRole('button', { name: 'Semana' }));

      expect(await screen.findByText('21 – 27 de septiembre de 2026')).toBeInTheDocument();
      expect(await within(celda('21')).findByRole('button', { name: 'Planta Lunes, Programada' })).toBeInTheDocument();
      expect(within(celda('25')).getByRole('button', { name: 'Planta Viernes, Programada' })).toBeInTheDocument();
      expect(screen.getAllByText('Sin evaluaciones')).toHaveLength(5);
      // El rango del mes ya cubre la semana: cambiar de vista no genera otra petición.
      expect(peticiones).toHaveLength(1);
    });
  });

  describe('vista de día', () => {
    it('muestra el detalle de la evaluación y un botón para abrirla', async () => {
      responderCon([ev('42', '21', 'Planta Uno', 2, 'Av. Duarte #104')]);
      renderCalendario();

      fireEvent.click(screen.getByRole('button', { name: 'Día' }));

      expect(await screen.findByText('Lunes, 21 de septiembre de 2026')).toBeInTheDocument();
      expect(await screen.findByText('Planta Uno')).toBeInTheDocument();
      expect(screen.getByText('Av. Duarte #104')).toBeInTheDocument();
      expect(screen.getByText('En curso')).toBeInTheDocument();
      expect(screen.getAllByText('Hoy')).toHaveLength(2); // el botón de la barra y la marca del día

      fireEvent.click(screen.getByRole('button', { name: 'Abrir evaluación' }));
      expect(await screen.findByText('Pantalla de la evaluación')).toBeInTheDocument();
    });

    it('sin evaluaciones ese día muestra un estado vacío', async () => {
      responderCon([]);
      renderCalendario();

      fireEvent.click(screen.getByRole('button', { name: 'Día' }));

      expect(await screen.findByText('No tiene evaluaciones programadas para este día.')).toBeInTheDocument();
    });
  });

  describe('errores', () => {
    it('si falla la carga, lo avisa y permite reintentar', async () => {
      server.use(http.get(URL_CALENDARIO, () => HttpResponse.json({ message: 'Error' }, { status: 500 })));
      renderCalendario();

      expect(await screen.findByText(/No se pudo cargar el calendario/)).toBeInTheDocument();

      responderCon([ev('1', '15', 'Planta Uno')]);
      fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

      expect(await within(celda('15')).findByRole('button', { name: 'Planta Uno, Programada' })).toBeInTheDocument();
    });
  });
});

describe('CalendarioTecnico (pantalla)', () => {
  it('muestra el encabezado y consulta el calendario del técnico con sesión iniciada', async () => {
    const peticiones: URL[] = [];
    responderCon([], peticiones);
    await saveSession({
      accessToken: 'token',
      usuario: { id: '9', nombreCompleto: 'Tecnico Prueba', rol: 'TECNICO_EVALUADOR', empresaId: null },
    });
    renderCalendario(<CalendarioTecnico />);

    expect(await screen.findByRole('heading', { name: 'Mi calendario' })).toBeInTheDocument();
    await waitFor(() => expect(peticiones.length).toBeGreaterThan(0));
    expect(peticiones[0]!.searchParams.get('evaluadorId')).toBe('9');
  });
});
