import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import { clearSession, getSession } from '@/lib/auth/session';
import type { UsuarioLocal } from '@/lib/types';

/**
 * Envuelve cualquier pantalla protegida con una barra superior simple:
 * nombre del usuario logueado + botón de cerrar sesión. El contenido de
 * cada pantalla se renderiza donde está <Outlet />.
 */
export function AppLayout() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<UsuarioLocal | null>(null);

  useEffect(() => {
    let cancelado = false;
    getSession().then((sesion) => {
      if (!cancelado) setUsuario(sesion?.usuario ?? null);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  async function cerrarSesion() {
    await clearSession();
    navigate('/login', { replace: true });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div">
            EBR — Evaluación Basada en Riesgo
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {usuario && <Typography variant="body2">{usuario.nombreCompleto}</Typography>}
            <Button color="inherit" onClick={cerrarSesion}>
              Cerrar sesión
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flex: 1, padding: 3 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
