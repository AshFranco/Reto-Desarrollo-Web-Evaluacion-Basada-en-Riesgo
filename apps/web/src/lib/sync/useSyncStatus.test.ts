import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { db } from '@/lib/db';
import { enqueue } from './queue';
import { useSyncStatus } from './useSyncStatus';

beforeEach(() => db.open());
afterEach(() => db.delete());

describe('useSyncStatus', () => {
  it('pendientes empieza en 0 con cola vacía', async () => {
    const { result } = renderHook(() => useSyncStatus());
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    expect(result.current.pendientes).toBe(0);
  });

  it('pendientes aumenta al encolar una operación', async () => {
    await enqueue('RESPUESTAS', {});
    const { result } = renderHook(() => useSyncStatus());
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    expect(result.current.pendientes).toBe(1);
  });

  it('enLinea refleja navigator.onLine', () => {
    const { result } = renderHook(() => useSyncStatus());
    expect(result.current.enLinea).toBe(navigator.onLine);
  });
});
