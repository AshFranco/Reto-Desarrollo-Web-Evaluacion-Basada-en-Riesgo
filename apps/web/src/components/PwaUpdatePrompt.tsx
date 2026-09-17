import { Alert, Button, Snackbar } from '@mui/material';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Muestra un Snackbar cuando el service worker detecta una nueva versión
 * de la app. El técnico puede actualizar de inmediato o cerrar el aviso.
 *
 * registerType:'prompt' en vite.config.ts evita que el SW se active solo:
 * el usuario decide cuándo actualizar, lo cual es crítico si tiene una
 * evaluación en curso que aún no sincronizó.
 */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  function cerrar() {
    setNeedRefresh(false);
  }

  function actualizar() {
    void updateServiceWorker(true);
  }

  return (
    <Snackbar
      open={needRefresh}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        severity="info"
        variant="filled"
        action={
          <>
            <Button
              size="small"
              color="inherit"
              onClick={actualizar}
              sx={{ mr: 1 }}
            >
              Actualizar
            </Button>
            <Button size="small" color="inherit" onClick={cerrar}>
              Cerrar
            </Button>
          </>
        }
      >
        Nueva versión disponible.
      </Alert>
    </Snackbar>
  );
}
