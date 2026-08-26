#!/usr/bin/env bash
# Publica este repositorio en GitHub.
# Requiere GitHub CLI autenticado:  gh auth login
#
# Si el repositorio YA existe en GitHub (por ejemplo porque se creo o se
# renombro manualmente desde la interfaz web), no uses este script para
# crearlo de nuevo -- usa en su lugar:
#
#   git remote add origin https://github.com/<usuario>/<repo>.git
#   git push -u origin main
#   git checkout -b develop && git push -u origin develop
#
# O si ya existe un remoto apuntando a la URL vieja:
#
#   git remote set-url origin https://github.com/<usuario>/<repo>.git
#   git push -u origin main
set -euo pipefail

ORG="${1:-}"
NOMBRE="${2:-Reto-Desarrollo-Web-Evaluacion-Basada-en-Riesgo}"

if [ -z "$ORG" ]; then
    echo "Uso: ./scripts/publicar-repo.sh <usuario-u-organizacion> [nombre-del-repo]"
    echo "Ejemplo: ./scripts/publicar-repo.sh AshFranco Reto-Desarrollo-Web-Evaluacion-Basada-en-Riesgo"
    exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
    echo "GitHub CLI no esta instalado: https://cli.github.com"
    exit 1
fi

echo "==> Verificando identidad de commits"
if [ -z "$(git config user.name)" ] || [ -z "$(git config user.email)" ]; then
    echo "Configura tu identidad antes de publicar:"
    echo "  git config user.name  \"Tu Nombre\""
    echo "  git config user.email \"tu.correo@ejemplo.com\""
    exit 1
fi
echo "    $(git config user.name) <$(git config user.email)>"

echo "==> Activando hooks del equipo"
git config core.hooksPath .githooks

echo "==> Creando repositorio privado ${ORG}/${NOMBRE}"
gh repo create "${ORG}/${NOMBRE}" --private --source=. --remote=origin

echo "==> Publicando main"
git push -u origin main

echo "==> Creando develop"
git checkout -b develop && git push -u origin develop

echo "==> Protegiendo main"
gh api -X PUT "repos/${ORG}/${NOMBRE}/branches/main/protection" \
  -F required_pull_request_reviews[required_approving_review_count]=1 \
  -F enforce_admins=true \
  -F required_status_checks='null' \
  -F restrictions='null' 2>/dev/null || \
  echo "    (la proteccion de ramas requiere plan de pago en repos privados; omitida)"

echo ""
echo "Listo: https://github.com/${ORG}/${NOMBRE}"
echo ""
echo "Falta por hacer a mano:"
echo "  1. Invitar a los 4 integrantes con permiso de escritura"
echo "  2. Crear el proyecto en GitHub Projects y cargar el backlog de docs/plan-maestro.md"
echo "  3. Cada integrante, tras clonar:  git config core.hooksPath .githooks"
