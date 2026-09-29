# App-Store-Material

## Screenshots

`screenshots/6.9-zoll/` (1320 × 2868) und `screenshots/6.5-zoll/` (1242 × 2688)
— genau die Pixelmasse, die App Store Connect akzeptiert.

**Das sind Arbeitsstände, keine fertigen Store-Assets.** Erzeugt wurden sie aus
dem Web-Build im Browser, mit `tools/` und Playwright. Für die endgültige
Einreichung solltest du sie im iOS-Simulator oder auf einem echten Gerät neu
aufnehmen: Statusleiste, Systemschrift und Safe Areas sehen dort anders aus.
Reihenfolge und Bildauswahl kannst du aber übernehmen — sie erzählen die
Geschichte in der richtigen Abfolge:

1. **Entdecken** — eine Karte, die begründet, warum diese Person erscheint
2. **Passung** — die aufgeschlüsselte Bewertung, das Unterscheidungsmerkmal
3. **Anfragen** — konkrete Termine, die Antwort auf das Kaltstart-Problem
4. **Match** — der Moment
5. **Chat** — mit Buchungs-Links für gemeinsame Anlagen
6. **Profil** — was die App über dein Spiel weiss

Für den Store lohnt es sich, je Bild eine kurze Textzeile darüberzulegen
(«Nach Spielstärke, nicht nach Foto»). Das machen praktisch alle und es erhöht
die Installationsrate spürbar.

## Was sonst noch in den Eintrag gehört

- **Untertitel** (30 Zeichen): `Tennispartner in Zürich finden`
- **Werbetext** (170 Zeichen): frei änderbar ohne neue Review
- **Beschreibung**: der Aufhänger aus `docs/KONZEPT.md`, Abschnitt 1 — Plätze
  buchen ist gelöst, jemanden finden nicht
- **Schlüsselwörter**: Tennis, Spielpartner, Zürich, Sandplatz, Interclub,
  Klassierung, Doppel, Trainingspartner
- **Altersfreigabe**: 17+ wegen des Dating-Anteils
- **Support-URL** und **Datenschutz-URL**: siehe `docs/TESTFLIGHT.md`

Das App-Icon liegt in `assets/images/icon.png` (1024 × 1024, deckend, ohne
Alphakanal und ohne abgerundete Ecken — so verlangt es Apple). Erzeugt von
`tools/make_icon.py`; Farben oder Proportionen ändern sich dort an einer Stelle
für den ganzen Satz.
