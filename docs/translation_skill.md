# Skill: Modellbahn-Steuerungssoftware – Code- und Localization-Optimierung

## Ziel

Optimiere Code, UI-Texte und Übersetzungen einer App zur Steuerung von digitalen Modellbahnanlagen.

Dabei müssen technische Korrektheit, konsistente Terminologie, verständliche Benutzerführung und etablierter Modellbahn-Fachjargon gemeinsam berücksichtigt werden.

---

## 1. Grundprinzipien

Bei jeder Änderung:

* Bestehende Funktionalität nicht unbeabsichtigt verändern.
* Bestehende Key-Strukturen und Datenformate beibehalten.
* Keine Übersetzungen wörtlich aus dem Deutschen ableiten, wenn im jeweiligen Sprachraum ein etablierter Fachbegriff existiert.
* Fachbegriffe innerhalb der gesamten Anwendung konsequent verwenden.
* UI-Texte kurz, natürlich und eindeutig formulieren.
* Technische Begriffe von Produktnamen unterscheiden.
* Keine unnötigen Umformulierungen vornehmen, wenn der bestehende Text bereits fachlich korrekt und natürlich ist.
* Bei Unsicherheit zwischen sprachlicher Natürlichkeit und technischer Präzision die technische Bedeutung erhalten und eine möglichst natürliche Formulierung wählen.

---

## 2. Verbindliche Modellbahn-Terminologie

### Deutsch → Englisch

| Deutsch               | Englisch                |
| --------------------- | ----------------------- |
| Modellbahn            | model railway           |
| Zentrale              | command station         |
| Mini-Zentrale         | compact command station |
| Gleisbox              | Gleisbox                |
| Lokomotive / Lok      | locomotive              |
| Zubehör               | accessories             |
| Weiche                | turnout                 |
| Fahrstraße            | route                   |
| Rückmeldung           | feedback                |
| Rückmeldemodul        | feedback module         |
| Lokliste              | locomotive list         |
| Lokdatenbank          | locomotive database     |
| Gleisspannung         | track power             |
| Digitalbetrieb        | digital operation       |
| Steuerungssoftware    | control software        |
| Steuer-App            | control app             |
| automatischer Betrieb | automated operation     |

### Deutsch → Französisch

| Deutsch               | Französisch                     |
| --------------------- | ------------------------------- |
| Modellbahn            | réseau miniature                |
| Zentrale              | centrale                        |
| Mini-Zentrale         | mini-centrale                   |
| Gleisbox              | Gleisbox                        |
| Lokomotive            | locomotive                      |
| Zubehör               | accessoires                     |
| Weiche                | aiguillage                      |
| Fahrstraße            | itinéraire                      |
| Rückmeldung           | rétrosignalisation              |
| Rückmeldemodul        | module de rétrosignalisation    |
| Lokliste              | liste des locomotives           |
| Lokdatenbank          | base de données des locomotives |
| Gleisspannung         | alimentation de la voie         |
| Digitalbetrieb        | exploitation numérique          |
| Steuerungssoftware    | logiciel de commande            |
| Steuer-App            | application de commande         |
| automatischer Betrieb | conduite automatique            |

### Deutsch → Niederländisch

| Deutsch               | Niederländisch              |
| --------------------- | --------------------------- |
| Modellbahn            | modelspoorbaan              |
| Zentrale              | centrale                    |
| Mini-Zentrale         | compacte modelspoorcentrale |
| Gleisbox              | Gleisbox                    |
| Lokomotive            | locomotief                  |
| Zubehör               | accessoires                 |
| Weiche                | wissel                      |
| Fahrstraße            | rijweg                      |
| Rückmeldung           | terugmelding                |
| Rückmeldemodul        | terugmeldmodule             |
| Lokliste              | locomotievenlijst           |
| Lokdatenbank          | locomotievendatabase        |
| Gleisspannung         | baanspanning                |
| Digitalbetrieb        | digitaal bedrijf            |
| Steuerungssoftware    | besturingssoftware          |
| Steuer-App            | besturingsapp               |
| automatischer Betrieb | automatisch bedrijf         |

---

## 3. Englische UI-Terminologie

Bevorzugte Formulierungen:

* `model railway central station`
  → `model railway command station`

* `mini central`
  → `compact command station`

* `PC control program`
  → `PC control software`

* `Web controls`
  → `Web-based control`

* `Central interfaces`
  → `Command station interfaces`

* `feedback sensors`
  → `feedback modules` bzw. `feedback devices`

* `Connect Z21`
  → `Connect to Z21`

* `Wifi`
  → `Wi-Fi`

* `take the controls`
  → `choose how to control your model railway`

* `READINESS`
  → `SYSTEM STATUS` bzw. `STATUS`, sofern tatsächlich der Systemzustand gemeint ist.

* `health check`
  → `status check`

* `Select a Wifi from the list first.`
  → `Select a Wi-Fi network from the list first.`

* `Wifi action failed`
  → `Wi-Fi operation failed`

### Wichtig

`Central Station` darf nicht pauschal als Übersetzung von `Zentrale` verwendet werden.

Wenn das konkrete Produkt von Märklin gemeint ist, muss der offizielle Produktname erhalten bleiben:

* `Märklin Central Station 2`
* `Märklin Central Station 3`
* `Märklin Central Station 2/3`

Für eine generische Modellbahn-Zentrale dagegen:

* `command station`

---

## 4. Französische Terminologie

Französische Übersetzungen sollen technisch präzise und natürlich klingen.

Bevorzugt:

* `réseau miniature` für Modellbahn
* `centrale` für Zentrale
* `itinéraire` für Fahrstraße
* `module de rétrosignalisation` für Rückmeldemodul

Bei Statusbezeichnungen:

`DISPONIBILITÉ` nicht automatisch für deutsches `BEREITSCHAFT` verwenden.

Je nach Bedeutung bevorzugen:

* `ÉTAT DU SYSTÈME`
* `ÉTAT DE PRÉPARATION`

Für:

`current system and model railway availability`

besser:

`état actuel du système et du réseau miniature`

---

## 5. Niederländische Terminologie

Auf natürliche niederländische Fachsprache achten.

Beispiel:

Falsch bzw. grammatikalisch problematisch:

`een compact modelspoorcentrale`

Besser:

`een compacte modelspoorcentrale`

oder, falls technisch zutreffend:

`een compacte digitale modelspoorcentrale`

Weitere bevorzugte Begriffe:

* `besturingssoftware` statt `besturingsprogramma`
* `rijweg` für eine tatsächliche Fahrstraße
* `terugmeldmodule` für Rückmeldemodule
* `wissels` für Weichen
* `statuscontrole` statt `gezondheidscheck`

Beispiel:

`Een snelle gezondheidscheck voor je SRSEII.`

→

`Een snelle statuscontrole van je SRSEII.`

---

## 6. Produktnamen und technische Schnittstellen

Produkt- und Protokollnamen niemals unnötig übersetzen.

Beispiele:

* Gleisbox
* SRSEII
* Z21
* Märklin Central Station 2/3
* CAN
* S88
* CS2
* CS3
* Rocrail
* iTrain
* Win-Digipet
* TCP
* UDP
* SSH

Offizielle Produktnamen unverändert lassen.

Generische Begriffe dagegen lokalisieren.

Beispiel:

`command station interface`

kann übersetzt werden.

`Märklin Central Station 2 interface`

soll als Produkt-/Schnittstellenbezeichnung erhalten bleiben.

---

## 7. Code-Optimierung

Bei der Optimierung des Codes zusätzlich prüfen:

### Konsistenz

* gleiche Begriffe für gleiche Funktionen
* keine wechselnden Bezeichnungen wie `central`, `central station`, `command station`
* keine Mischung aus `WiFi`, `Wifi` und `Wi-Fi`
* keine wechselnden Begriffe wie `feedback sensor`, `feedback device` und `feedback module`, wenn dasselbe technische Objekt gemeint ist

### Localization Keys

Bestehende Keys möglichst nicht umbenennen.

Beispiel:

```text
aboutDescription
aboutFeatures
itrainIntroText
winDigipetIntroText
```

Keys bleiben stabil; nur der lokalisierte Inhalt wird verbessert.

### Texte nicht in Code duplizieren

Wenn mehrere UI-Stellen dieselbe Bedeutung haben, bevorzugt gemeinsame Localization Keys verwenden.

### Technische Begriffe nicht automatisch übersetzen

Bei Protokollen, Schnittstellen und Produktnamen zuerst prüfen, ob es sich um:

1. einen Produktnamen,
2. einen Protokollnamen,
3. einen etablierten Fachbegriff oder
4. einen normalen UI-Begriff

handelt.

Nur Kategorie 4 sollte grundsätzlich frei lokalisiert werden.

---

## 8. UI-Texte

UI-Texte sollen:

* kurz sein
* aktiv formuliert sein
* eindeutig sein
* technisch korrekt sein
* keine unnötigen Anglizismen enthalten
* auf Desktop und Mobile funktionieren

Bevorzugt:

`Connect to Z21`

statt:

`Connect Z21`

Bevorzugt:

`Select a Wi-Fi network`

statt:

`Select a Wifi`

Bevorzugt:

`System status`

statt:

`Readiness`

wenn tatsächlich ein allgemeiner Systemstatus angezeigt wird.

---

## 9. Änderungsregeln

Bei einer Code-/Localization-Prüfung Änderungen nach diesen Kategorien bewerten:

### Muss geändert werden

* grammatikalisch falsch
* technisch falscher Fachbegriff
* missverständliche Bedeutung
* falscher Produktname
* inkonsistente Terminologie
* irreführende UI-Beschriftung

### Sollte geändert werden

* unnatürliches Wording
* wörtliche Übersetzung
* ungebräuchlicher Fachbegriff
* unnötig komplizierte Formulierung

### Kann bleiben

* fachlich korrekt
* natürlich formuliert
* etablierter Begriff
* keine Inkonsistenz im Projekt

Nicht aus stilistischen Gründen ändern, wenn dadurch kein echter Qualitätsgewinn entsteht.

---

## 10. Prüfverfahren

Bei jeder Localization-Datei:

1. Alle Sprachblöcke identifizieren.
2. Keys zwischen den Sprachen vergleichen.
3. Fehlende Übersetzungen erkennen.
4. Fachbegriffe auf Konsistenz prüfen.
5. Produktnamen und Protokollnamen prüfen.
6. Grammatik und natürliche Sprache prüfen.
7. UI-Länge und Verständlichkeit prüfen.
8. Deutsche Bedeutung mit der jeweiligen Übersetzung abgleichen.
9. Nur notwendige Änderungen vornehmen.
10. Anschließend nochmals auf konsistente Terminologie im gesamten Projekt prüfen.

Ausgabe bei einer Review:

| Key          | Sprache | Aktuell        | Empfehlung | Grund                     |
| ------------ | ------- | -------------- | ---------- | ------------------------- |
| `exampleKey` | EN      | aktueller Text | neuer Text | Fachterminologie          |
| `exampleKey` | NL      | aktueller Text | neuer Text | Grammatik                 |
| `exampleKey` | FR      | aktueller Text | neuer Text | natürlichere Formulierung |

---

## 11. Priorität bei Konflikten

Wenn mehrere Formulierungen möglich sind, gilt diese Reihenfolge:

1. Technische Bedeutung
2. Etablierter Modellbahn-Fachjargon
3. Konsistenz innerhalb der App
4. Natürliche Sprache der Zielsprache
5. Kürze und UI-Lesbarkeit
6. Stilistische Optimierung

Keine stilistische Verbesserung durchführen, wenn dadurch die technische Bedeutung verändert werden könnte.

---

## 12. Ziel

Der fertige Code soll sich so anfühlen, als sei die App ursprünglich für die jeweilige Sprache entwickelt worden.

Die Übersetzungen sollen insbesondere bei Modellbahn-Themen von einem technisch versierten Anwender als natürlich und fachlich korrekt erkannt werden.

Dabei gilt:

**Nicht möglichst viel ändern, sondern gezielt die Stellen verbessern, an denen Terminologie, Grammatik, technische Bedeutung oder UI-Verständlichkeit tatsächlich profitieren.**
