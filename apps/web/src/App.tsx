import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { SyncProcessor } from '@/lib/sync/processor';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5 } },
});

const theme = createTheme({
  palette: { primary: { main: '#1565C0' } },
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
            <Route path="/" element={<div style={{ padding: 32 }}>EBR — infraestructura lista</div>} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
