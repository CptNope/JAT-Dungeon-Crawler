#!/bin/bash
# Install or update the server in place. Run it over SSH from this folder, the first time and after every pull:
#   bash deploy.sh
# The first run creates .env and stops so you can fill it in; every run after that installs, migrates, caches and checks.
set -e
cd "$(dirname "$0")"

composer install --no-dev --optimize-autoloader --no-interaction --no-progress

if [ ! -f .env ]; then
  cp .env.example .env
  php artisan key:generate --force
  echo
  echo "Created .env. Edit it now:"
  echo "  APP_ENV=production   APP_DEBUG=false   APP_URL=https://your-domain"
  echo "  DB_CONNECTION=mysql  DB_DATABASE / DB_USERNAME / DB_PASSWORD from Cloudways, Access Details"
  echo "  HEARTHDEEP_ORIGINS=https://cptnope.github.io"
  echo "Then run:  bash deploy.sh"
  exit 0
fi

php artisan config:clear
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan hearthdeep:check
