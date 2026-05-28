# Deployment auf Plesk

## Voraussetzung

- Node.js `20.20.2`
- npm

## Plesk-Einstellungen

- Application Root: Repository-Root
- Application Startup File: `app.js`
- Document Root: Repository-Root oder ein von Plesk gefordertes Verzeichnis

## Befehle

```bash
npm install
npm run build
npm run start
```

Plesk startet anschließend `node app.js`.

## Environment

```text
NODE_ENV=production
PORT=<von Plesk gesetzt>
APP_BASE_URL=https://deine-domain.example
STORAGE_DRIVER=memory
PUBLIC_DIR=./public
EXPORT_DIR=./public/exports
```

MariaDB-Variablen sind vorbereitet, aber die echte MariaDB-Implementierung ist im MVP noch nicht aktiv.

## Einschränkungen

- keine echte Authentifizierung
- keine echte MariaDB-Verbindung
- keine vollständige Brandschutzberechnung
- PDF-Export ist funktional, aber noch einfach
