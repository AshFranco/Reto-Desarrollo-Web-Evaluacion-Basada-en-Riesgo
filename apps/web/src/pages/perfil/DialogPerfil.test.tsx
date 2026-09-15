import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DialogPerfil } from './DialogPerfil';

const mockPerfil = {
  id: '1',
  nombreCompleto: 'María Mercedes Gómez',
  correoElectronico: 'maria@ejemplo.com',
  telefono: '809-555-1234',
  roles: ['TECNICO_EVALUADOR'],
  idEmpresa: null,
  dobleFactorActivo: false,
};

const mockCambiar = vi.fn();
const mockSincronizar = vi.fn();
const mockRefetch = vi.fn();

vi.mock('@/lib/perfil/usePerfil', () => ({
  usePerfil: () => ({
    perfil: mockPerfil,
    cargando: false,
    error: null,
    refetch: mockRefetch,
  }),
}));

vi.mock('@/lib/perfil/useCambiarContrasena', () => ({
  useCambiarContrasena: () => ({
    cambiar: mockCambiar,
    cargando: false,
    error: null,
    exito: false,
    resetExito: vi.fn(),
    reset: vi.fn(),
  }),
}));

let mockSyncState = {
  enLinea: true,
  pendientes: 2,
  sincronizando: false,
  ultimaSync: null,
};

vi.mock('@/lib/sync/useSyncStatus', () => ({
  useSyncStatus: () => ({
    ...mockSyncState,
    sincronizar: mockSincronizar,
  }),
}));

const mockActualizarPerfil = vi.fn();
vi.mock('@/lib/perfil/useActualizarPerfil', () => ({
  useActualizarPerfil: () => ({
    mutate: mockActualizarPerfil,
    mutateAsync: mockActualizarPerfil,
    isPending: false,
    error: null,
  }),
}));

const mockGenerarQr = vi.fn().mockResolvedValue({
  secreto: 'JBSWY3DPEHPK3PXP',
  qrCode: 'data:image/png;base64,mockqr',
  otpauthUrl: 'otpauth://totp/mock',
  correo: 'maria@ejemplo.com',
  dobleFactorActivo: false,
});
const mockActivar2Fa = vi.fn().mockResolvedValue({ ok: true });
const mockDesactivar2Fa = vi.fn().mockResolvedValue({ ok: true });

vi.mock('@/lib/perfil/use2Fa', () => ({
  use2Fa: () => ({
    generarQr: mockGenerarQr,
    activar: mockActivar2Fa,
    estaActivando: false,
    errorActivar: null,
    desactivar: mockDesactivar2Fa,
    estaDesactivando: false,
    errorDesactivar: null,
  }),
}));

function renderConProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('DialogPerfil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza la información del usuario en la pestaña Información', () => {
    renderConProviders(<DialogPerfil open={true} onClose={vi.fn()} rolActivo="TECNICO_EVALUADOR" />);

    expect(screen.getByText('Mi perfil')).toBeInTheDocument();
    expect(screen.getByText('María Mercedes Gómez')).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo electrónico institucional/i)).toHaveValue('maria@ejemplo.com');
    expect(screen.getByLabelText(/Teléfono de contacto/i)).toHaveValue('809-555-1234');
    expect(screen.getAllByText('Técnico Evaluador').length).toBeGreaterThanOrEqual(1);
  });

  it('permite cambiar a la pestaña Seguridad y muestra el formulario de cambio de contraseña', () => {
    renderConProviders(<DialogPerfil open={true} onClose={vi.fn()} rolActivo="TECNICO_EVALUADOR" />);

    const tabSeguridad = screen.getByRole('tab', { name: /Seguridad/i });
    fireEvent.click(tabSeguridad);

    expect(screen.getByText('Contraseña de acceso')).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña actual/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Nueva contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirmar nueva contraseña/i)).toBeInTheDocument();
  });

  it('muestra la sección de Estado de la aplicación para TECNICO_EVALUADOR en Seguridad', () => {
    renderConProviders(<DialogPerfil open={true} onClose={vi.fn()} rolActivo="TECNICO_EVALUADOR" />);

    const tabSeguridad = screen.getByRole('tab', { name: /Seguridad/i });
    fireEvent.click(tabSeguridad);

    expect(screen.getByText('Disponibilidad de la aplicación en campo')).toBeInTheDocument();
    expect(screen.getByText('En línea')).toBeInTheDocument();
    expect(screen.getByText(/Evaluaciones pendientes de sincronización/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sincronizar ahora/i })).toBeInTheDocument();
  });

  it('no muestra la sección de Estado de la aplicación para roles de empresa o coordinador', () => {
    renderConProviders(<DialogPerfil open={true} onClose={vi.fn()} rolActivo="ADMINISTRADOR_EMPRESA" />);

    const tabSeguridad = screen.getByRole('tab', { name: /Seguridad/i });
    fireEvent.click(tabSeguridad);

    expect(screen.getByText('Contraseña de acceso')).toBeInTheDocument();
    expect(screen.queryByText('Disponibilidad de la aplicación en campo')).not.toBeInTheDocument();
  });

  it('invoca onClose al hacer clic en el botón cerrar', () => {
    const mockClose = vi.fn();
    renderConProviders(<DialogPerfil open={true} onClose={mockClose} rolActivo="ADMINISTRADOR" />);

    const botonCerrar = screen.getByLabelText('cerrar');
    fireEvent.click(botonCerrar);

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('en modo sin conexión, muestra los datos de sesión local y aviso de modo offline', () => {
    mockSyncState.enLinea = false;

    renderConProviders(
      <DialogPerfil
        open={true}
        onClose={vi.fn()}
        rolActivo="TECNICO_EVALUADOR"
        usuarioSesion={{
          id: '1',
          nombreCompleto: 'María Mercedes Gómez',
          rol: 'TECNICO_EVALUADOR',
          empresaId: null,
        }}
      />
    );

    expect(screen.getByText(/Modo sin conexión: mostrando datos de sesión guardados en este dispositivo/i)).toBeInTheDocument();
    expect(screen.getByText('María Mercedes Gómez')).toBeInTheDocument();

    mockSyncState.enLinea = true;
  });

  it('en modo sin conexión, deshabilita el cambio de contraseña y muestra advertencia', () => {
    mockSyncState.enLinea = false;

    renderConProviders(<DialogPerfil open={true} onClose={vi.fn()} rolActivo="ADMINISTRADOR" />);

    const tabSeguridad = screen.getByRole('tab', { name: /Seguridad/i });
    fireEvent.click(tabSeguridad);

    expect(screen.getByText(/Conéctate a internet para cambiar tu contraseña/i)).toBeInTheDocument();
    const botonActualizar = screen.getByRole('button', { name: /Actualizar contraseña/i });
    expect(botonActualizar).toBeDisabled();

    mockSyncState.enLinea = true;
  });

  it('muestra la sección de verificación en dos pasos (Google Authenticator) y abre modal de configuración', async () => {
    renderConProviders(<DialogPerfil open={true} onClose={vi.fn()} rolActivo="ADMINISTRADOR" />);

    const tabSeguridad = screen.getByRole('tab', { name: /Seguridad/i });
    fireEvent.click(tabSeguridad);

    expect(screen.getByText(/Verificación en dos pasos \(Google Authenticator\)/i)).toBeInTheDocument();
    const botonConfigurar = screen.getByRole('button', { name: /Configurar Google Authenticator/i });
    expect(botonConfigurar).toBeInTheDocument();

    fireEvent.click(botonConfigurar);
    expect(mockGenerarQr).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText(/Paso 1: Escanea este código QR/i)).toBeInTheDocument();
    });
  });

  it('permite editar el teléfono y guardar los cambios con el botón general en la pestaña Información', () => {
    renderConProviders(<DialogPerfil open={true} onClose={vi.fn()} rolActivo="ADMINISTRADOR" />);

    const inputTel = screen.getByLabelText(/Teléfono de contacto/i);
    expect(inputTel).toBeInTheDocument();
    fireEvent.change(inputTel, { target: { value: '809-555-9999' } });

    const botonGuardar = screen.getByRole('button', { name: /Guardar cambios/i });
    expect(botonGuardar).toBeInTheDocument();
    fireEvent.submit(botonGuardar.closest('form')!);

    expect(mockActualizarPerfil).toHaveBeenCalledWith({ telefono: '809-555-9999' });
  });

  it('aísla los datos del perfil y no muestra datos cacheados de otro usuario si el id no coincide', () => {
    // mockPerfil tiene id: '1' y nombre: 'María Mercedes Gómez'
    renderConProviders(
      <DialogPerfil
        open={true}
        onClose={vi.fn()}
        rolActivo="ADMINISTRADOR"
        usuarioSesion={{
          id: 'usuario-admin-99',
          nombreCompleto: 'Admin Supremo',
          rol: 'ADMINISTRADOR',
          empresaId: null,
        }}
      />
    );

    // Debe mostrar los datos del usuario de la sesión activa, no del perfil cacheado discrepante
    expect(screen.getByText('Admin Supremo')).toBeInTheDocument();
    expect(screen.queryByText('María Mercedes Gómez')).not.toBeInTheDocument();
  });
});
