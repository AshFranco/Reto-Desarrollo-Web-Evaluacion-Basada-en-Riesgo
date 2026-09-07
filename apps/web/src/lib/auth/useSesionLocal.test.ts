import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSesionLocal } from './useSesionLocal';
import { saveSession, clearSession } from './session';

const LOGIN_MOCK = {
  accessToken: 'tok-abc',
  usuario: { id: '1', nombreCompleto: 'Ana Pérez', rol: 'TECNICO_EVALUADOR', empresaId: null },
};

beforeEach(() => clearSession());

describe('useSesionLocal', () => {
  it('comienza en undefined mientras carga', () => {
    const { result } = renderHook(() => useSesionLocal());
    expect(result.current).toBeUndefined();
  });

  it('devuelve null cuando no hay sesión guardada', async () => {
    const { result } = renderHook(() => useSesionLocal());
    await act(async () => {});
    expect(result.current).toBeNull();
  });

  it('devuelve la sesión cuando existe en Dexie', async () => {
    await saveSession(LOGIN_MOCK);
    const { result } = renderHook(() => useSesionLocal());
    await act(async () => {});
    expect(result.current?.accessToken).toBe('tok-abc');
    expect(result.current?.usuario.rol).toBe('TECNICO_EVALUADOR');
  });
});
