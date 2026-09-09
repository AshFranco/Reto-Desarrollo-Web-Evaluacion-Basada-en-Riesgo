import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import type { EntradaCalculo } from '@ebr/risk-engine';

export function useCatalogoMotor(): Omit<EntradaCalculo, 'respuestas'> | null {
  const [datos, setDatos] = useState<Omit<EntradaCalculo, 'respuestas'> | null>(null);

  useEffect(() => {
    db.catalogo_motor.get(1).then(registro => {
      setDatos(registro?.datos ?? null);
    });
  }, []);

  return datos;
}
