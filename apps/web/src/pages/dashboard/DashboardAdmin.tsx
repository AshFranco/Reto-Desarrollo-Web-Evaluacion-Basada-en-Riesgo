import { Box, Paper, Typography } from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import { PageHeader } from '@/components/ui/PageHeader';

export default function DashboardAdmin() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader etiqueta="Administración" titulo="Panel de administrador" icono={<AdminPanelSettingsOutlinedIcon />} />

      <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>
        <SettingsOutlinedIcon sx={{ fontSize: 40, opacity: 0.4, mb: 1 }} />
        <Typography variant="body2">
          Acá vas a poder configurar catálogos, parámetros y usuarios del sistema. Todavía no hay
          datos conectados — esta es solo la pantalla base.
        </Typography>
      </Paper>
    </Box>
  );
}
