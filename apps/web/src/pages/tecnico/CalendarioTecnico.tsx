import { Box, Typography } from '@mui/material';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import { CalendarioEvaluador } from '@/components/calendario/CalendarioEvaluador';
import { PageHeader } from '@/components/ui/PageHeader';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { useSesion } from '@/lib/auth/useSesion';

/** Pantalla "Mi calendario" del técnico evaluador (RF-11). */
export default function CalendarioTecnico() {
  const { sesion, cargando } = useSesion();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader etiqueta="Técnico evaluador" titulo="Mi calendario" icono={<CalendarMonthOutlinedIcon />} />
      <Typography variant="body2" color="text.secondary" sx={{ mt: -1.5 }}>
        Sus evaluaciones programadas por día, semana o mes. Toque una evaluación para abrirla.
      </Typography>
      {cargando || !sesion ? <EstadoCarga /> : <CalendarioEvaluador evaluadorId={sesion.usuario.id} />}
    </Box>
  );
}
