import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LogoSinec } from './LogoSinec';

describe('LogoSinec', () => {
  it('muestra el logotipo completo con texto alternativo accesible', () => {
    render(<LogoSinec />);
    expect(screen.getByAltText('SINEC — Sistema de Evaluación y BPM')).toBeInTheDocument();
  });

  it('no muestra subtítulo si no se indica', () => {
    const { container } = render(<LogoSinec />);
    expect(container.querySelector('.MuiTypography-root')).toBeNull();
  });

  it('muestra el subtítulo propio de la pantalla cuando se indica', () => {
    render(<LogoSinec subtitulo="Portal ciudadano de denuncias" />);
    expect(screen.getByText('Portal ciudadano de denuncias')).toBeInTheDocument();
  });
});
