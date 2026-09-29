# It’s a Match

Native App (iOS + Android), um in Zürich Tennispartner zu finden, die zum
eigenen Spiel passen — nach Spielstärke, Kalender, Wohn- und Arbeitsort. Und um
zu sehen, mit wem man sich da eigentlich trifft: Foto, Beruf, Interessen und ob
danach noch ein Glas drinliegt.

Plätze zu buchen ist in Zürich gelöst (GotCourts fährt die 40 Sandplätze des
Sportamts). Jemanden zu finden, mit dem sich das Buchen lohnt, ist es nicht.

Das vollständige Produkt- und Architekturkonzept steht in
**[docs/KONZEPT.md](docs/KONZEPT.md)**.

## Starten

```bash
npm install
npm start          # Expo Dev Server, dann i / a / w
```

Die App läuft **ohne Backend**: ohne Supabase-Zugangsdaten nutzt sie das lokale
Repository mit 15 Zürcher Testprofilen und vier offenen Anfragen. Swipen,
Matchen und Chatten funktionieren vollständig, nur eben auf dem Gerät.

«Ohne Konto ansehen» auf dem Anmeldebildschirm und dann «Mit Demo-Profil
ansehen» führt direkt ins Deck, ohne den Wizard auszufüllen.

Mit Supabase gibt es echte Anmeldung — **Anmelden mit Apple** und
**E-Mail-Code**. Kein Google: Apples Richtlinie 4.8 verlangt Sign in with Apple,
sobald ein anderer Drittanbieter-Login dabei ist, und Apple plus E-Mail umgeht
das ganz, braucht keine OAuth-Registrierung und funktioniert auch auf Android.

```bash
npm test           # 149 Unit-Tests (Vitest)
npm run typecheck  # tsc --noEmit
```

## Technik

| | |
|---|---|
| App | Expo SDK 57 · React Native 0.86 · TypeScript · expo-router |
| Gesten | react-native-gesture-handler + Reanimated 4 |
| Backend (optional) | Supabase — Postgres, Auth, Realtime, Storage |
| Tests | Vitest gegen die reine Domain-Logik |

## Aufbau

```
app/                    Screens (expo-router, dateibasiertes Routing)
  sign-in.tsx           Apple, E-Mail-Code, Gastzugang
  onboarding.tsx        Profil-Wizard in neun Schritten
  (tabs)/               Entdecken · Anfragen · Matches · Profil
  match/[id].tsx        Chat samt Buchungs-Links für gemeinsame Anlagen
  player/[id].tsx       Vollprofil mit aufgeschlüsseltem Score
  request/new.tsx       Offene Anfrage aufgeben
  report/[id].tsx       Melden und Blockieren

src/domain/             Reines TypeScript, keine RN- oder Supabase-Importe
  level.ts              Klassierung und Selbsteinschätzung → Stärkeskala 0–100
  availability.ts       Wochenraster als 21-Bit-Maske
  affinity.ts           Beruf, Interessen, "nach dem Spiel" — eigene Achse,
                        unabhängig von Geschlecht und Dating
  location.ts           Wohn- und Arbeitsort als zwei Anker, Anlagen-Overlap
  matching.ts           Gewichteter Score, harte Filter, Begründungen
  venues.ts             Die Zürcher Anlagen
  geo.ts                Haversine-Distanz

src/data/               Repository- und Auth-Interface, je zwei Implementierungen
  authTypes.ts          Auth-Vertrag, frei von Plattform-Importen
  localAuth.ts          Gast-Identität für den Demo-Modus
  localRepository.ts    Offline, mit Seed-Daten
  supabaseRepository.ts Gegen das SQL-Schema

src/lib/courtProviders/ Austauschbare Adapter: GotCourts, Eversports, courts online
src/components/         UI-Primitive, Wochenraster, Spielerkarte, Swipe-Deck
supabase/migrations/    Schema inklusive Row-Level-Security
                        0001 Basis · 0002 Beruf, Interessen, nach dem Spiel
                        0003 Fotos (Storage + Policies) und Arbeitsort
                        0004 Kontolöschung, Blockieren, Bild-Moderation
store/                  Screenshots und Store-Texte
tools/make_icon.py      Erzeugt den kompletten Icon-Satz
```

Die Domain-Schicht ist absichtlich frei von React Native und Supabase. Deshalb
lässt sich das Matching in Millisekunden testen statt in einem Simulator — und
deshalb gibt es den Score genau einmal, statt einmal in SQL und einmal im Client.

## Supabase anschliessen

```bash
cp .env.example .env    # URL und Anon-Key eintragen
```

Danach wechselt `getRepository()` automatisch auf Supabase. Das Schema in
`supabase/migrations/0001_init.sql` einspielen; es bringt Tabellen, Policies und
die Funktionen `discover_candidates()` und `record_swipe()` mit.

**Noch offen:** Die Login-Screens fehlen. Schema und Repository sind fertig, aber
ohne Auth-Flow legt niemand eine Profilzeile an — das ist der erste Schritt in
`docs/KONZEPT.md`, Abschnitt 7.

## Zum Store

`docs/TESTFLIGHT.md` führt Schritt für Schritt von hier zu einem TestFlight-Build
(ohne Mac, über EAS) und listet, was für die öffentliche Veröffentlichung noch
fehlt. `docs/DATENSCHUTZ.md` ist der Entwurf der Datenschutzerklärung, die als
öffentliche URL Pflichtfeld im Store-Eintrag ist.

## Bekannte Grenzen

- **Fotos sind lokal, solange kein Supabase konfiguriert ist.** Der Picker gibt
  eine Datei-URI zurück, die auf iOS und Android einen Neustart übersteht; im
  Browser ist es eine Blob-URL, die das nicht tut. Mit Supabase landen Bilder in
  Storage, mit Schreibrechten nur im eigenen Ordner.
- **Bild-Moderation ist nachgelagert und manuell.** Bilder erscheinen sofort und
  werden danach über `moderation_queue` geprüft. Bei dieser Grösse ist das ein
  echter Moderationsprozess; die Spalten für eine automatische Vorprüfung sind
  vorhanden, der Klassifizierer fehlt noch.
- Die Seed-Profile tragen **abstrakte Platzhalterbilder** (`assets/seed/`) statt
  erfundener Porträts — so ist das Karten-Layout mit und ohne Foto sichtbar,
  ohne Gesichter zu fingieren.

- **Kein Push.** Der Anfragen-Feed braucht es, um zu funktionieren.
- **Die Koordinaten der Anlagen und Kreise** sind aus Adressen abgeleitet, nicht
  vermessen. Für Distanz-Matching genügt das, für Navigation nicht.
- **Der Discovery-Filter in SQL** verwendet als Bounding-Box weiterhin nur den
  Wohnort; der exakte Beste-Anker-Abstand wird im Client gerechnet. Bei vielen
  Pendlern wäre das zu erweitern.
- Die Gegenseite eines Likes wird im lokalen Betrieb simuliert (deterministisch
  über das Spielerpaar, damit ein Match nicht zwischen zwei Starts verschwindet).
