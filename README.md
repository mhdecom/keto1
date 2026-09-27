# Tinder Tennis

Native App (iOS + Android), um in Zürich Tennispartner zu finden, die zum
eigenen Spiel passen — nach Spielstärke, Kalender und Anlage, nicht nach Foto.
Und zu sehen, mit wem man sich da eigentlich trifft: Beruf, Interessen und ob
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

Auf dem Startbildschirm führt «Mit Demo-Profil ansehen» direkt ins Deck, ohne
den Wizard auszufüllen.

```bash
npm test           # 116 Unit-Tests (Vitest)
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
  onboarding.tsx        Profil-Wizard in neun Schritten
  (tabs)/               Entdecken · Anfragen · Matches · Profil
  match/[id].tsx        Chat samt Buchungs-Links für gemeinsame Anlagen
  player/[id].tsx       Vollprofil mit aufgeschlüsseltem Score
  request/new.tsx       Offene Anfrage aufgeben

src/domain/             Reines TypeScript, keine RN- oder Supabase-Importe
  level.ts              Klassierung und Selbsteinschätzung → Stärkeskala 0–100
  availability.ts       Wochenraster als 21-Bit-Maske
  affinity.ts           Beruf, Interessen, "nach dem Spiel" — eigene Achse,
                        unabhängig von Geschlecht und Dating
  matching.ts           Gewichteter Score, harte Filter, Begründungen
  venues.ts             Die Zürcher Anlagen
  geo.ts                Haversine-Distanz

src/data/               Repository-Interface + zwei Implementierungen
  localRepository.ts    Offline, mit Seed-Daten
  supabaseRepository.ts Gegen das SQL-Schema

src/lib/courtProviders/ Austauschbare Adapter: GotCourts, Eversports, courts online
src/components/         UI-Primitive, Wochenraster, Spielerkarte, Swipe-Deck
supabase/migrations/    Schema inklusive Row-Level-Security
                        0001 Basis · 0002 Beruf, Interessen, nach dem Spiel
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

## Bekannte Grenzen

- **Keine Fotos.** Bewusst: ein Matching lässt sich besser beurteilen, wenn
  nicht das Bild entscheidet. Karten zeigen Initialen-Avatare.
- **Melden und Blockieren** existieren im Datenbankschema, aber noch nicht im UI.
- **Kein Push.** Der Anfragen-Feed braucht es, um zu funktionieren.
- **Die Koordinaten der Anlagen** sind aus den Adressen abgeleitet, nicht
  vermessen. Für Distanz-Matching genügt das, für Navigation nicht.
- Die Gegenseite eines Likes wird im lokalen Betrieb simuliert (deterministisch
  über das Spielerpaar, damit ein Match nicht zwischen zwei Starts verschwindet).
