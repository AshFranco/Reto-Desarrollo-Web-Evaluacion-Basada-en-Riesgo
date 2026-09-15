import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { SyncProcessor } from '@/lib/sync/processor';
import { PwaUpdatePrompt } from '@/components/PwaUpdatePrompt';
import { theme } from '@/theme';
import Login from '@/pages/Login';
import RestablecerContrasena from '@/pages/RestablecerContrasena';
import NoAutorizado from '@/pages/NoAutorizado';
import { RoleRoute } from '@/routes/RoleRoute';
import { AppLayout } from '@/layouts/AppLayout';
import DashboardAdmin from '@/pages/dashboard/DashboardAdmin';
import DashboardCoordinador from '@/pages/dashboard/DashboardCoordinador';
import DashboardTecnico from '@/pages/dashboard/DashboardTecnico';
import EjecutarEvaluacion from '@/pages/tecnico/EjecutarEvaluacion';
import DashboardEmpresa from '@/pages/dashboard/DashboardEmpresa';
import FormularioSolicitud from '@/pages/empresa/FormularioSolicitud';
import FormularioEstablecimiento from '@/pages/empresa/FormularioEstablecimiento';
import ConsultaHistorica from '@/pages/historico/ConsultaHistorica';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      staleTime: 1000 * 60 * 5,
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes('429')) return false;
        return failureCount < 2;
      },
    },
  },
});

const processor = new SyncProcessor();

export default function App() {
  useEffect(() => {
    processor.iniciar();
    return () => processor.detener();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />
            <Route path="/no-autorizado" element={<NoAutorizado />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            <Route element={<RoleRoute rolesPermitidos={['ADMINISTRADOR']} />}>
              <Route element={<AppLayout />}>
                <Route path="/admin" element={<DashboardAdmin />} />
              </Route>
            </Route>

            <Route element={<RoleRoute rolesPermitidos={['COORDINADOR']} />}>
              <Route element={<AppLayout />}>
                <Route path="/coordinador" element={<DashboardCoordinador />} />
              </Route>
            </Route>

            <Route element={<RoleRoute rolesPermitidos={['TECNICO_EVALUADOR']} />}>
              <Route element={<AppLayout />}>
                <Route path="/tecnico" element={<DashboardTecnico />} />
                <Route path="/tecnico/evaluaciones/:evaluacionId" element={<EjecutarEvaluacion />} />
              </Route>
            </Route>

            <Route element={<RoleRoute rolesPermitidos={['ADMINISTRADOR_EMPRESA', 'USUARIO_DELEGADO']} />}>
              <Route element={<AppLayout />}>
                <Route path="/empresa" element={<DashboardEmpresa />} />
                <Route path="/empresa/solicitudes/nueva" element={<FormularioSolicitud />} />
                <Route path="/empresa/establecimientos/nuevo" element={<FormularioEstablecimiento />} />
                <Route path="/empresa/establecimientos/:id/editar" element={<FormularioEstablecimiento />} />
              </Route>
            </Route>

            <Route
              element={
                <RoleRoute
                  rolesPermitidos={[
                    'ADMINISTRADOR',
                    'COORDINADOR',
                    'TECNICO_EVALUADOR',
                    'ADMINISTRADOR_EMPRESA',
                    'USUARIO_DELEGADO',
                  ]}
                />
              }
            >
              <Route element={<AppLayout />}>
                <Route path="/historico" element={<ConsultaHistorica />} />
              </Route>
            </Route>
          </Routes>
        <PwaUpdatePrompt />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
