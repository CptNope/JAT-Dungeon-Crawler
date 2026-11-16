# Hearthdeep online server

A small Laravel 13 API that gives the game leaderboards and ghost races on any web host: deepest descent, and the fastest Weekly Rift each week with a ghost to race. It needs PHP 8.3 or newer and MySQL (or SQLite). There are no WebSockets and no background workers, so it runs as an ordinary Laravel application.

Parties (seeing friends in the village, racing side by side) are not part of this server yet; they still work only on the published claude.ai page.

## What it stores

| Table | Holds |
| --- | --- |
| `players` | A random id, the display name the player chose, and the hash of a random token. No email, password or IP address. |
| `entries` | One line per player: deepest depth, class, level, Paragon, and this week's best rift time with its recorded path. |

A browser becomes a player the first time it sends a score or saves a name. The server replies with a token once; the game keeps it in the browser's storage and sends it with later scores. Clearing browser data means starting again as a new player.

## API

All under `/api/v1`. Replies are JSON.

| Method and path | Who | Does |
| --- | --- | --- |
| `GET /status` | anyone | `{ ok, week }`: the server is up, and the week it thinks it is |
| `GET /board?kind=deep` | anyone | Top descents |
| `GET /board?kind=week&week=2026-W47` | anyone | That week's rift, fastest first |
| `GET /players?ids=a,b` | anyone | Display names for ids |
| `GET /players/{id}/entry` | anyone | One player's line, ghost path included |
| `POST /players` | anyone, 12 an hour per address | Join; replies `{ id, name, token }` |
| `GET /me`, `PATCH /me` | token | Read or change the display name |
| `PUT /me/entry` | token | Send the line after a run |

The server decides what a sent line changes: depth only ever rises, a weekly time is kept only when it is for the current week and faster than the stored one, and a new week clears the last. Values outside the bounds in `config/hearthdeep.php` are refused. These checks stop typos and casual tampering; scores still come from the player's browser, so a determined cheat can post a false one. Delete a row from `players` to remove someone (their entry goes with it).

## Run it locally

```bash
cd server
composer install
cp .env.example .env && php artisan key:generate
touch database/database.sqlite && php artisan migrate
php artisan test
php artisan serve --port=8123
```

Point a local copy of the game at it by opening the game with `window.HEARTHDEEP_API = 'http://127.0.0.1:8123'` set before `game.js` loads, or by putting that address in the `hearthdeep-api` meta tag in `src/head.html` and running `./build.sh`. Add the game's own address (for example `http://localhost:8000`) to `HEARTHDEEP_ORIGINS` in `.env`.

## Deploy on Cloudways

Names of screens are as Cloudways labelled them when this was written; they move things around now and then.

1. **Create the application.** On your server, add an application of type Laravel (or Custom PHP). Set its PHP version to 8.3 or newer under the server's Settings and Packages.
2. **Get the code onto it.** In the application's Deployment via Git screen, add the repository `git@github.com:CptNope/JAT-Dungeon-Crawler.git`, branch `main`, and add the deploy key Cloudways shows you to the repository on GitHub (Settings, Deploy keys). Pull.
3. **Point the web root at the server.** The repository holds the game at its top level and this server in `server/`. In Application Settings, set the webroot to `public_html/server/public`.
4. **Install and configure**, over SSH, in `public_html/server`:
   ```bash
   composer install --no-dev --optimize-autoloader
   cp .env.example .env && php artisan key:generate
   ```
   Edit `.env`: set `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL` to the application's https address, `DB_CONNECTION=mysql` with the database name, user and password from the application's Access Details, and `HEARTHDEEP_ORIGINS` (below). Then:
   ```bash
   php artisan migrate --force
   php artisan config:cache && php artisan route:cache
   ```
5. **Turn on SSL** for the application's domain (SSL Certificate, Let's Encrypt). The game is served over https and browsers will not let it call a plain http server.
6. **Check it.** `https://your-domain/api/v1/status` should answer `{"ok":true,"week":"…"}`.
7. **Tell the game.** Put the address in `src/head.html`:
   ```html
   <meta name="hearthdeep-api" content="https://your-domain">
   ```
   Run `./build.sh`, commit and push. The Online button appears in the game's menu once the server answers.

Every API reply is marked `Cache-Control: no-store`, so Varnish and browsers should pass it through untouched. If a board ever looks frozen, add an exclusion for `/api/` in the application's Varnish settings.

### `HEARTHDEEP_ORIGINS`

Browsers only let the game call this server from the websites listed here. List every address the game itself is served from, comma-separated, each as `scheme://host` with no path:

```
HEARTHDEEP_ORIGINS=https://cptnope.github.io,https://html-classic.itch.zone
```

A WordPress page that embeds the game with the `[hearthdeep]` shortcode does not need listing. The game runs in a frame from its own address, and that address is the origin the browser sends.

### After each update

```bash
git pull   # or the Pull button in Cloudways
cd server && composer install --no-dev --optimize-autoloader && php artisan migrate --force && php artisan config:cache && php artisan route:cache
```
