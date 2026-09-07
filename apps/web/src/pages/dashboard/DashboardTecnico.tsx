import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardActions, CardContent,
  CircularProgress, Divider, Typography,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { useAsignaciones } from '@/lib/tecnico/useAsignaciones';

export default function DashboardTecnico() {
  const navigate = useNavigate();
  const { data: asignaciones, isLoading, isError } = useAsignaciones();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Mis evaluaciones asignadas
      </Typography>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          No se pudieron cargar las asignaciones. Verifica tu conexión.
        </Alert>
      )}

      {asignaciones?.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No tienes evaluaciones asignadas en este momento.
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
        {asignaciones?.map((a) => (
          <Card key={a.id} variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AssignmentIcon color="primary" />
                <Typography variant="h6">{a.caso.establecimiento.nombre}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {a.caso.establecimiento.calle}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Asignado el {new Date(a.fechaAsignacion).toLocaleDateString('es-DO')}
                {' · '}Caso #{a.idCaso}
              </Typography>
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2 }}>
              <Button
                variant="contained"
                size="small"
                onClick={() => navigate(`/tecnico/evaluacion/${a.id}?serverId=${a.idCaso}`)}
              >
                Iniciar / continuar evaluación
              </Button>
            </CardActions>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
