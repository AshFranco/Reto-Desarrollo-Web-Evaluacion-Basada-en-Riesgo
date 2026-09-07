import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { isTokenValid } from '@/lib/auth/session';
import { silentRefresh } from '@/lib/auth/refresh';

/**
 * Envuelve las rutas que requieren sesión. Verifica isTokenValid(); si el
 * token ya venció, intenta silentRefresh() antes de decidir. Si tampoco así
 * hay sesión válida, redirige a /login.
 */
export function ProtectedRoute() {
  const [verificando, setVerificando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function verificar() {
      let valido = await isTokenValid();
      if (!valido) valido = await silentRefresh();
      if (!cancelado) {
        setAutenticado(valido);
        setVerificando(false);
      }
    }

    verificar();
    return () => {
      cancelado = true;
    };
  }, []);

  if (verificando) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', padding: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!autenticado) return <Navigate to="/login" replace />;

  return <Outlet />;
}
