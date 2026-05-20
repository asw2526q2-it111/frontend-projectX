#!/usr/bin/env bash
set -euo pipefail

FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$(cd "${FRONTEND_DIR}/../projectX" && pwd)"
BACKEND_ENV_FILE="${BACKEND_DIR}/.env"
BACKEND_ENV_EXAMPLE="${BACKEND_DIR}/.env.example"
FRONTEND_ENV_LOCAL="${FRONTEND_DIR}/.env.local"

if [[ ! -d "${BACKEND_DIR}" ]]; then
  echo "No s'ha trobat el backend a ${BACKEND_DIR}"
  echo "Assegura't que el repo backend estigui com a carpeta germana: ../projectX"
  exit 1
fi

if [[ ! -f "${BACKEND_ENV_FILE}" ]]; then
  if [[ -f "${BACKEND_ENV_EXAMPLE}" ]]; then
    cp "${BACKEND_ENV_EXAMPLE}" "${BACKEND_ENV_FILE}"
    echo "Creat ${BACKEND_ENV_FILE} des de .env.example"
  else
    echo "Falta ${BACKEND_ENV_FILE} i no existeix .env.example al backend."
    exit 1
  fi
fi

if [[ ! -f "${FRONTEND_ENV_LOCAL}" ]]; then
  cat > "${FRONTEND_ENV_LOCAL}" <<'EOF'
VITE_API_BASE_URL=http://localhost:8000
EOF
  echo "Creat ${FRONTEND_ENV_LOCAL} amb backend local."
fi

echo "Iniciant backend (Docker Compose)..."
docker compose -f "${BACKEND_DIR}/docker-compose.yml" --project-directory "${BACKEND_DIR}" up -d --build

echo "Iniciant frontend (Vite)..."
cd "${FRONTEND_DIR}"
npm run dev
