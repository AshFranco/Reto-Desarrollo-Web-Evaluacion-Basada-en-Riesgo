import { useState } from 'react';
import {
  Badge,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Tooltip,
  Divider,
} from '@mui/material';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import CircleIcon from '@mui/icons-material/Circle';
import { useNotificaciones, useMarcarLeida } from '@/lib/notificaciones/useNotificaciones';
import { useQueryClient } from '@tanstack/react-query';

const formatoRelativo = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

/** Evita depender de date-fns (no está entre las dependencias del proyecto) para un formato "hace X". */
function tiempoRelativo(fechaIso: string): string {
  const diffMin = Math.round((new Date(fechaIso).getTime() - Date.now()) / 60000);
  if (Math.abs(diffMin) < 60) return formatoRelativo.format(diffMin, 'minute');
  const diffHoras = Math.round(diffMin / 60);
  if (Math.abs(diffHoras) < 24) return formatoRelativo.format(diffHoras, 'hour');
  return formatoRelativo.format(Math.round(diffHoras / 24), 'day');
}

export function NotificacionesMenu() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { data: notificaciones, isLoading } = useNotificaciones();
  const marcarLeidaMutation = useMarcarLeida();
  const queryClient = useQueryClient();

  const noLeidas = notificaciones?.filter((n) => !n.leida).length ?? 0;

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarcarLeida = (id: string, leida: boolean) => {
    if (!leida) {
      marcarLeidaMutation.mutate(id);
    }
  };

  return (
    <>
      <Tooltip title="Notificaciones">
        <IconButton size="small" onClick={handleClick} sx={{ p: 1, mr: 1 }}>
          <Badge badgeContent={noLeidas} color="error">
            <NotificationsOutlinedIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{ sx: { minWidth: 320, maxWidth: 360, borderRadius: 2, mt: 1, maxHeight: 400 } }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Notificaciones
          </Typography>
        </Box>
        <Divider />
        
        {isLoading && (
          <MenuItem disabled>Cargando...</MenuItem>
        )}

        {!isLoading && notificaciones?.length === 0 && (
          <MenuItem disabled sx={{ py: 3, justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">No tienes notificaciones recientes.</Typography>
          </MenuItem>
        )}

        {!isLoading && notificaciones && notificaciones.length > 0 && notificaciones.map((n) => (
          <MenuItem 
            key={n.id} 
            onClick={() => handleMarcarLeida(n.id, n.leida)}
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'flex-start',
              whiteSpace: 'normal',
              py: 1.5,
              px: 2,
              gap: 0.5,
              bgcolor: n.leida ? 'transparent' : 'action.hover'
            }}
          >
            <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', gap: 1 }}>
              <Typography variant="subtitle2" fontWeight={n.leida ? 500 : 700} sx={{ lineHeight: 1.2 }}>
                {n.titulo}
              </Typography>
              {!n.leida && <CircleIcon color="primary" sx={{ fontSize: 10, mt: 0.5 }} />}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {n.mensaje}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              {tiempoRelativo(n.fechaCreacion)}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
