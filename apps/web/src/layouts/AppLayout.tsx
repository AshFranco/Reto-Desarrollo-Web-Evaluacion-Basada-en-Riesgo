import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Avatar,
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { clearSession, getSession } from '@/lib/auth/session';
import type { UsuarioLocal } from '@/lib/types';

/** Estilo compartido de los ítems de navegación -- ítem activo con fondo teñido, texto/ícono en color primario y una barra de acento a la izquierda. */
const sxItemNav = {
  borderRadius: 2,
  mb: 0.5,
  '&.Mui-selected': {
    bgcolor: (t: Theme) => alpha(t.palette.primary.main, 0.1),
    borderLeft: '3px solid',
    borderLeftColor: 'primary.main',
    pl: '13px',
    '& .MuiListItemIcon-root, & .MuiListItemText-primary': { color: 'primary.main' },
    '&:hover': { bgcolor: (t: Theme) => alpha(t.palette.primary.main, 0.14) },
  },
};

const ANCHO_BARRA_LATERAL = 248;

const RUTA_PRINCIPAL_POR_ROL: Record<string, { ruta: string; etiqueta: string }> = {
  ADMINISTRADOR: { ruta: '/admin', etiqueta: 'Panel de administrador' },
  COORDINADOR: { ruta: '/coordinador', etiqueta: 'Panel de coordinador' },
  TECNICO_EVALUADOR: { ruta: '/tecnico', etiqueta: 'Panel de técnico' },
  ADMINISTRADOR_EMPRESA: { ruta: '/empresa', etiqueta: 'Panel de empresa' },
  USUARIO_DELEGADO: { ruta: '/empresa', etiqueta: 'Panel de empresa' },
};

const ETIQUETA_ROL: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  COORDINADOR: 'Coordinador',
  TECNICO_EVALUADOR: 'Técnico evaluador',
  ADMINISTRADOR_EMPRESA: 'Administrador de empresa',
  USUARIO_DELEGADO: 'Usuario delegado',
};

/**
 * Envuelve cualquier pantalla protegida con una barra lateral fija:
 * logo arriba, navegación según el rol (panel propio + consulta
 * histórica), y una tarjeta de usuario con cerrar sesión abajo. El
 * contenido de cada pantalla se renderiza donde está <Outlet />.
 */
export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [usuario, setUsuario] = useState<UsuarioLocal | null>(null);

  useEffect(() => {
    let cancelado = false;
    getSession().then((sesion) => {
      if (!cancelado) setUsuario(sesion?.usuario ?? null);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  async function cerrarSesion() {
    await clearSession();
    navigate('/login', { replace: true });
  }

  const panelPropio = usuario ? RUTA_PRINCIPAL_POR_ROL[usuario.rol] : null;
  const iniciales = usuario?.nombreCompleto
    ?.split(' ')
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: ANCHO_BARRA_LATERAL,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: ANCHO_BARRA_LATERAL,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Toolbar sx={{ px: 3, py: 2.5, gap: 1.5, bgcolor: (t) => alpha(t.palette.primary.main, 0.04) }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`,
              color: 'primary.contrastText',
            }}
          >
            <ShieldOutlinedIcon fontSize="small" />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="overline" color="primary.main" sx={{ lineHeight: 1.2 }}>
              EBR / BPM
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 500 }}>
              Evaluación basada en riesgo
            </Typography>
          </Box>
        </Toolbar>

        <List sx={{ flex: 1, px: 1.5, py: 1 }}>
          {panelPropio && (
            <ListItemButton
              component={RouterLink}
              to={panelPropio.ruta}
              selected={location.pathname === panelPropio.ruta}
              sx={sxItemNav}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <SpaceDashboardOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={panelPropio.etiqueta}
                primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
              />
            </ListItemButton>
          )}
          <ListItemButton
            component={RouterLink}
            to="/historico"
            selected={location.pathname === '/historico'}
            sx={sxItemNav}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <HistoryOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Consulta histórica"
              primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
            />
          </ListItemButton>
        </List>

        <Divider />

        <Box sx={{ p: 2 }}>
          {usuario && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: '0.85rem' }}>
                {iniciales}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {usuario.nombreCompleto}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {ETIQUETA_ROL[usuario.rol] ?? usuario.rol}
                </Typography>
              </Box>
            </Box>
          )}
          <ListItemButton
            onClick={cerrarSesion}
            sx={{ borderRadius: 2, color: 'text.secondary' }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <LogoutOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Cerrar sesión" primaryTypographyProps={{ variant: 'body2' }} />
          </ListItemButton>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flex: 1, padding: { xs: 2.5, md: 4 } }}>
        <Outlet />
      </Box>
    </Box>
  );
}
