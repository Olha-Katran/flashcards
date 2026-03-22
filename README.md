# English vocabulary flashcards

Monorepo: React + TypeScript client (`client/`), Express API (`server/`), JSON file storage.

## Setup

```bash
npm install
cp client/.env.example client/.env
cp server/.env.example server/.env
```

## Development

```bash
npm run dev
```

- Client: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:3001](http://localhost:3001)

`VITE_API_URL` in `client/.env` must match the server URL.

## Build

```bash
npm run build
```
