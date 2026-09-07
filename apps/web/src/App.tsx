import { lazy, Suspense, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider, createTheme, CircularProgress, Box } from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SyncProcessor } from '@/lib/sync/processor';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const LoginPage = lazy(() => import('@/pages/LoginPage'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5 } },
});

const theme = createTheme({
  palette: { primary: { main: '#1565C0' } },
});

const processor = new SyncProcessor();

const PageLoader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
    <CircularProgress />
  </Box>
);

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
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/app/*"
                element={
                  <ProtectedRoute>
                    {/* Jorge construye las sub-rutas aquí */}
                    <Box sx={{ p: 4 }}>
                      <div>Panel EBR — rutas de la aplicación pendientes</div>
                    </Box>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
