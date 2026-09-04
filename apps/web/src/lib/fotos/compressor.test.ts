import { describe, it, expect, vi, beforeAll } from 'vitest';
import { comprimirFoto } from './compressor';

beforeAll(() => {
  (globalThis as any).Image = class {
    onload: (() => void) | null = null;
    width = 1600; height = 1200;
    set src(_: string) { Promise.resolve().then(() => this.onload?.()); }
  };
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
  globalThis.URL.revokeObjectURL = vi.fn();
  (globalThis as any).OffscreenCanvas = class {
    width: number; height: number;
    constructor(w: number, h: number) { this.width = w; this.height = h; }
    getContext() { return { drawImage: vi.fn() }; }
    convertToBlob() { return Promise.resolve(new Blob(['img'], { type: 'image/jpeg' })); }
  };
});

describe('comprimirFoto', () => {
  it('devuelve un Blob de tipo image/jpeg', async () => {
    const file = new File(['bytes'], 'foto.jpg', { type: 'image/jpeg' });
    const blob = await comprimirFoto(file);
    expect(blob.type).toBe('image/jpeg');
  });

  it('escala la imagen 1600x1200 a 800x600', async () => {
    let capturedCanvas: any;
    (globalThis as any).OffscreenCanvas = class {
      width: number; height: number;
      constructor(w: number, h: number) { this.width = w; this.height = h; capturedCanvas = this; }
      getContext() { return { drawImage: vi.fn() }; }
      convertToBlob() { return Promise.resolve(new Blob(['img'], { type: 'image/jpeg' })); }
    };
    await comprimirFoto(new File(['bytes'], 'foto.jpg', { type: 'image/jpeg' }));
    expect(capturedCanvas.width).toBe(800);
    expect(capturedCanvas.height).toBe(600);
  });

  it('no escala si la imagen ya es ≤ 800px', async () => {
    (globalThis as any).Image = class {
      onload: (() => void) | null = null;
      width = 640; height = 480;
      set src(_: string) { Promise.resolve().then(() => this.onload?.()); }
    };
    let capturedCanvas: any;
    (globalThis as any).OffscreenCanvas = class {
      width: number; height: number;
      constructor(w: number, h: number) { this.width = w; this.height = h; capturedCanvas = this; }
      getContext() { return { drawImage: vi.fn() }; }
      convertToBlob() { return Promise.resolve(new Blob(['img'], { type: 'image/jpeg' })); }
    };
    await comprimirFoto(new File(['bytes'], 'foto.jpg', { type: 'image/jpeg' }));
    expect(capturedCanvas.width).toBe(640);
    expect(capturedCanvas.height).toBe(480);
  });
});
