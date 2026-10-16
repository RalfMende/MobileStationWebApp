# Rückmeldungen

### Adressierung von Kontakten im System Märklin digital

S88 Kontakte können sich an mehreren Geräten im System befinden. Also an jeder CS2 oder an mehren S88 Devices. Ziel ist die Bildung einer eindeutigen 32 Bit Kontaktkennung, welche ebenso den Austausch eines Gerätes ermöglicht.

Bildung einer Kontaktkennung aus 2 Teilen:

16 Bit "Gerätekennung", 16 Bit Kontaktnummer -> Somit maximal eine 32 Bit "UID" - Zahl.

Die Kontaktkennung wird gebildet aus einer konfigurierten Bezeichnung (dem Geräte - Kenner) und Kontaktnummer im Gerät. (Erfordert die Einrichtung der Geräte, siehe Systembefehl "Geräte Kennung") Durch diese Systematik ist der Austausch eines Gerätes möglich, ohne dass die Automatisierungsfunktionen auf die geänderten Geräteadressen angepasst werden müssten. Siehe auch Beschreibung der Rückmelde-UIDs

### Kompatibilitätsmodus (S88 Polling)

Registerbasierend. Analog der Ursystematik der S88 Rückmeldung löscht das Lesen die Register.

Verwendbar, wenn genau ein Steuergerät die Rückmeldungen auswertet. Als Kompatibilitätsmodus für bestehende Steuerungsrealisierungen.

### Neue Meldungssystematik im Märklin Digital System

Die Grundlage dieser Erweiterung ist:

- Änderungen an Kontakten führen zu Mitteilungen auf dem Kommunikationsbus. Pro Kontakt wird eine Meldung für das Betätigen und eine für das Freiwerden erzeugt.
- Abfrage des aktuellen Belegt - Zustandes eines Kontakts. Das Lesen behält den Zustand bei. Mehrmaliges Lesen ist möglich, auch von verschiedenen Geräten.
- _Erweiterung beim Lesen: Hierbei wird die Zeit mitgeteilt, seit der letzten Änderung des Zustandes. Wunsch: Zeit zur letzten Flanke und Zeit zur vorletzten Flanke. (Kann für Geschwindigkeits-Bestimmung verwendet werden.)?_

### Maßnahmen zur Reduktion von Meldungsfluten

Diese Maßnahmen dienen der Reduktion der Busbelastung durch viele Meldungen:

- Filter für "flackernde" Kontakte:

"Frei - Entprellung" Kurze Freipausen werden gefiltert, also der Event "Frei" wird nur dann gesendet, wenn innerhalb eines Timeouts keine erneute Belegung erfolgt.

Diese Funktion kann, je nach Rückmeldegerät ebenso als generelle Entprellung stattfinden.

- Größe der Anlage -> hohe Anzahl Rückmeldekontakte

_Werden Rückmeldekontakte von Busteilnehmern ausgewertet? Also nur Senden, wenn Interessent vorhanden? Dies könnte nur für CS2 interessant sein. CAN-S88 Device eher nicht, da dieses keine Kontakte auswertet._

| Prio                | Command     | Resp. | Hash   | DLC   | D-Byte 0   | D-Byte 1 | D-Byte 2 | D-Byte 3 | D-Byte 4             | D-Byte 5 | D-Byte 6 | D-Byte 7 |
| ------------------- | ----------- | ----- | ------ | ----- | ---------- | -------- | -------- | -------- | -------------------- | -------- | -------- | -------- |
| 2+2 Bit             | 8 Bit       | 1 Bit | 16 Bit | 4 Bit | 8 Bit      | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit                | 8 Bit    | 8 Bit    | 8 Bit    |
| Message<br><br>Prio | S88 Polling | 0     |        | 5     | Geräte UID |          |          |          | Modul-<br><br>anzahl |          |          |          |
|                     |             |       |        |       | High       |          |          | Low      |                      |          |          |          |
| Message Prio        | S88 Polling | 1     |        | 7     | Geräte UID |          |          |          | Modul                | Zustand  |          |          |
|                     |             |       |        |       | High       |          |          | Low      |                      |          |          |          |

Beschreibung:

Kompatibilitätsmodus zum bestehenden S88 System.

1. Agiert wie die alten Befehle 6050 / 6051. "Liest den S88 Bus ein" und löscht damit die Zwischenpuffer / Register.
2. Abfrage des aktuellen Zustands eines Eingangs. Liefert den Zustand des letzten Lesezyklus vom S88 Bus.

In der Anfrage wird durch die Start - Kontaktkennung das zugehörige System und S88 - Modul spezifiziert. Im Parameter Modulanzahl wird die Anzahl der abzufragenden Module spezifiziert.

Die Antwort ist immer Modulbasierend. Pro Antwort wird der Zustand von den 16 Eingängen eines S88 Moduls zurückgemeldet. Werden mehr als ein Modul abgefragt, so antwortet der Empfänger mit mehreren Antworttelegrammen, pro Modul ein Telegramm. In Kontaktkennung und Modul stehen die entsprechenden Angaben, in Zustand der aktuelle S88 Belegtzustand.

Besonderheiten:

Durch das Löschen des Zwischenpuffers muss in einer Mehrgeräteumgebung jeder Teilnehmer die Antworten entsprechend "mithören"

Durch das neue Konzept des Märklin Digital Systems sollte dieser Befehl nicht verwendet werden. Es ermöglicht mehreren Teilnehmern die Auswertung von Rückmeldungen und die Behandlung mehrerer Rückmeldebusse.

| Prio                | Command                | Resp. | Hash   | DLC   | D-Byte 0     | D-Byte 1 | D-Byte 2       | D-Byte 3 | D-Byte 4    | D-Byte 5    | D-Byte 6 | D-Byte 7 |
| ------------------- | ---------------------- | ----- | ------ | ----- | ------------ | -------- | -------------- | -------- | ----------- | ----------- | -------- | -------- |
| 2+2 Bit             | 8 Bit                  | 1 Bit | 16 Bit | 4 Bit | 8 Bit        | 8 Bit    | 8 Bit          | 8 Bit    | 8 Bit       | 8 Bit       | 8 Bit    | 8 Bit    |
| Message<br><br>Prio | Rückmelde<br><br>Event | 0     |        | 4     | Gerätekenner |          | Kontaktkennung |          |             |             |          |          |
|                     |                        |       |        |       | High         | Low      | High           | Low      |             |             |          |          |
| Message Prio        | Rückmelde Event        | 0     |        | 5     | Gerätekenner |          | Kontaktkennung |          | Parameter   |             |          |          |
|                     |                        |       |        |       | High         | Low      | High           | Low      |             |             |          |          |
| Message Prio        | Rückmelde Event        | 1     |        | 8     | Gerätekenner |          | Kontaktkennung |          | Zustand alt | Zustand neu | Zeit     |          |
|                     |                        |       |        |       | High         | Low      | High           | Low      |             |             |          |          |

Beschreibung:

Meldung für Zustandsänderungen im System. Dabei ist die Meldung so gestaltet, dass auch Analogwerte mitgeteilt werden können.

Form 1, DLC = 4: Abfrage des aktuellen Status eines Eingangs, Anwort mit DLC = 8

Form 2, DLC = 5: Einen Eingang für verteilte Anwendung anmelden und das Versenden von Statusänderungen einschalten, Antwort mit DLC = 8.

Die Antwort auf ein Kommando erfolgt immer mit DLC=8. In der Antwort wird der aktuelle Status des Rückmelder mitgeteilt. Weitere Teilnehmer können diese Meldung verwenden, damit der interne Status richtig gestellt werden kann.

_Welche Eigenschaften ein Rückmelder hat, kann derzeitig noch nicht festgestellt werden. Angedacht sind hier Zählmodule, Geschwindigkeitsmodule, etc._
