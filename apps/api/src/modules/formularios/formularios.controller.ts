import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FormulariosService } from './formularios.service';

@ApiTags('Formularios')
@ApiBearerAuth('access-token')
@Controller({ path: 'formularios', version: '1' })
export class FormulariosController {
  constructor(private readonly formulariosService: FormulariosService) {}

  @Get('vigente')
  @ApiOperation({ summary: 'Obtener formulario/ficha BPM vigente con sus bloques y criterios' })
  @ApiResponse({ status: 200, description: 'Estructura completa de la ficha BPM vigente.' })
  obtenerVigente() {
    return this.formulariosService.obtenerVigente();
  }
}
