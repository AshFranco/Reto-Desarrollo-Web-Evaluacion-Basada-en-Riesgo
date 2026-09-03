import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller({ path: 'health', version: '1' })
export class HealthController {
  @Public()
  @Get()
  check() {
    // Deliberadamente no expone versión de dependencias, entorno ni detalles
    // internos: solo confirma que el proceso responde.
    return { status: 'ok' };
  }
}
