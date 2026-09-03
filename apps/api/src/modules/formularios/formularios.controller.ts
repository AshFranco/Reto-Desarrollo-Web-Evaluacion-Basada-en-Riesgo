import { Controller, Get } from '@nestjs/common';
import { FormulariosService } from './formularios.service';

@Controller({ path: 'formularios', version: '1' })
export class FormulariosController {
  constructor(private readonly formulariosService: FormulariosService) {}

  @Get('vigente')
  obtenerVigente() {
    return this.formulariosService.obtenerVigente();
  }
}
