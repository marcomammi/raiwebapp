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

## Companion app — stato preview

Questa preview è pensata come **companion app** del motore aziendale (backend
su `rai.marcomammi.com`). In questa fase tutte le chiamate sono **mock locali**
centralizzate in `src/lib/api.ts`: le firme e i percorsi sono già allineati agli
endpoint reali (`/api/login`, `/api/me`, `/api/admin/users`, …). Il passo
successivo è sostituire i mock con chiamate HTTP reali, così trasferte e spese
inserite dall'app saranno visibili anche dal sito. Il backend resta la fonte
unica di utenti, trasferte, spese, regole di calcolo e PDF.

### Account demo (solo preview, da rimuovere in produzione)

- Utente: `user@company.test` — password `Demo.User.2026!`
- Admin:  `admin@company.test` — password `Demo.Admin.2026!`

### Configurazione

- `ALLOWED_EMAIL_DOMAIN` in `src/lib/config.ts` limita le email accettate
  (login, creazione utenti admin, futura registrazione). Default preview:
  `company.test`.
- La **registrazione autonoma è disattivata** (`SELF_REGISTRATION_ENABLED`
  false). La login espone un'azione "Richiedi accesso" che informa l'utente di
  contattare un amministratore.
- Nessun brand aziendale è esposto prima del login; nome pubblico neutro
  ("Trip Companion" / "Trasferte").
