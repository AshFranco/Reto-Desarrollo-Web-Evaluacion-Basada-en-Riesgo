import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import { useQueryClient } from '@tanstack/react-query';
import { clearSession, getSession } from '@/lib/auth/session';
import { useSyncStatus } from '@/lib/sync/useSyncStatus';
import { useFotoPerfil } from '@/lib/perfil/useFotoPerfil';
import type { UsuarioLocal } from '@/lib/types';
import { DialogPerfil } from '@/pages/perfil/DialogPerfil';


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
 * Envuelve cualquier pantalla protegida con barra de navegación:
 * en escritorio barra lateral fija, y en móvil (360px+) barra superior con
 * drawer desplegable para garantizar el 100% del ancho útil al contenido.
 */
export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [usuario, setUsuario] = useState<UsuarioLocal | null>(null);
  const [anchorMenuUsuario, setAnchorMenuUsuario] = useState<null | HTMLElement>(null);
  const [abrirPerfil, setAbrirPerfil] = useState(false);

  useEffect(() => {
    let cancelado = false;
    getSession().then((sesion) => {
      if (!cancelado) setUsuario(sesion?.usuario ?? null);
    });
    return () => {
      cancelado = true;
    };
  }, [location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  async function cerrarSesion() {
    queryClient.clear();
    await clearSession();
    navigate('/login', { replace: true });
  }

  function abrirMenuUsuario(event: React.MouseEvent<HTMLElement>) {
    setAnchorMenuUsuario(event.currentTarget);
  }

  function cerrarMenuUsuario() {
    setAnchorMenuUsuario(null);
  }

  async function handleAbrirPerfil() {
    cerrarMenuUsuario();
    const sesion = await getSession();
    if (sesion?.usuario) {
      setUsuario(sesion.usuario);
    }
    setAbrirPerfil(true);
  }

  const panelPropio = usuario ? RUTA_PRINCIPAL_POR_ROL[usuario.rol] : null;
  const [fotoPerfil] = useFotoPerfil(usuario?.id);
  const iniciales = usuario?.nombreCompleto
    ?.split(' ')
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();


  const contenidoDrawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
            onClick={() => setMobileOpen(false)}
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
        {usuario?.rol !== 'TECNICO_EVALUADOR' && (
          <ListItemButton
            component={RouterLink}
            to="/historico"
            selected={location.pathname === '/historico'}
            sx={sxItemNav}
            onClick={() => setMobileOpen(false)}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <HistoryOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={
                usuario?.rol === 'ADMINISTRADOR_EMPRESA' || usuario?.rol === 'USUARIO_DELEGADO'
                  ? 'Histórico de solicitudes'
                  : 'Consulta histórica'
              }
              primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
            />
          </ListItemButton>
        )}
      </List>

      <Divider />

      <Box sx={{ p: 2 }}>
        {usuario && (
          <Tooltip title="Abrir opciones de cuenta" placement="top">
            <Box
              onClick={abrirMenuUsuario}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1,
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'background-color 0.15s',
                '&:hover': { bgcolor: (t: Theme) => alpha(t.palette.primary.main, 0.07) },
              }}
            >
              <Avatar
                src={fotoPerfil ?? undefined}
                sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: '0.85rem' }}
              >
                {iniciales}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {usuario.nombreCompleto}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {ETIQUETA_ROL[usuario.rol] ?? usuario.rol}
                </Typography>
              </Box>
            </Box>
          </Tooltip>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: { xs: 'column', md: 'row' } }}>
      {/* Barra superior solo visible en pantallas móviles (< md) */}

      {isMobile && (
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            color: 'text.primary',
          }}
        >
          <Toolbar sx={{ px: { xs: 1.5, sm: 2 }, gap: 1.5 }}>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="abrir menú"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <MenuOutlinedIcon />
            </IconButton>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`,
                color: 'primary.contrastText',
              }}
            >
              <ShieldOutlinedIcon sx={{ fontSize: '1.2rem' }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ flexGrow: 1, lineHeight: 1.2 }}>
              EBR / BPM
            </Typography>
            {usuario && (
              <Tooltip title="Opciones de cuenta">
                <IconButton size="small" onClick={abrirMenuUsuario} sx={{ p: 0 }}>
                  <Avatar
                    src={fotoPerfil ?? undefined}
                    sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: '0.75rem' }}
                  >
                    {iniciales}
                  </Avatar>
                </IconButton>
              </Tooltip>
            )}

          </Toolbar>
        </AppBar>
      )}

      {/* Drawer móvil (temporary) */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            [`& .MuiDrawer-paper`]: {
              width: ANCHO_BARRA_LATERAL,
              boxSizing: 'border-box',
            },
          }}
        >
          {contenidoDrawer}
        </Drawer>
      ) : (
        /* Drawer escritorio (permanent) */
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            width: ANCHO_BARRA_LATERAL,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: ANCHO_BARRA_LATERAL,
              boxSizing: 'border-box',
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          {contenidoDrawer}
        </Drawer>
      )}

      {/* Área principal con 100% de ancho útil a 360px */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          width: '100%',
          overflowX: 'hidden',
          padding: { xs: 1.5, sm: 2.5, md: 4 },
        }}
      >
        <Outlet />
      </Box>

      {/* ── Menú desplegable de cuenta ── */}
      <Menu
        anchorEl={anchorMenuUsuario}
        open={Boolean(anchorMenuUsuario)}
        onClose={cerrarMenuUsuario}
        transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
        PaperProps={{ sx: { minWidth: 200, borderRadius: 2, mt: -1 } }}
      >
        {usuario && (
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={fotoPerfil ?? undefined}
              sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: '0.85rem' }}
            >
              {iniciales}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" fontWeight={700} noWrap>
                {usuario.nombreCompleto}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {ETIQUETA_ROL[usuario.rol] ?? usuario.rol}
              </Typography>
            </Box>
          </Box>
        )}

        <MenuItem onClick={handleAbrirPerfil} sx={{ gap: 1.5, py: 1.25 }}>
          <PersonOutlinedIcon fontSize="small" color="action" />
          <Typography variant="body2">Mi perfil</Typography>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => { cerrarMenuUsuario(); void cerrarSesion(); }}
          sx={{ gap: 1.5, py: 1.25, color: 'error.main' }}
        >
          <LogoutOutlinedIcon fontSize="small" />
          <Typography variant="body2">Cerrar sesión</Typography>
        </MenuItem>
      </Menu>

      {/* ── Diálogo de perfil ── */}
      {usuario && (
        <DialogPerfil
          open={abrirPerfil}
          onClose={() => setAbrirPerfil(false)}
          rolActivo={usuario.rol}
          usuarioSesion={usuario}
        />
      )}

    </Box>
  );
}
