# GuidePost360

Interactive indoor navigation platform with a map editor, turn-by-turn pathfinding, and room search for campuses and buildings.

## Features

- **Map editor** — draw and edit floor plans on a tile-based canvas, with room/marker textboxes, door swing rendering, and per-floor map files
- **Pathfinding & room search** — turn-by-turn directions between rooms, with an optional elevator-access routing preference
- **Role-based access**
  - **Admin** — full editing privileges (edit map, edit textboxes, save, load, clear, zoom, fullscreen), gated behind a rate-limited login
  - **Personnel** — no-login public safety access for viewing and navigating maps (load, zoom, fullscreen)
- **Automatic backups** — every map save is backed up before being overwritten, with an admin-only restore UI
- **Dark mode** and **internationalization** (multi-language UI via `data-i18n` translations)
- Mobile-friendly responsive UI

## Tech stack

- **Backend**: Python / [Flask](https://flask.palletsprojects.com/), with Flask-WTF (CSRF), Flask-Compress (gzip), Flask-Minify (JS/CSS minification)
- **Frontend**: vanilla HTML/CSS/JavaScript, server-rendered Jinja2 templates
- **Testing**: Jest (unit), Playwright (end-to-end), pytest (backend)

## Getting started

### Prerequisites

- Python 3.x
- Node.js (for running the JS/e2e test suite)

### Install dependencies

```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt   # optional, for testing/linting

npm install                           # test tooling only
```

### Configuration

The app is configured via environment variables (see [main.py](main.py)):

| Variable | Purpose | Default |
|---|---|---|
| `SECRET_KEY` | Flask session signing key | dev-only fallback (**set this in production**) |
| `ADMIN_PASSWORD` | Password for the built-in `admin` account | `admin123` (**change this in production**) |
| `PRODUCTION` | Set to `true` to enable secure (HTTPS-only) session cookies | unset |
| `FLASK_DEBUG` | Set to `true` to enable Flask debug mode (development only) | `false` |

### Run

```bash
python main.py
```

The app serves the login page at `/`. Map data is stored as JSON files in [maps/](maps/), with timestamped backups in `maps/backups/`.

## Testing

```bash
npm test              # Jest unit tests (tests/frontend)
npm run test:e2e      # Playwright end-to-end tests (tests/e2e)
npm run test:all      # Jest + Playwright
pytest                # Backend tests (tests/backend)
```

## Project structure

```
main.py               # Flask app: routes, auth, map save/load API
backup_manager.py      # Map backup/restore logic
templates/             # Jinja2 pages (login, map editor, how-to guide)
static/                # Frontend JS/CSS (map editor, pathfinder, i18n)
maps/                   # Saved map JSON files + backups
tests/
  backend/              # pytest suite
  frontend/              # Jest unit tests
  e2e/                    # Playwright end-to-end tests
```

## Security notes

- CSRF protection on form submissions (Flask-WTF)
- Login rate limiting (5 failed attempts per IP within 30 minutes)
- Filename validation on map save/load and backup restore to prevent path traversal
- HttpOnly, SameSite session cookies (Secure flag enabled in production)
- Atomic file writes for map saves to prevent data corruption from concurrent saves

## License

Licensed under the [PolyForm Noncommercial 1.0.0](LICENSE) license — free to use, modify, and share for any non-commercial purpose. Commercial use requires the copyright holder's express permission.
