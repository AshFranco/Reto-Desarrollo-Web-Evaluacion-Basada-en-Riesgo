import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PwaUpdatePrompt } from './PwaUpdatePrompt';

// vi.mock es hoisted por vitest al inicio del módulo, por lo que aplica a
// todos los tests del archivo. El estado mutable permite controlarlo por test.
const mockState = { needRefresh: false };
const mockActualizar = vi.fn();
const mockCerrar = vi.fn();

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [mockState.needRefresh, mockCerrar],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: mockActualizar,
  }),
}));

beforeEach(() => {
  mockState.needRefresh = false;
  mockActualizar.mockClear();
  mockCerrar.mockClear();
});

describe('PwaUpdatePrompt — sin actualización pendiente', () => {
  it('no muestra ninguna alerta cuando needRefresh es false', () => {
    render(<PwaUpdatePrompt />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('PwaUpdatePrompt — con actualización disponible', () => {
  beforeEach(() => { mockState.needRefresh = true; });

  it('muestra el mensaje cuando needRefresh es true', () => {
    render(<PwaUpdatePrompt />);
    expect(screen.getByText('Nueva versión disponible.')).toBeInTheDocument();
  });

  it('botón Actualizar llama a updateServiceWorker(true)', () => {
    render(<PwaUpdatePrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(mockActualizar).toHaveBeenCalledWith(true);
  });

  it('botón Cerrar llama a setNeedRefresh(false)', () => {
    render(<PwaUpdatePrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(mockCerrar).toHaveBeenCalledWith(false);
  });
});
