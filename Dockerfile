# Multi-platform PHP 8.2 runtime for Rentique API
FROM php:8.2-cli-alpine

# Install PostgreSQL libraries and PDO driver
RUN apk add --no-cache libpq-dev postgresql-client \
    && docker-php-ext-install pdo pdo_pgsql

# Set work directory
WORKDIR /var/www

# Copy backend application and database helpers
COPY backend/ /var/www/backend/
COPY database/ /var/www/database/

WORKDIR /var/www/backend

EXPOSE 8000

# Listen on PORT environment variable provided by hosting (Render, Railway, etc.), fallback to 8000
CMD sh -c "php -S 0.0.0.0:${PORT:-8000} -t public public/index.php"
