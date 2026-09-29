# Von hier zu TestFlight und in den App Store

Du brauchst **keinen Mac**. EAS baut die iOS-App in der Cloud und lädt sie zu
App Store Connect hoch.

## Vorbereitung, einmalig

Du hast das Apple Developer Program bereits — dann fehlt nur noch:

```bash
npm i -g eas-cli
eas login                 # kostenloses Expo-Konto
eas init                  # legt das Projekt an und schreibt die projectId
```

`eas init` ersetzt in `app.json` die beiden Platzhalter `owner` und
`extra.eas.projectId`. Danach in `eas.json` unter `submit.production.ios` die
`ascAppId` und `appleTeamId` eintragen (beides findest du in App Store Connect
bzw. im Apple Developer Portal).

Die Bundle-ID ist auf **`ch.itsamatch.app`** gesetzt. Lege sie im Apple
Developer Portal unter *Identifiers* an und aktiviere dort die Capability
**Sign in with Apple** — ohne die schlägt der Build fehl.

## Backend anschliessen

Ohne Supabase läuft die App im Demo-Modus, in dem alles auf dem Gerät bleibt.
Für TestFlight mit echten Nutzern:

1. Supabase-Projekt anlegen, Region **EU (Frankfurt)** wählen.
2. Die Migrationen in Reihenfolge im SQL-Editor ausführen:
   `0001_init` → `0002_off_court` → `0003_photos_and_work` → `0004_safety`.
   `0004` legt Funktionen an, die auf `auth.users` zugreifen — führe sie im
   SQL-Editor aus, nicht über einen eingeschränkten Rollen-Zugang.
3. Unter *Authentication → Providers* **Apple** aktivieren und die Bundle-ID
   `ch.itsamatch.app` als Client-ID eintragen. E-Mail-OTP ist standardmässig an.
4. `.env` anlegen:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://…supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=…
   ```
   Für Cloud-Builds dieselben Werte als EAS-Secrets hinterlegen:
   ```bash
   eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value https://…
   eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value …
   ```

## Erster Build

```bash
eas build --platform ios --profile production
```

EAS fragt beim ersten Mal nach den Apple-Zugangsdaten und legt Zertifikat und
Provisioning-Profil selbst an. Der Build dauert typischerweise 10–25 Minuten.

## Hochladen

```bash
eas submit --platform ios --latest
```

Danach erscheint der Build in App Store Connect unter *TestFlight*. Für
**interne Tester** (bis 100 Personen aus deinem Team) ist **keine Review
nötig** — du kannst innerhalb von Minuten einladen. Für externe Tester prüft
Apple einmal kurz, meist innerhalb eines Tages.

**Für den Anfang reicht das völlig.** Lade zwanzig, dreissig Leute aus deinem
Tennisumfeld ein. Eine Matching-App lernt nur an echten Leuten, und im
Store-Review-Prozess lernst du nichts.

## Was vor der öffentlichen Veröffentlichung noch fehlt

Diese Punkte sind für TestFlight **nicht** nötig, für den Store schon:

| Punkt | Stand |
|---|---|
| Anmeldung (Apple + E-Mail-Code) | **erledigt** |
| Melden und Blockieren im UI | **erledigt** (Profil, Chat) |
| Konto löschen in der App | **erledigt** (Profil → Konto löschen) |
| Moderations-Warteschlange für Bilder | **erledigt** (`moderation_queue`) |
| App-Icon | **erledigt** |
| Datenschutzerklärung | Entwurf in `docs/DATENSCHUTZ.md` — **muss online** |
| Support-URL und Kontakt-E-Mail | ⟨noch einzurichten⟩ |
| Screenshots | Vorlagen in `store/screenshots/` |
| App-Privacy-Fragebogen | ⟨in App Store Connect auszufüllen⟩ |
| Altersfreigabe | 17+ setzen (Dating-Anteil) |
| Demo-Konto für die Review | ⟨anlegen und in den Review-Notizen angeben⟩ |

### Die Review-Notizen

Apple prüft Apps mit Dating-Bezug genauer. Was in die *App Review Information*
gehört:

- **Demo-Zugang**: eine E-Mail-Adresse, deren OTP-Code du dem Reviewer nennst,
  oder ein vorbereitetes Konto. Ohne funktionierenden Zugang wird abgelehnt.
- **Ein Satz zur Moderation**: Bilder werden nach dem Hochladen geprüft,
  Meldungen innerhalb von 24 Stunden bearbeitet, Melden und Blockieren sind auf
  jedem Profil und in jedem Chat erreichbar.
- **Warum die App keine Kopie ist**: Richtlinie 4.3 trifft neue Dating-Apps
  regelmässig. Der Unterschied hier ist konkret und lässt sich in zwei Sätzen
  sagen: Es geht um Spielstärke, Kalender und Platz, nicht um Fotos, und die App
  begründet jeden Vorschlag sichtbar.

### App-Privacy-Fragebogen, ausgefüllt

Was die App laut Code tatsächlich erhebt:

- **Kontaktdaten**: E-Mail-Adresse — zur App-Funktionalität, mit dem Konto
  verknüpft, nicht zum Tracking
- **Benutzerinhalte**: Fotos, Profiltext, Nachrichten — App-Funktionalität,
  verknüpft
- **Kennungen**: Benutzer-ID — App-Funktionalität, verknüpft
- **Standort**: **nein**. Es wird nur der Stadtkreis erfasst, den die Person
  selbst auswählt, und nie auf die Ortungsdienste zugegriffen.
- **Sensible Daten**: sexuelle Orientierung — nur wenn die Person «offen für
  mehr» zusammen mit einer Geschlechterpräferenz angibt. Verknüpft,
  App-Funktionalität, kein Tracking.
- **Tracking über Apps und Websites hinweg**: **nein**

## Android

Derselbe Weg mit `--platform android`. Für den Play Store brauchst du ein
Google-Play-Entwicklerkonto (einmalig 25 USD) und dieselbe
Datenschutzerklärung.
