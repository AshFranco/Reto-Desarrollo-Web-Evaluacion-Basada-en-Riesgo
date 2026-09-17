import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { getSession, isTokenValid } from '@/lib/auth/session';
import { silentRefresh } from '@/lib/auth/refresh';

interface RoleRouteProps {
  rolesPermitidos: string[];
}

/**
 * Hace lo mismo que ProtectedRoute (verificar sesión, con intento de
 * renovación silenciosa) y además exige que el rol del usuario esté en
 * rolesPermitidos. Es autosuficiente a propósito — no depende de estar
 * anidado dentro de ProtectedRoute — así que repite esa parte de la
 * verificación en vez de reusar el componente existente; se hizo así para
 * no tocar ProtectedRoute.tsx, que ya está construido y probado.
 *
 * Si no hay sesión válida → /login.
 * Si hay sesión válida pero el rol no está permitido → /no-autorizado.
 */
export function RoleRoute({ rolesPermitidos }: RoleRouteProps) {
  const [verificando, setVerificando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);
  const [rolAutorizado, setRolAutorizado] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function verificar() {
      let valido = await isTokenValid();
      if (!valido) valido = await silentRefresh();

      let autorizado = false;
      if (valido) {
        const sesion = await getSession();
        autorizado = !!sesion && rolesPermitidos.includes(sesion.usuario.rol);
      }

      if (!cancelado) {
        setAutenticado(valido);
        setRolAutorizado(autorizado);
        setVerificando(false);
      }
    }

    verificar();
    return () => {
      cancelado = true;
    };
    // rolesPermitidos se pasa como array literal en cada render (App.tsx);
    // se usa .join(',') como clave estable para no re-disparar el efecto
    // por una referencia de array nueva con el mismo contenido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolesPermitidos.join(',')]);

  if (verificando) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', padding: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!autenticado) return <Navigate to="/login" replace />;
  if (!rolAutorizado) return <Navigate to="/no-autorizado" replace />;

  return <Outlet />;
}
