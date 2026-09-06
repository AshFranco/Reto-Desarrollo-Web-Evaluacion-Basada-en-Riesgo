import { Typography } from '@mui/material';

export default function DashboardTecnico() {
  return (
    <>
      <Typography variant="h4" gutterBottom>
        Panel de Técnico Evaluador
      </Typography>
      <Typography color="text.secondary">
        Acá vas a ver tus evaluaciones asignadas, tu calendario de inspecciones y el estado de
        sincronización de tus datos offline. Todavía no hay datos conectados — esta es solo la
        pantalla base.
      </Typography>
    </>
  );
}
