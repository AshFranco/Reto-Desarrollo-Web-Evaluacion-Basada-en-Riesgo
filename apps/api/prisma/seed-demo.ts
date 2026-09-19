import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env') });
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Sembrando datos de prueba para QA...');

  const defaultPassword = 'Admin123456*';
  const hash = await argon2.hash(defaultPassword, { type: argon2.argon2id });

  // 1. Roles
  const rolAdmin = await prisma.rol.findUniqueOrThrow({ where: { codigo: 'ADMINISTRADOR' } });
  const rolCoord = await prisma.rol.findUniqueOrThrow({ where: { codigo: 'COORDINADOR' } });
  const rolTecnico = await prisma.rol.findUniqueOrThrow({ where: { codigo: 'TECNICO_EVALUADOR' } });
  const rolEmpresa = await prisma.rol.findUniqueOrThrow({ where: { codigo: 'ADMINISTRADOR_EMPRESA' } });
  const rolDelegado = await prisma.rol.findUniqueOrThrow({ where: { codigo: 'USUARIO_DELEGADO' } });

  // 2. Versiones de Ficha y Matriz
  const versionFicha = await prisma.versionFicha.findFirst({ where: { estado: 'Activa' } });
  const versionMatriz = await prisma.versionMatrizRiesgo.findFirst({ where: { estado: 'Activa' } });
  if (!versionFicha || !versionMatriz) {
    throw new Error('Ficha o Matriz no sembradas. Ejecute npm run prisma:seed primero.');
  }

  // 3. Estados y Orígenes
  const estadoProgramada = await prisma.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: 'PROGRAMADA' } });
  const estadoEnCurso = await prisma.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: 'EN_CURSO' } });
  const estadoEnRevision = await prisma.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: 'EN_REVISION' } });
  const estadoAprobada = await prisma.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: 'APROBADA' } });
  const estadoDevuelta = await prisma.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: 'DEVUELTA' } });
  const estadoCerrada = await prisma.estadoEvaluacion.findUniqueOrThrow({ where: { codigo: 'CERRADA' } });
  const origenSolicitud = await prisma.origenCaso.findUniqueOrThrow({ where: { codigo: 'SOLICITUD' } });
  const origenProg = await prisma.origenCaso.findUniqueOrThrow({ where: { codigo: 'PROGRAMACION' } });


  // 4. Empresa de Prueba
  const empresa = await prisma.empresa.upsert({
    where: { rnc: '130000001' },
    update: {},
    create: {
      razonSocial: 'Alimentos del Caribe SRL',
      rnc: '130000001',
      nombreComercial: 'Del Caribe Foods',
      direccion: 'Av. John F. Kennedy #45, Santo Domingo',
      telefono: '809-555-0100',
      correo: 'contacto@alimentoscaribe.com',
      actividadEconomica: 'Elaboración de productos alimenticios',
    },
  });

  // 5. Establecimientos de Prueba
  let est1 = await prisma.establecimiento.findFirst({
    where: { nombre: 'Planta de Conservas Santo Domingo', idEmpresa: empresa.id },
  });
  if (!est1) {
    est1 = await prisma.establecimiento.create({
      data: {
        idEmpresa: empresa.id,
        nombre: 'Planta de Conservas Santo Domingo',
        calle: 'Av. Luperón Km 2, Zona Industrial de Herrera',
        telefono: '809-555-0101',
        correo: 'planta.sd@alimentoscaribe.com',
        produccionAnual: 50000,
        activo: true,
      },
    });
  }

  let est2 = await prisma.establecimiento.findFirst({
    where: { nombre: 'Distribuidora Cibao Central', idEmpresa: empresa.id },
  });
  if (!est2) {
    est2 = await prisma.establecimiento.create({
      data: {
        idEmpresa: empresa.id,
        nombre: 'Distribuidora Cibao Central',
        calle: 'Autopista Duarte Km 5, Santiago',
        telefono: '809-555-0102',
        correo: 'cibao@alimentoscaribe.com',
        produccionAnual: 30000,
        activo: true,
      },
    });
  }

  // 5.1 Asociar categorías de alimentos a los establecimientos
  const subcat = await prisma.subcategoriaAlimento.findFirst({
    include: { nivelResultante: true },
    orderBy: { id: 'asc' },
  });
  if (subcat) {
    const existeEst1 = await prisma.establecimientoCategoria.findFirst({
      where: { idEstablecimiento: est1.id, idSubcategoriaAlimento: subcat.id },
    });
    if (!existeEst1) {
      await prisma.establecimientoCategoria.create({
        data: { idEstablecimiento: est1.id, idSubcategoriaAlimento: subcat.id },
      });
    }

    const existeEst2 = await prisma.establecimientoCategoria.findFirst({
      where: { idEstablecimiento: est2.id, idSubcategoriaAlimento: subcat.id },
    });
    if (!existeEst2) {
      await prisma.establecimientoCategoria.create({
        data: { idEstablecimiento: est2.id, idSubcategoriaAlimento: subcat.id },
      });
    }
  }

  // 6. Usuarios Demo

  // Coordinador
  const coord = await prisma.usuario.upsert({
    where: { correoElectronico: 'coordinador@digemaps.gob.do' },
    update: { contrasenaHash: hash, estado: 'APROBADO', intentosFallidos: 0, bloqueadoHasta: null },
    create: {
      nombreCompleto: 'Laura Gómez (Coordinadora)',
      cedulaPasaporte: '001-2000000-1',
      correoElectronico: 'coordinador@digemaps.gob.do',
      contrasenaHash: hash,
      estado: 'APROBADO',
      roles: { create: { idRol: rolCoord.id } },
    },
  });

  // Técnico Evaluador
  const tecnico = await prisma.usuario.upsert({
    where: { correoElectronico: 'tecnico@digemaps.gob.do' },
    update: { contrasenaHash: hash, estado: 'APROBADO', intentosFallidos: 0, bloqueadoHasta: null },
    create: {
      nombreCompleto: 'Carlos Méndez (Técnico Evaluador)',
      cedulaPasaporte: '001-3000000-2',
      correoElectronico: 'tecnico@digemaps.gob.do',
      contrasenaHash: hash,
      estado: 'APROBADO',
      roles: { create: { idRol: rolTecnico.id } },
    },
  });

  // Empresa
  const userEmpresa = await prisma.usuario.upsert({
    where: { correoElectronico: 'empresa@alimentos.com' },
    update: { contrasenaHash: hash, estado: 'APROBADO', idEmpresa: empresa.id, intentosFallidos: 0, bloqueadoHasta: null },
    create: {
      nombreCompleto: 'Roberto Peña (Representante Empresa)',
      cedulaPasaporte: '001-4000000-3',
      correoElectronico: 'empresa@alimentos.com',
      contrasenaHash: hash,
      estado: 'APROBADO',
      idEmpresa: empresa.id,
      roles: { create: { idRol: rolEmpresa.id } },
    },
  });

  // Asegurar que Admin tenga la contraseña correcta y el rol ADMINISTRADOR intacto
  const adminUser = await prisma.usuario.upsert({
    where: { correoElectronico: 'admin@digemaps.gob.do' },
    update: { contrasenaHash: hash, estado: 'APROBADO', intentosFallidos: 0, bloqueadoHasta: null },
    create: {
      nombreCompleto: 'Administrador del Sistema',
      cedulaPasaporte: '001-0000000-1',
      correoElectronico: 'admin@digemaps.gob.do',
      contrasenaHash: hash,
      estado: 'APROBADO',
      roles: { create: { idRol: rolAdmin.id } },
    },
  });
  await prisma.usuarioRol.deleteMany({ where: { idUsuario: adminUser.id } });
  await prisma.usuarioRol.create({ data: { idUsuario: adminUser.id, idRol: rolAdmin.id } });

  // Segundo Técnico Evaluador (para pruebas de reasignación)
  await prisma.usuario.upsert({
    where: { correoElectronico: 'tecnico2@digemaps.gob.do' },
    update: { contrasenaHash: hash, estado: 'APROBADO', intentosFallidos: 0, bloqueadoHasta: null },
    create: {
      nombreCompleto: 'Miguelina Santana (Técnico Evaluador 2)',
      cedulaPasaporte: '001-3000000-5',
      correoElectronico: 'tecnico2@digemaps.gob.do',
      contrasenaHash: hash,
      estado: 'APROBADO',
      roles: { create: { idRol: rolTecnico.id } },
    },
  });

  // Usuarios Pendientes de Validación (para el Centro de Aprobación de Usuarios del Admin)
  await prisma.usuario.upsert({
    where: { correoElectronico: 'carlos.registro@lacteos.com' },
    update: { estado: 'PENDIENTE_VALIDACION' },
    create: {
      nombreCompleto: 'Carlos Santana',
      cedulaPasaporte: '001-4444444-1',
      correoElectronico: 'carlos.registro@lacteos.com',
      contrasenaHash: hash,
      estado: 'PENDIENTE_VALIDACION',
      roles: { create: { idRol: rolEmpresa.id } },
    },
  });

  await prisma.usuario.upsert({
    where: { correoElectronico: 'laura.mendez@digemaps.gob.do' },
    update: { estado: 'PENDIENTE_VALIDACION' },
    create: {
      nombreCompleto: 'Ing. Laura Méndez',
      cedulaPasaporte: '001-5555555-2',
      correoElectronico: 'laura.mendez@digemaps.gob.do',
      contrasenaHash: hash,
      estado: 'PENDIENTE_VALIDACION',
      roles: { create: { idRol: rolTecnico.id } },
    },
  });

  await prisma.usuario.upsert({
    where: { correoElectronico: 'marcos.diaz@alimentos.com' },
    update: { estado: 'PENDIENTE_VALIDACION' },
    create: {
      nombreCompleto: 'Marcos Díaz',
      cedulaPasaporte: '001-6666666-3',
      correoElectronico: 'marcos.diaz@alimentos.com',
      contrasenaHash: hash,
      estado: 'PENDIENTE_VALIDACION',
      roles: { create: { idRol: rolDelegado.id } },
    },
  });

  // 7. Casos y Evaluaciones de Prueba
  // CASO 1: Programado para inspección BPM hoy (Evaluación lista para abrir y contestar)
  const caso1 = await prisma.caso.create({
    data: {
      idEstablecimiento: est1.id,
      idOrigen: origenSolicitud.id,
      estado: 'Asignado',
      prioridad: 'ALTA',
      asignaciones: {
        create: {
          idEvaluador: tecnico.id,
          idCoordinador: coord.id,
          estado: 'Asignado',
        },
      },
      evaluaciones: {
        create: {
          idEstablecimiento: est1.id,
          idVersionFicha: versionFicha.id,
          idVersionMatriz: versionMatriz.id,
          idEvaluador: tecnico.id,
          idCoordinador: coord.id,
          idEstado: estadoProgramada.id,
          bloqueada: false,
          fechaProgramada: new Date(),
        },
      },
    },
  });

  // CASO 2: Evaluación En Curso
  const caso2 = await prisma.caso.create({
    data: {
      idEstablecimiento: est2.id,
      idOrigen: origenProg.id,
      estado: 'Asignado',
      prioridad: 'NORMAL',
      asignaciones: {
        create: {
          idEvaluador: tecnico.id,
          idCoordinador: coord.id,
          estado: 'Asignado',
        },
      },
      evaluaciones: {
        create: {
          idEstablecimiento: est2.id,
          idVersionFicha: versionFicha.id,
          idVersionMatriz: versionMatriz.id,
          idEvaluador: tecnico.id,
          idCoordinador: coord.id,
          idEstado: estadoEnCurso.id,
          bloqueada: false,
          fechaInicio: new Date(),
          fechaProgramada: new Date(),
        },
      },
    },
  });

  // CASO 3: Histórico Cerrado (para búsqueda histórica)
  const caso3 = await prisma.caso.create({
    data: {
      idEstablecimiento: est1.id,
      idOrigen: origenSolicitud.id,
      estado: 'Cerrado',
      prioridad: 'NORMAL',
      fechaCreacion: new Date('2026-01-10T09:00:00Z'),
      evaluaciones: {
        create: {
          idEstablecimiento: est1.id,
          idVersionFicha: versionFicha.id,
          idVersionMatriz: versionMatriz.id,
          idEvaluador: tecnico.id,
          idCoordinador: coord.id,
          idEstado: estadoCerrada.id,
          bloqueada: true,
          fechaInicio: new Date('2026-01-12T10:00:00Z'),
          fechaFinalizacion: new Date('2026-01-12T16:00:00Z'),
        },
      },
      expediente: {
        create: {
          resultadoFinal: 'Aprueba la inspección con 92% de cumplimiento',
          fechaCierre: new Date('2026-01-15'),
          estado: 'Cerrado',
        },
      },
    },
  });

  // CASO 4: Informe Pendiente de Revisión (para el panel del Coordinador)
  const caso4 = await prisma.caso.create({
    data: {
      idEstablecimiento: est2.id,
      idOrigen: origenProg.id,
      estado: 'Asignado',
      prioridad: 'ALTA',
      fechaCreacion: new Date('2026-03-01T09:00:00Z'),
      asignaciones: {
        create: {
          idEvaluador: tecnico.id,
          idCoordinador: coord.id,
          estado: 'Asignado',
        },
      },
      evaluaciones: {
        create: {
          idEstablecimiento: est2.id,
          idVersionFicha: versionFicha.id,
          idVersionMatriz: versionMatriz.id,
          idEvaluador: tecnico.id,
          idCoordinador: coord.id,
          idEstado: estadoEnRevision.id,
          bloqueada: true,
          fechaInicio: new Date('2026-03-02T10:00:00Z'),
          fechaFinalizacion: new Date('2026-03-02T15:30:00Z'),
        },
      },
    },
  });

  // CASO 5: Expediente Pendiente de Cierre (Evaluación Aprobada sin expediente cerrado)
  const caso5 = await prisma.caso.create({
    data: {
      idEstablecimiento: est1.id,
      idOrigen: origenSolicitud.id,
      estado: 'Asignado',
      prioridad: 'NORMAL',
      fechaCreacion: new Date('2026-02-15T08:00:00Z'),
      asignaciones: {
        create: {
          idEvaluador: tecnico.id,
          idCoordinador: coord.id,
          estado: 'Asignado',
        },
      },
      evaluaciones: {
        create: {
          idEstablecimiento: est1.id,
          idVersionFicha: versionFicha.id,
          idVersionMatriz: versionMatriz.id,
          idEvaluador: tecnico.id,
          idCoordinador: coord.id,
          idEstado: estadoAprobada.id,
          bloqueada: true,
          fechaInicio: new Date('2026-02-16T09:00:00Z'),
          fechaFinalizacion: new Date('2026-02-16T14:00:00Z'),
        },
      },
    },
  });

  // CASO 6: Informe Devuelto / En Corrección (para probar bandeja y reversión del Coordinador)
  const caso6 = await prisma.caso.create({
    data: {
      idEstablecimiento: est2.id,
      idOrigen: origenSolicitud.id,
      estado: 'Asignado',
      prioridad: 'MEDIA',
      fechaCreacion: new Date('2026-03-05T09:00:00Z'),
      asignaciones: {
        create: {
          idEvaluador: tecnico.id,
          idCoordinador: coord.id,
          estado: 'Asignado',
        },
      },
      evaluaciones: {
        create: {
          idEstablecimiento: est2.id,
          idVersionFicha: versionFicha.id,
          idVersionMatriz: versionMatriz.id,
          idEvaluador: tecnico.id,
          idCoordinador: coord.id,
          idEstado: estadoDevuelta.id,
          bloqueada: true,
          fechaInicio: new Date('2026-03-06T10:00:00Z'),
          fechaFinalizacion: new Date('2026-03-06T16:00:00Z'),
          informe: {
            create: {
              resumenEjecutivo: 'Evaluación preliminar con deficiencias en control de plagas.',
              hallazgos: 'Se requiere subsanar evidencia del ítem 2.3.',
              noConformidades: '1 No conformidad mayor.',
              recomendaciones: 'Adjuntar certificado de fumigación vigente.',
            },
          },
        },
      },
    },
  });

  console.log('✔ Datos demo creados exitosamente:');
  console.log('  - Empresa: Alimentos del Caribe SRL (RNC: 130000001)');
  console.log('  - Establecimientos: 2 creados (con categorías de alimento)');
  console.log('  - Caso 1 ID:', caso1.id.toString(), '(Programada para Técnico)');
  console.log('  - Caso 2 ID:', caso2.id.toString(), '(En Curso)');
  console.log('  - Caso 3 ID:', caso3.id.toString(), '(Histórico Cerrado)');
  console.log('  - Caso 4 ID:', caso4.id.toString(), '(Informe Pendiente de Revisión)');
  console.log('  - Caso 5 ID:', caso5.id.toString(), '(Expediente Pendiente de Cierre)');
  console.log('  - Caso 6 ID:', caso6.id.toString(), '(Informe Devuelto / En Corrección)');
  console.log('  - Usuarios activos disponibles con clave Admin123456*:');
  console.log('    • admin@digemaps.gob.do (Administrador)');
  console.log('    • coordinador@digemaps.gob.do (Coordinador)');
  console.log('    • tecnico@digemaps.gob.do (Técnico Evaluador 1)');
  console.log('    • tecnico2@digemaps.gob.do (Técnico Evaluador 2)');
  console.log('    • empresa@alimentos.com (Empresa Alimentos del Caribe)');
  console.log('  - Usuarios pendientes para probar Centro de Aprobación Admin:');
  console.log('    • carlos.registro@lacteos.com (Administrador de Empresa)');
  console.log('    • laura.mendez@digemaps.gob.do (Técnico Evaluador)');
  console.log('    • marcos.diaz@alimentos.com (Usuario Delegado)');
}


main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
