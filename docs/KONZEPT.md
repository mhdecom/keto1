# Tinder Tennis — Konzept

## 1. Das Problem

In Zürich ist die Platzbuchung gelöst. **GotCourts** betreibt seit 2014 die
Online-Reservation für das Sportamt der Stadt Zürich — rund 40 gepflegte
Sandplätze auf acht Anlagen (Mythenquai, Hardhof, Buchlern, Frauental, Lengg,
Eichrain, Fronwald, Sonnenberg). Daneben decken **Eversports** und
**courtsonline.ch** Hallen und private Clubs ab.

Was nicht gelöst ist: **jemanden finden, mit dem sich das Buchen lohnt.**

GotCourts hat das Problem erkannt und eine Liga mit rund 1'900 Spielern gebaut.
Aber das ist ein Ranglisten-Anhängsel eines Buchungssystems, kein
Matching-Produkt: es sortiert Leute nach Ergebnissen, statt sie nach
Spielstärke, Kalender und Anlage zusammenzubringen. Genau dort ist die Lücke.

**Positionierung:** Tinder Tennis ist die Schicht *über* den Buchungssystemen.
Sie besitzt keine Plätze und will keine besitzen — sie besitzt die Leute und die
Passung.

Und der eigentliche Wert liegt noch eine Stufe weiter: Wer wöchentlich zwei
Stunden mit derselben Person auf dem Platz steht, baut einen Kontakt auf. Das
ist eine der wenigen Formen, in denen Erwachsene noch verlässlich neue Leute
kennenlernen — und zwar über eine Aktivität statt über ein Profilfoto. Ein
Apéro danach, manchmal ein beruflicher Austausch: das ist kein Nebeneffekt,
sondern der Grund, warum jemand die App behält, wenn er seinen Partner schon
gefunden hat.

## 2. Das Profil ist das Produkt

Bei einer Dating-App ist das Foto das Produkt. Hier ist es das Profil. Wer die
richtigen Fragen stellt, braucht danach kaum noch Algorithmus.

### Spielstärke — mehrschichtig erfasst

| Signal | Warum |
|---|---|
| **Swiss-Tennis-Klassierung** (N1–N4, R1–R9) | Der CH-Standard, extrem trennscharf, und jede klassierte Person kennt ihre Zahl auswendig. |
| **Jahre Erfahrung** | Grobes, aber robustes Signal für Unklassierte. |
| **Interclub / Mannschaft** (nie / im Club aktiv / 4. Liga+ / 1.–3. Liga) | Wer Mannschaft spielt, spielt unter Druck — das verändert das Spiel messbar. |
| **Rally-Konsistenz** (<5 / 5–10 / 10–20 / 20+ Bälle cross) | Der beste Low-Tech-Proxy im Anfänger- und Mittelbereich, den es gibt. Klingt banal, sagt mehr aus als jede Selbsteinschätzung. |
| **Selbsteinschätzung 1.0–7.0** | Nur für Unklassierte. Verrauscht, aber es ist die eigene Sicht — wird zu 40 % eingerechnet. |

Alle Signale werden auf eine interne **Stärkeskala 0–100** normalisiert
(`src/domain/level.ts`). Nur so lassen sich ein R5 und eine Anfängerin ohne
Lizenz überhaupt vergleichen.

Entscheidend: jede Schätzung trägt ein **Konfidenzmass**. Eine Klassierung ist
0.95, eine reine Selbsteinschätzung 0.45. Die Matching-Toleranz weitet sich bei
tiefer Konfidenz — zwei unsichere Anfänger werden nicht von Zahlen getrennt, die
nie präzise waren.

### Der Rest des Profils

- **Spielform:** Einzel · Doppel · Mixed · Einspielen · Matchtraining
- **Anspruch:** gemütlich ↔ ambitioniert ↔ Wettkampf
- **Belag:** Sand · Hartplatz · Halle · Teppich
- **Stärken und Schwächen** als Tag-Paare: Vorhand, Rückhand, Aufschlag, Return,
  Volley, Slice, Topspin, Beinarbeit, Kondition, Mentales, Konstanz, Taktik
- **Rückhand** ein- oder zweihändig
- **Verfügbarkeit** als Wochenraster: 7 Tage × 3 Blöcke (Früh / Mittag / Abend)
- **Anlagen**, auf die man regelmässig geht
- **Wohnort** als Kreis (nie als Adresse) plus Reiseradius
- **Platz vorhanden?** — wer buchen kann, ist doppelt attraktiv

### Neben dem Platz: Beruf, Interessen, was danach passiert

Drei Felder, die aus einer Partnersuche ein Netzwerk machen:

- **Beruf** als Freitext plus **Branche** aus einer Liste (IT, Finanzen,
  Gesundheit, Pharma, Recht, Beratung, Handwerk, Selbstständig, Studium,
  Pensioniert …)
- **Interessen** als Tags: Essen, Wein, Reisen, Musik, Kunst, Ski, Wandern,
  Velo, Startups, Anlegen, Politik, Familie, Ehrenamt …
- **Nach dem Spiel**: Apéro danach · Zusammen essen · Beruflicher Austausch —
  Mehrfachauswahl, und leer lassen ist eine vollwertige Antwort

**Das ist bewusst eine eigene Achse, getrennt von der Absicht (Dating).** Zwei
Männer aus derselben Branche, die nach dem Spiel noch ein Glas trinken, sind
genau der Fall, um den es hier geht — und der wäre unsichtbar geblieben, hätte
man das in die romantische Absicht hineingefaltet. Es gilt identisch für zwei
Frauen, für gemischte Paarungen, für alle.

### Absicht: so trennt sich Partnersuche von Dating

Drei Optionen statt zwei Apps:

- **Nur Tennis** — du suchst Spielpartner, niemand sieht dich im Dating-Kontext
- **Tennis, offen für mehr** — wenn die Gegenseite dasselbe angibt, wird der
  Chat als Date markiert
- **Match & Liga** — Wettkampf, Ranglisten, ernsthaftes Training

Dazu die Geschlechterpräferenz. Die Kombination löst genau den Fall aus der
Ausgangsidee: Mann sucht Frau *und* beide haben «offen für mehr» gesetzt → Date.
Sucht einer von beiden nur Tennis, bleibt es Tennis. Die Absicht ist **kein
harter Filter**, sondern ein Flag am Match — eine Frau mit «nur Tennis» wird
weiterhin Männern vorgeschlagen, aber nie in einem Dating-Rahmen.

## 3. Der Matching-Score

Kein Zufalls-Deck. Gewichtete Passung, danach sortiert (`src/domain/matching.ts`):

| Faktor | Gewicht | Berechnung |
|---|---|---|
| Spielstärke | **28 %** | Gauss-Abfall über die Stärkedifferenz, Toleranz skaliert mit Konfidenz |
| Zeiten | **22 %** | Überschneidung der Wochenraster, normiert auf das *kleinere* |
| Ort | **16 %** | Gemeinsame Anlagen (65 %) + Luftliniendistanz (35 %) |
| Neben dem Platz | **12 %** | Interessen, Branche und «nach dem Spiel» |
| Spielform | **10 %** | Schnittmenge |
| Anspruch | **7 %** | Ordinale Distanz |
| Belag | **5 %** | Schnittmenge |

**Harte Filter** (keine Abwertung, sondern Ausschluss): Geschlechterpräferenz
beidseitig, Altersfenster beidseitig, und der *engere* der beiden Reiseradien.
Das sind erklärte Präferenzen — wer sie aufweicht, baut einen Bug.

Zwei bewusste Entscheidungen:

- **Zeiten werden auf das kleinere Raster normiert.** Wer nur Dienstagabend
  kann, passt perfekt zu jemandem, der immer kann. Über die Vereinigungsmenge zu
  normieren würde Vielbeschäftigte bestrafen — und genau die brauchen die App.
- **Level-Toleranz ist breit** (≈ zwei Klassen). Eine Klasse stärker ist kein
  Kompromiss, sondern der nützlichste Trainingspartner überhaupt.
  R6↔R5 ergibt 0.74, R6↔R4 0.31, R6↔R3 0.09.

### Wie «Neben dem Platz» gewichtet wird

Der Faktor sitzt unter den drei Tennis-Grundlagen, aber über den restlichen
Vorlieben: ein guter Kontakt, mit dem man nicht spielen kann, ist kein
Tennispartner — aber ein ordentlicher Hit mit jemandem, für den es sich lohnt
zu bleiben, ist genau das Produkt.

Innerhalb des Faktors: 45 % «nach dem Spiel», 35 % gemeinsame Interessen,
20 % beruflich. Drei Regeln machen ihn fair:

1. **Wollen beide nur spielen, ist der Faktor 1.0.** Sie sind sich vollkommen
   einig. Ihre Interessen werden nie gegen sie verwendet — «nur Tennis» darf im
   UI nie wie ein Mangel aussehen.
2. **Will nur eine Seite mehr, gibt es 0.3** statt Ausschluss. Das Tennis
   funktioniert ja trotzdem. Auf der Karte steht dann «Tobias will nur
   spielen» statt einer generischen Floskel.
3. **Interessen werden auf die kürzere Liste normiert**, wie die Zeiten. Wer
   nur drei Dinge angibt, wird dafür nicht bestraft.

Beim beruflichen Teil zählt gleiche Branche am höchsten (gemeinsamer Kontext),
aber eine *andere* Branche liegt nur knapp darunter — quer über Branchen
entstehen oft die wertvolleren Kontakte.

### Der Score erklärt sich selbst

Jede Karte zeigt, *warum* die Person erscheint («Level passt (R6)»,
«3 gemeinsame Zeitfenster (Di Abend, Do Abend)», «Beide auf TA Mythenquai»,
«4 gemeinsame Interessen (Essen & Kochen)», «Beide in Gesundheit & Medizin») —
und den schwächsten Faktor als Caveat («Zeiten passt weniger gut»). Auf dem
Detailprofil steht die vollständige Aufschlüsselung als Balken.

Ein Matching, das sich nicht erklären kann, wird blind durchgewischt. Und wer
Menschen sortiert, schuldet der Person, die auswählt, eine Begründung, der sie
widersprechen kann.

## 4. Das Kaltstart-Problem

Swipen braucht eine Menge. Mit fünfzig Nutzern in einer Stadt ist ein
Swipe-Deck nach drei Minuten leer und die App tot.

Deshalb gibt es von Anfang an einen zweiten Kanal: den **Anfragen-Feed**.

> *«Di 29.09., Abend, TA Mythenquai, Einzel, Niveau R4–R7 — Platz ist gebucht,
> 19:00–20:30, Partner ist krank geworden.»*

Ein konkreter Termin erreicht sofort die richtige Person. Der Feed markiert
zudem, ob die eigene Spielstärke ins gesuchte Fenster fällt.

**Das Deck baut das Netzwerk, der Feed füllt die Plätze.** Beides zusammen
funktioniert ab dem ersten Dutzend Nutzer.

## 5. Platzbuchung — der Weg dorthin

Ziel ist, direkt aus dem Chat heraus zu buchen. Der Weg führt über Verträge, die
es noch nicht gibt, deshalb steckt alles hinter einem austauschbaren
`CourtProvider`-Adapter (`src/lib/courtProviders/`).

### Stufe 1 — heute: Deep-Links
Jede Anlage kennt ihr Buchungssystem. Aus Chat und Profil führt ein Link direkt
zum richtigen Club bei GotCourts oder Eversports. Kein Vertrag nötig, sofort
nützlich.

### Stufe 2 — Verfügbarkeiten und API
GotCourts hat **keine dokumentierte öffentliche API**. Die Club-Profilseiten sind
öffentlich lesbar, aber sie abzugreifen ist eine Frage der Nutzungsbedingungen,
nicht des Codes — das gehört vor die Implementierung, nicht dahinter. Der Adapter
hört deshalb bewusst bei Links auf.

**Empfehlung: Eversports zuerst ansprechen, nicht GotCourts.** Sie haben ein
offeneres Partnerprogramm, decken Hallen und private Clubs ab (das
Ganzjahres-Geschäft) und haben weniger Grund, ein Matching-Produkt als Konkurrenz
zu sehen. Ein Referenz-Integration mit Eversports ist danach das beste Argument
gegenüber GotCourts.

### Stufe 3 — eigenes Inventar
Club-, Firmen- und Privatplätze, die kein System abdeckt. Ab hier ist die App
nicht mehr von einem Anbieter abhängig — und für einen Club, der heute per
Excel-Liste vermietet, ist sie sofort attraktiv.

Das Verhandlungsargument in alle Richtungen ist dasselbe: **Tinder Tennis
erzeugt Buchungen, die sonst nicht stattgefunden hätten.** Ein Spieler ohne
Partner bucht keinen Platz.

## 6. Schweiz-spezifisch, nicht optional

- **revDSG**: Daten in EU/CH-Region halten (Supabase EU). Auskunft, Export,
  Löschung müssen funktionieren.
- **18+** wird bereits bei der Registrierung erzwungen.
- **Melden und Blockieren** sind im Schema von Anfang an vorhanden. Bei einer
  App, über die sich Fremde persönlich verabreden, ist das Pflicht — und die
  App-Store-Richtlinien verlangen es bei Dating-Bezug ausdrücklich.
- **Wohnort nur als Kreis**, nie als Adresse. Präzise genug für «4 km entfernt»,
  ohne zu verraten, wo jemand wohnt.
- **Profile sind nicht öffentlich lesbar.** Discovery läuft über eine
  Datenbankfunktion, die nur passende Kandidaten zurückgibt — die Nutzerbasis
  lässt sich nicht auslesen.

## 7. Stand und nächste Schritte

**Steht:**
Domain-Logik mit 116 Tests · Onboarding-Wizard in neun Schritten · Swipe-Deck
mit Begründungen · Beruf, Interessen und «nach dem Spiel» als eigener
Matching-Faktor · Match und Chat · Anfragen-Feed · bearbeitbares Profil ·
Supabase-Schema mit RLS · Buchungs-Adapter · Light- und Dark-Mode.

**Als Nächstes, in dieser Reihenfolge:**

1. **Auth und Supabase scharf schalten.** Schema und Repository liegen bereit;
   es fehlen die Login-Screens (Apple, Google, Magic Link) und das Anlegen der
   Profilzeile nach der Registrierung.
2. **Fotos.** Bewusst noch nicht drin — ein Matching lässt sich besser
   beurteilen, wenn nicht das Bild entscheidet. Für den echten Betrieb braucht
   es sie, inklusive Moderation.
3. **Push-Benachrichtigungen** für Matches, Nachrichten und passende Anfragen.
   Ohne Push stirbt der Anfragen-Feed an Latenz.
4. **Melden und Blockieren im UI** (Backend steht).
5. **Eversports-Partnergespräch** und Stufe 2 der Buchung.
6. **Beta in Zürich**, am besten über zwei, drei Anlagen und einen Club gestartet
   — eine Matching-App wird nicht stadtweit lanciert, sondern dort, wo die
   Dichte schon existiert.

## 8. Offene Produktfragen

- **Preis.** Gratis mit später Premium (mehr Swipes, Wer-mag-mich)? Oder von
  Anfang an ein kleiner Jahresbeitrag, der Karteileichen fernhält? Für eine
  Nische mit hoher Absicht spricht einiges für Letzteres.
- **Bewertungen nach dem Spiel.** Extrem wertvoll zur Kalibrierung der
  Spielstärke («war stärker als angegeben»), aber heikel — es verwandelt eine
  Partnersuche in ein Bewertungssystem. Vorschlag: nur *Level-Feedback*, nie
  Persönlichkeitsbewertung, und nur für die Schätzung sichtbar.
- **Zuverlässigkeit.** No-Shows sind das zweitgrösste Problem nach dem Finden.
  Eine simple «hat zugesagt und ist erschienen»-Quote wäre stark — dasselbe
  Risiko wie oben.
- **Wie weit soll das Netzwerk gehen?** Die Bausteine für «zeig mir alle aus
  meiner Branche» oder «wer geht auch Ski» liegen im Datenmodell. Ein eigener
  Filter darauf wäre stark — birgt aber das Risiko, dass die App vom Tennis
  wegdriftet und zu einem schlechteren LinkedIn wird. Vorschlag: vorerst nur
  als Ranking-Signal und Anzeige, nicht als Filter.
- **Über Zürich hinaus?** Das Datenmodell ist stadtunabhängig; nur die
  Anlagenliste und die Kreise sind Zürich-spezifisch. Winterthur, Zug und Basel
  wären ein Copy-Paste.
