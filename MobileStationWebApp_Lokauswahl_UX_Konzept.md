# UX-Konzept für die Lokauswahl (MobileStationWebApp)

## Ausgangssituation

Aktuell gibt es auf dem Hauptbildschirm eine horizontale, scrollbare Lokleiste am unteren Rand.
Dieses Konzept ist grundsätzlich sehr gut für eine Fahrsteuerung geeignet, da der Lokwechsel jederzeit erreichbar bleibt.

Problem:
- Bei mehr als ca. 10 Loks wird die Leiste unübersichtlich.
- Viele Loks sind selten relevant.
- Auf dem iPhone ist Bildschirmfläche begrenzt.

Ziel:
- Schneller Lokwechsel während des Betriebs
- Einfache Bedienung
- Wenig UI-Komplexität
- Gute Skalierung bis 100+ Loks

---

# Grundprinzip

Nicht alle Loks müssen jederzeit sichtbar sein.

Stattdessen:

1. Lok-Dock für aktuell relevante Loks
2. Vollständige Lokliste in einem Auswahl-Dialog
3. Suche statt vieler Filter
4. Automatische Sortierung nach Nutzung

---

# Konzept 1: Lok-Dock

Die bestehende horizontale Leiste bleibt erhalten.

Beispiel:

[218] [103] [64] [ICE] [+]

Das Dock enthält nur die aktuell relevanten Loks.

Mögliche Maximalgröße:
- 6 bis 8 Einträge

Vorteile:
- Sehr schneller Wechsel
- Keine lange Scrollliste
- Passt perfekt zum Fahrbetrieb

---

# Konzept 2: Automatische Reihenfolge (Recent Stack)

Das Dock sortiert sich automatisch nach Nutzung.

Beispiel:

Vorher:

[218] [103] [64] [ICE]

Benutzer aktiviert V200

Danach:

[V200] [218] [103] [64] [ICE]

Regeln:

- Aktivierte Lok wandert nach ganz links
- Bereits vorhandene Lok wird nach vorne verschoben
- Älteste Einträge rutschen nach hinten
- Bei vollem Dock wird der älteste Eintrag entfernt

Vorteile:

- Kein manuelles Sortieren
- System lernt automatisch das Nutzungsverhalten
- Die wahrscheinlich nächste Lok ist meist sichtbar

---

# Konzept 3: Plus-Button öffnet Lok-Auswahl

Der letzte Eintrag im Dock ist ein "+" Button.

Beispiel:

[218] [103] [64] [+]

Beim Antippen öffnet sich ein Bottom Sheet.

---

# Konzept 4: Lok-Auswahl als Bottom Sheet

Aufbau:

Suche

Zuletzt benutzt

Favoriten

Alle Loks

Beispiel:

🔍 Lok suchen

Zuletzt benutzt
BR218
BR64

Favoriten
BR103
ICE3

Alle Loks
003 BR64
018 BR218
040 BR103
200 ICE3

Vorteile:

- Hauptbildschirm bleibt aufgeräumt
- Große Lokbestände bleiben bedienbar

---

# Konzept 5: Suche statt komplexer Filter

Empfehlung:

Nur ein Suchfeld.

Suche in:

- Lokname
- Baureihe
- Adresse

Beispiele:

"218"
→ findet Adresse

"BR"
→ findet Baureihen

"ICE"
→ findet Namen

Vorteile:

- Weniger UI
- Weniger Erklärungsbedarf
- Funktioniert auch bei 100+ Loks

---

# Konzept 6: Favoriten

Optionaler Favoritenbereich.

Favoriten werden manuell gesetzt.

Beispiel:

⭐ Favoriten

BR218
BR103
ICE3

Vorteile:

- Häufig genutzte Loks dauerhaft verfügbar
- Einfaches Konzept

---

# Konzept 7: Sortierung der Gesamtliste

Empfehlung:

Alle Loks standardmäßig nach Adresse sortieren.

Beispiel:

003 BR64
018 BR218
040 BR103
200 ICE3

Warum Adresse?

- Eindeutig
- Stabil
- Viele Modellbahner kennen ihre Lokadressen

Keine sichtbare Sortierfunktion notwendig.

---

# Konzept 8: Aktive Lok hervorheben

Die aktuell gesteuerte Lok sollte sofort erkennbar sein.

Beispiele:

- Größere Darstellung
- Hervorhebung
- Rahmen
- Hintergrundfarbe

Beispiel:

[218] 103 64 ICE

Vorteil:

- Sofort erkennbar welche Lok aktuell gesteuert wird

---

# Konzept 9: Long Press Menü

Langer Druck auf eine Lok im Dock.

Mögliche Aktionen:

- Favorit setzen
- Favorit entfernen
- Aus Dock entfernen
- Lokinformationen anzeigen

Dadurch werden zusätzliche Buttons vermieden.

---

# Konzept 10: Visuelle Erkennung

Zusätzliche Kennzeichnungen können helfen.

Beispiele:

🚂 Dampflok
⚡ Elektrolok
⛽ Diesellok
🚄 Triebzug

Alternativ:

- kleine Vorschaubilder
- Typ-Symbole
- farbige Marker

Vorteil:

- Schnellere Erkennung im Augenwinkel

---

# Konzept 11: Gepinnte Lokomotiven

Optional.

Bestimmte Loks können angeheftet werden.

Beispiel:

📌218
103
64
ICE

Angeheftete Loks werden nicht automatisch aus dem Dock entfernt.

---

# Konzept 12: Schnelle Adressauswahl

Optional für Power-User.

Eingabe einer Lokadresse:

218

→ Lok wird sofort aktiviert

Vorteil:

- Sehr schnell bei großen Lokbeständen

---

# Empfohlene Roadmap

## Stufe 1

Implementieren:

- Lok-Dock behalten
- Recent-Stack Logik
- Aktive Lok hervorheben

## Stufe 2

Implementieren:

- Plus-Button
- Bottom Sheet Lokauswahl
- Suchfeld

## Stufe 3

Implementieren:

- Favoriten
- Long Press Menü

## Stufe 4 (optional)

Implementieren:

- Gepinnte Loks
- Lokbilder
- Schnellwahl per Adresse

---

# Finale Empfehlung

Für die beste Balance aus Einfachheit und Bedienkomfort:

Behalten:
- Horizontale Lokleiste

Ergänzen:
- Automatische Sortierung nach Nutzung
- Plus-Button
- Bottom-Sheet Lokauswahl
- Suche
- Favoriten
- Hervorhebung der aktiven Lok

Bewusst NICHT hinzufügen:
- Komplexe Filterdialoge
- Mehrere Sortiermodi
- Zu viele Einstellmöglichkeiten

Das hält die Bedienung auf dem iPhone einfach und skaliert trotzdem auf sehr große Lokbestände.
