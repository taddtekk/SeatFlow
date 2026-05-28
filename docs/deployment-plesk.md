# Deployment auf Plesk

## M3 Build-Hinweis

Auf Plesk sollte `AUTO_PUSH_AFTER_BUILD=false` gesetzt werden. Lokale Builds pushen automatisch nach GitHub, der Server-Build soll dagegen nur installieren und bauen. Speichern nutzt im aktuellen MVP InMemory-Repositories und ist nach einem Server-Neustart nicht dauerhaft. Der Browser kann zusätzlich einen lokalen Entwurf in `localStorage` behalten, das ersetzt aber keine serverseitige Persistenz.

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
npm run typecheck
npm run test
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
- PDF-Export enthält Planübersicht und Validierungsbericht, bleibt aber schematisch
- InMemory-Speicherung geht bei Server-Neustart verloren
