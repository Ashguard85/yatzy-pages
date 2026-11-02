# Yatzy Duell · GitHub-Pages-PWA v2.6.0

## Ziel und Änderung gegenüber v2.5.0

Die bewährte Yatzy-Oberfläche (Spiel, Statistik, Badges, Verlauf, Profile, PNG-Teilen) wurde aus der bereitgestellten älteren Yatzy-App übernommen. Die lokale **fachliche Datenhaltung verwendet jetzt IndexedDB** statt `localStorage`. Der alte Node.js-Sync-Modus bleibt für die Übergangsphase vorhanden; die neue **Spiele-Zentrale** nutzt dieselbe allgemeine API wie Flip 7 unter `GET/PUT /api/v1/apps/yatzy/state`. Es findet **kein automatischer Abgleich** zwischen lokalem und zentralem Zustand statt.

Die PWA bleibt ein eigenständiger statischer Client. Sie enthält keine Python-, Flask-, Node.js-, SQLite- oder serverseitigen Cloudflare-Secrets. Sie hat keine Abhängigkeit zur GitHub-Pages-Website, sobald die wesentliche App-Shell vollständig im Service Worker installiert ist.

## Upgrade ohne Verlust lokaler Spielstände

1. **WICHTIG:** Vor dem Update in der alten Yatzy-PWA unter Einstellungen eine bisherige Sicherung exportieren. Wenn mehrere Spielbereiche existieren, für jeden Bereich eine Sicherung exportieren. Das bisherige Yatzy-Backend ebenfalls sichern. **Die installierte PWA nicht löschen.**
2. `yatzy-pages-central-v2.6.0.zip` als neues ZIP direkt in das bestehende Yatzy-GitHub-Pages-Repository importieren. Nicht manuell alte `.github/`-Dateien ersetzen. `VERSION` in GitHub muss `v2.6.0` enthalten.
3. In der installierten PWA unter Setup **Auf Updates prüfen** und bei vollständig vorbereiteter Version **Jetzt aktualisieren**. Keine Neuinstallation der PWA durchführen.
4. Beim ersten Start liest v2.6.0 die alten `localStorage`-Datensätze (`yatzy-duell-v2` und sämtliche `yatzy-duell-area-v1:*`) und überträgt sie **in einer IndexedDB-Transaktion**, einschliesslich Profilen, Spielständen, Verlauf, Bildern und Spielbereichs-Caches. Ein zusätzlicher Sicherheits-Snapshot wird in IndexedDB angelegt.
5. **Die alten lokalen Schlüssel werden nicht gelöscht oder verändert.** Bei einer fehlgeschlagenen Migration wird der Start gestoppt; vorhandene Daten werden nicht durch einen leeren Spielstand überschrieben. Die kleinen UI-Einstellungen bleiben in `localStorage`; der grosse serverweite Profilkatalog wird in IndexedDB gespeichert.
6. Prüfen, ob **„IndexedDB aktiv“** im Setup erscheint. Unter **Alle lokalen Daten** ein **Komplettbackup als ZIP** exportieren und in der Dateien-App aufbewahren.

**Wichtig:** Ein späteres Update der installierten PWA behält IndexedDB und Service-Token-Einstellungen bei. Website-Daten löschen oder die PWA deinstallieren kann dennoch lokale Daten zerstören. Regelmässig extern sichern.

## Lokales Komplettbackup (alle Spielbereiche)

Unter **Einstellungen → Alle lokalen Daten · IndexedDB**:

- **Komplettbackup als ZIP**: versioniertes `backup.json` mit allen Spielbereichen, aktiver Partie, Profil-IDs, Verlauf, aktuellen Spielen, Erinnerungen, globalen alten Spielerprofilen und Profil-Alias-Zuordnungen; Bilder werden separat als `images/photo-...` gespeichert (keine Base64-Bilder im Backup-JSON). Eigene Badge-Bilder werden ebenfalls separat mitgegeben.
- **Komplettbackup importieren**: Daten aus einem von v2.6.0 erzeugten ZIP einlesen; Anzahl Bereiche, Partien, Profile, Bilder und Konflikte anzeigen. **ZUSAMMENFÜHREN** führt Datensätze pro Spiel-ID zusammen; **ERSETZEN** ersetzt die lokale Sammlung. Vor der Änderung wird eine vollständige IndexedDB-Sicherheitskopie erzeugt.
- Alte einzelne Yatzy-JSON-Exports können weiterhin über die ursprüngliche **Sicherung importieren**-Funktion mit Spieler-ID-Zuordnung übernommen werden. Der neue Gesamtimport erkennt zusätzlich einfache alte Einzelspielstand-JSON und reicht sie an den bisherigen Importdialog weiter.
- Keine API-/Cloudflare-Tokens, Client-Secrets oder privaten Zugriffsschlüssel in Komplettbackups.

**Lokales Datenmodell:** `yatzy-duell-data` (IndexedDB v1) mit Stores `areas`, `meta`, `backups`; zusätzlich `yatzy-duell-secure-v1` (nur lokal gespeicherte Zugangsdaten). Bilder werden intern noch als Data-URLs in den IndexedDB-Spielobjekten gehalten, im ZIP aber als getrennte Dateien archiviert. Bei grösserem Bildvolumen kann eine spätere getrennte Blob-Speicherung im laufenden Modell sinnvoll werden.

## Alle Yatzy-Daten migrieren

**Vor jeder Servermigration externe Backups beider Server erstellen und die alten Container eingeschaltet lassen.** Unter Einstellungen → Server-Modus `Spiele-Zentrale (manuell übertragen)` wählen, URL und API-Token sowie optional Cloudflare Access Client ID/Secret eingeben. Der Verbindungstest verwendet die aktuell eingegebenen Werte. Danach Zugangsdaten *auf diesem Gerät* speichern.

Es gibt vier Wege:

1. **Alle lokalen Bereiche → Server**: importiert alle benannten lokalen Bereiche in das Yatzy-Dokument der Spiele-Zentrale. Ein unbenannter bisheriger Einzelbereich wird auf den gewählten zentralen Bereichscode gelegt (bei Namenskonflikt auf `lokal-archiv`). Der alte Serverstand bleibt bei `ZUSAMMENFÜHREN` erhalten; bei `ERSETZEN` werden nur die gewählten betroffenen Yatzy-Bereiche ersetzt. Flip-7-Daten bleiben unter `flip7` unberührt. Übertragung nur nach Vorschau, Bestätigung und Revisionsprüfung. Spielerregister und eigene Badgebilder werden berücksichtigt.
2. **Alle Serverbereiche → Gerät**: holt alle zentral gespeicherten Yatzy-Bereiche, alle serverweiten Spielerprofile und Badge-Bilder nach IndexedDB, mit Vorschau und Sicherheitskopie. Lokale Bereiche werden nach Wahl zusammengeführt oder ersetzt.
3. **Bestehendes Yatzy-Backend übernehmen**: importiert alle alten Node-Server-Spielbereiche und individuelle Badge-Bilder direkt in die neue Spiele-Zentrale. Zusätzlich werden global registrierte Profile und Alias-IDs aus `/api/catalog` übernommen. Die alte Serverquelle wird niemals geändert. Bei unvollständiger Abfrage wird abgebrochen.
4. **Alle alten Serverbereiche zuerst lokal sichern**: liest das alte Node-Yatzy-Backend auf dieses Gerät und ermöglicht danach ein Gesamt-ZIP als externe Sicherheitskopie. Geeignet, wenn der zentrale Server noch zu kleine JSON-Dokumente akzeptiert.

Die alte Backend-URL und ggf. die alten Cloudflare-Service-Daten müssen in den Einstellungen des Altmodus noch hinterlegt sein. Ein vorhandenes Cloudflare-Service-Token wird **nicht** aus einem GitHub-Repository gelesen.

**Vor Abschalten des Altcontainers**: Bereichsliste, Spieler-IDs, Anzahl abgeschlossener Partien, noch offene Partien, individuelle Profilstatistik, Badge-Fortschritt und eigene Bilder zwischen beiden Apps vergleichen. Falls auf dem alten Node-Server Profile ohne zugehörige Spielbereiche existieren, können diese als globales Profilregister zentral erhalten bleiben. Das zentrale `/api/v1/players` ist davon weiterhin unabhängig und wird nicht ohne Zuordnungsprüfung automatisch zusammengeführt.

## Grosse Bilder / API-Limit

Die bisherige Spiele-Zentrale v1 akzeptiert etwa **3 MB pro App-Dokument**. Alle Yatzy-Spielbereiche werden derzeit gemeinsam im Dokument `yatzy` gespeichert. Übersteigt eine Migration das Limit, wird **nichts auf den Server geschrieben**. Das vollständige lokale ZIP ist davon nicht betroffen.

Optional liegt `spiele-backend-docker-v1.1.zip` bei dieser Lieferung separat vor. Es aktualisiert den **bestehenden** Portainer-Container abwärtskompatibel (Schema 1, keine Datenbanklöschung) und ergänzt die Variable `MAX_APP_DOC_BYTES` (z. B. `20000000`, maximal `25000000`); Standard bleibt 3 MB. Nur bei Bedarf einspielen. Grossen Dokumenten stehen grössere SQLite-Dateien, vollständige JSON-Backups bei jedem Schreibvorgang und längere Serverantwortzeiten gegenüber; langfristig wären einzelne Dateiobjekte besser.

## PWA, Sicherheit, Versionen

- Basis: HTML/CSS/Vanilla JS, kein Framework/CDN, lokal mitgeführte Icons und Badgebilder.
- Service Worker `v2.6.0`: Pflicht-App-Shell (`index.html`, `app.js`, `archive.js`, `app.css`, `manifest.webmanifest`) wird vor Freigabe vollständig neu geladen. Altes App-Shell-Cache bleibt als Fallback. `/api` und dynamische Dateien werden nicht aus dem Cache beantwortet. Kein automatisches `clients.claim()`, kein automatischer Reload während Bearbeitung.
- Manuelles Update und Blockierung bei aktivem Import, Export, Formularbearbeitung und kritischem Transfer.
- Cloudflare: `PWA_ALLOWED_ORIGIN` der gemeinsamen API enthält die exakte Pages-Origin; `OPTIONS`-Preflight für `Authorization` und Cloudflare-Header zulassen. Tokens nur in gerätelokalem IndexedDB-Vault, niemals in ZIP, HTML, SW, Git oder Backups.
- Einschränkungen: Die übernommene historische Oberfläche verwendet teilweise Inline-CSS, weshalb `style-src 'unsafe-inline'` in der CSP enthalten ist. Die PWA ist **kein** konfliktauflösender Mehrgeräte-Sync; es gibt nur bewusste Datenübertragung. SQLite läuft nur auf dem Server.

## Teststand

**Geprüft:** JavaScript-Syntax von `app.js`, `archive.js` und `sw.js`, ZIP-Archiv-Roundtrip einschliesslich Badgebildern und Verlaufbildern (CRC-32 und `unzip -t`), HTML-/DOM-ID-Referenzen, Release-ZIP-Root und SW-Pflichtdateien, Python-Syntax der optionalen Backend-Erweiterung. Keine `.git/`, `.github/`, `.gitignore` in Releases.

**Hier nicht ausführbar:** echte IndexedDB-Migration mit auf dem iPhone vorhandenen Bestandsdaten, iOS-Safari-Update-Lifecycle, produktiver Node-Sync-Server, Cloudflare Access und vollständiger Flask-/Gunicorn-Laufzeittest. Der bereitgestellte Browser verweigert lokal aufgerufene Testseiten. Deshalb sind die ZIPs **Release-Kandidaten**; zuerst an einer extern gesicherten Testkopie validieren und alte Container nicht voreilig entfernen.
