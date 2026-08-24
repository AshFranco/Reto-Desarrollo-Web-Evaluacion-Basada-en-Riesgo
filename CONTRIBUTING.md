# Guía de contribución

## Antes del primer commit

```bash
git config core.hooksPath .githooks
git config user.name  "Tu Nombre"
git config user.email "tu.correo@ejemplo.com"
```

Sin el primer comando los hooks no corren. Sin los otros dos, el hook `pre-commit`
rechazará el commit.

## Autoría

Los commits los firman las personas. Ninguna herramienta de IA aparece como autor
ni coautor: nada de trailers `Co-authored-by:` de asistentes, ni firmas
"Generated with...". Está verificado por hooks locales y por CI.

Usar asistentes para escribir código está bien; atribuirles autoría en el historial
del repositorio, no. El historial dice quién es responsable del cambio.

## Ramas

    feat/EBR-XX-descripcion-corta
    fix/EBR-XX-descripcion-corta
    docs/EBR-XX-descripcion-corta
    chore/EBR-XX-descripcion-corta

## Commits

Formato Conventional Commits:

    feat(motor): calculo ponderado de RE
    fix(sync): idempotencia al reenviar respuestas
    docs(adr): decision de stack de backend

Ambitos: `motor`, `catalogo`, `evaluacion`, `sync`, `pwa`, `api`, `db`, `auth`, `adr`.

## Definition of Ready

Una historia entra al sprint solo si:

- [ ] Tiene criterios de aceptacion escritos y verificables
- [ ] Sus dependencias estan desbloqueadas
- [ ] Tiene wireframe si toca UI
- [ ] Esta estimada por el equipo
- [ ] Es trazable a un RF del SRS o a una regla documentada

## Definition of Done

Una historia se cierra solo si:

- [ ] Esta en `develop` via PR aprobado
- [ ] Los criterios de aceptacion los verifico alguien distinto al autor
- [ ] Si toca el motor de riesgo: hay pruebas unitarias con casos calculados a mano
- [ ] Si toca datos: funciona sin conexion y sincroniza
- [ ] Ningun valor del motor esta hardcodeado
- [ ] Sin `console.log`, `TODO` ni credenciales en el codigo
- [ ] Endpoints documentados en Swagger
- [ ] Funciona en movil (360px) y escritorio
- [ ] CI en verde

## Estandares no negociables

1. **Ningun numero del dominio en el codigo.** Ni 0.5, ni 0.56, ni 3.6, ni 60, ni 81.
   Si el numero aparece en un Excel de la DIGEMAPS, va en una tabla.
2. **Toda mutacion lleva UUID generado en el cliente.** Es la base de la idempotencia
   offline: reenviar un lote no debe duplicar nada.
3. **El servidor recalcula siempre.** El calculo del cliente es para la UI;
   la autoridad es el backend.
4. **Toda accion sensible se audita.**
5. **Los supuestos se marcan en datos o en comentarios,** nunca escondidos en un `if`.
6. **Nombres en espanol para el dominio** (`Evaluacion`, `ItemFicha`, `RiesgoTotal`),
   ingles para lo tecnico (`Repository`, `Service`, `Handler`).

## Revision de codigo

- Minimo una aprobacion por PR.
- El Tech Lead revisa todo lo que toque el motor de riesgo o la sincronizacion.
- PR de mas de ~400 lineas se parten. Un PR de 2.000 lineas no se revisa,
  se aprueba a ciegas.
- Nadie hace push directo a `main` ni a `develop`, incluido el Tech Lead.
