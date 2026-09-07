import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import type { CatalogoMotorLocal } from '@/lib/db';

export function useCatalogoMotor(): CatalogoMotorLocal | null {
  const [catalogo, setCatalogo] = useState<CatalogoMotorLocal | null>(null);

  useEffect(() => {
    db.catalogo_motor.get(1).then((c) => setCatalogo(c ?? null));
  }, []);

  return catalogo;
}
