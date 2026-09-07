import { Typography } from '@mui/material';

export default function DashboardAdmin() {
  return (
    <>
      <Typography variant="h4" gutterBottom>
        Panel de Administrador
      </Typography>
      <Typography color="text.secondary">
        Acá vas a poder configurar catálogos, parámetros y usuarios del sistema. Todavía no hay
        datos conectados — esta es solo la pantalla base.
      </Typography>
    </>
  );
}
