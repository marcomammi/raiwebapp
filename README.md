# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Companion app

Questa app è una **companion app mobile** del motore aziendale. Il backend su
`rai.marcomammi.com` resta la fonte unica per utenti, trasferte, spese, regole
di calcolo e PDF: l'app non duplica dati, li consuma via API.

### Endpoint reali usati

- `POST /api/login`, `POST /api/logout`, `GET /api/me`
- `GET/POST/PATCH/DELETE /api/admin/users`
- `POST /api/access-requests`
- `GET /api/trips`, `GET /api/trips/:id`
- `POST /api/trips/:id/expenses`, `PATCH /api/expenses/:id`, `DELETE /api/expenses/:id`
- `POST /api/trips/:id/generate-pdf`, `POST /api/trips/:id/email-pdf`

### Configurazione

In `src/lib/config.ts`:

- `API_BASE_URL` — base URL del backend (default `https://rai.marcomammi.com/api`,
  sovrascrivibile con `VITE_API_BASE_URL`).
- `ALLOWED_EMAIL_DOMAIN` — dominio email ammesso per login, creazione utenti
  admin e richieste di accesso.
- `SELF_REGISTRATION_ENABLED = false` — non c'è registrazione autonoma; la
  login espone "Richiedi accesso" (`POST /api/access-requests`).
- `DEV_MOCK_TRIPS` — fallback dev-only per trasferte/spese quando il backend
  non è raggiungibile in preview. Non tocca mai l'autenticazione.

Nessun account demo, nessuna password è hard-coded nel codice.
