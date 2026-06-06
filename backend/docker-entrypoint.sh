#!/bin/sh
set -e

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Applying database schema..."
  npx prisma db push --skip-generate
fi

if [ "$RUN_SEED" = "true" ]; then
  echo "Seeding database..."
  npx prisma db seed
fi

exec npm start
