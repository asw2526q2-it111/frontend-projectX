# Issue Tracker

## Informació del projecte

### Autors
* Jordi Abelló --- jordi.abello.sunyer@estudiantat.upc.edu
* Àngela Buxó --- angela.buxo@estudiantat.upc.edu
* Paula Mas --- paula.mas.pascual@estudiantat.upc.edu
* Víctor Rocha --- victor.rocha@estudiantat.upc.edu

### Link Taiga
https://tree.taiga.io/project/jordiabesuny-asw2526q2-it111/timeline

### Link al projecte desplegat a AWS
https://frontend-project-x.vercel.app/issues

# frontend-projectX

Client web React per a l'API REST d'Issue Hub del projecte ASW.

## Stack

- React + JavaScript
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

Per treballar en local, crea un `.env.local` per apuntar el frontend al backend local:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

Si vols apuntar a un altre backend, pots canviar aquest valor. L'exemple base del projecte es:

```bash
VITE_API_BASE_URL=https://asw-projectx.duckdns.org
```

Els usuaris del selector principal i les seves API keys estan a:

```text
src/config/users.js
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
