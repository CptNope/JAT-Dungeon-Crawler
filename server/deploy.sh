#!/bin/bash
# Install or update the server in place. Run it over SSH from this folder, the first time and after every pull:
#   bash deploy.sh
# The first run creates .env and stops so you can fill it in; every run after that installs, migrates, caches and checks.
set -e
cd "$(dirname "$0")"

# Hosts like Cloudways keep several PHP versions and the plain `php` on the command line can be older than the
# site's. Use PHP 8.3 when it is installed under that name (override with PHP=/path/to/php bash deploy.sh).
PHP="${PHP:-$(command -v php8.3 || command -v php)}"
echo "Using $("$PHP" -r 'echo PHP_BINARY, " ", PHP_VERSION;')"

COMPOSER_BIN="$(command -v composer)"
if head -n1 "$COMPOSER_BIN" | grep -q php; then COMPOSER=("$PHP" "$COMPOSER_BIN"); else COMPOSER=("$COMPOSER_BIN"); fi
"${COMPOSER[@]}" install --no-dev --optimize-autoloader --no-interaction --no-progress

if [ ! -f .env ]; then
  cp .env.example .env
  "$PHP" artisan key:generate --force
  echo
  echo "Created .env. Edit it now:"
  echo "  APP_ENV=production   APP_DEBUG=false   APP_URL=https://your-domain"
  echo "  DB_CONNECTION=mysql  DB_DATABASE / DB_USERNAME / DB_PASSWORD from Cloudways, Access Details"
  echo "  HEARTHDEEP_ORIGINS=https://cptnope.github.io"
  echo "Then run:  bash deploy.sh"
  exit 0
fi

"$PHP" artisan config:clear
"$PHP" artisan migrate --force
"$PHP" artisan config:cache
"$PHP" artisan route:cache
"$PHP" artisan hearthdeep:check
