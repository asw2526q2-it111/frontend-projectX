# frontend-projectX

Client web React per a l'API REST d'Issue Hub del projecte ASW.

## Stack

- React + TypeScript
- Vite
- React Router
- Fetch API amb header `X-API-Key`
- Preparat per desplegar a Vercel

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Configuracio

Copia `.env.example` a `.env.local` si vols canviar la URL del backend:

```bash
VITE_API_BASE_URL=https://asw-projectx.duckdns.org
```

Els usuaris del selector principal i les seves API keys estan a:

```text
src/config/users.ts
```

Ara mateix les keys son placeholders. Cal substituir-les per les claus reals del backend.

## Estructura

```text
src/
  api/          Client REST i crides per recurs
  components/   Components reutilitzables
  config/       Usuaris hardcoded i constants
  context/      Usuari actiu de la sessio
  hooks/        Hooks compartits
  layouts/      Shell principal de l'app
  pages/        Pantalles principals
  styles/       CSS global responsive
  types/        Tipus TypeScript derivats de l'OpenAPI
  utils/        Helpers de format
```

## Deploy a Vercel

Vercel detecta Vite automaticament. La configuracio recomanada es:

- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE_URL`

## Docker

La imatge fa el build amb Node i serveix els fitxers estatics amb Nginx.

```bash
docker build -t frontend-projectx .
docker run --rm -p 5173:80 frontend-projectx
```

Per indicar una URL de backend diferent:

```bash
docker build --build-arg VITE_API_BASE_URL=http://localhost:8000 -t frontend-projectx .
```

Amb Docker Compose:

```bash
docker compose up --build
```
