import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useSesionLocal } from '@/lib/auth/useSesionLocal';

interface Props {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: Props) {
  const sesion = useSesionLocal();

  if (sesion === undefined) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!sesion) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
