# Star Builders frontend

React + Vite + TypeScript + Tailwind. Shared requirements and setup notes are in [the root README](../README.md) and [project structure](../docs/PROJECT_STRUCTURE.md).

From this folder:

```sh
npm install
npm run dev
npm test
npm run test:responsive
npm run build
```

Run the backend separately on port 4000. Vite forwards `/api` there. Local login credentials and MongoDB connection settings belong only in the ignored `backend/.env`, never in this frontend.
