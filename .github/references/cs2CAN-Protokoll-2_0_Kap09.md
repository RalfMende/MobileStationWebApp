# Automatisierung

Automatisierung bezieht sich auf derzeitige "memory" Funktionen und auch auf die Erweiterung mit Blöcken und komplexen Ablaufsteuerungen.

Automatisierungsbefehle befinden sich derzeit in der Realisation. Daher kann sich das exakte Format der Befehle ändern.

## Befehl: Automatik schalten

Kennung:

Automatik schalten (_0x30_, in CAN-ID: _0x60_) Format:

| Prio                | Command | Resp. | Hash   | DLC   | D-Byte 0     | D-Byte 1 | D-Byte 2           | D-Byte 3 | D-Byte 4 | D-Byte 5  | D-Byte 6 | D-Byte 7 |
| ------------------- | ------- | ----- | ------ | ----- | ------------ | -------- | ------------------ | -------- | -------- | --------- | -------- | -------- |
| 2+2 Bit             | 8 Bit   | 1 Bit | 16 Bit | 4 Bit | 8 Bit        | 8 Bit    | 8 Bit              | 8 Bit    | 8 Bit    | 8 Bit     | 8 Bit    | 8 Bit    |
| Message Prio        |         | 0     |        | 6     | Gerätekenner |          | Automatik Funktion |          | Stellung | Parameter |          |          |
|                     |         |       |        |       | High         | Low      | High               | Low      |          |           |          |          |
| Message<br><br>Prio |         | 1     |        | 6     | Gerätekenner |          | Automatik Funktion |          | Status   | Parameter |          |          |
|                     |         |       |        |       | High         | Low      | High               | Low      |          |           |          |          |
| Message<br><br>Prio |         | 1     |        | 8     | Gerätekenner |          | Automatik Funktion |          | Loc-ID   |           |          |          |
|                     |         |       |        |       | High         |          |                    | Low      | High     |           |          | Low      |

Beschreibung:

Mitteilung von Statusinformationen zu Automatisierungsblöcken, bzw "memory"-Funktion, Automatikfunktion in CS2 auslösen.

Mit Gerätekenner und Automatik Funktion wird bestimmt, wer welche "Memory Funktion" auslösen soll. Gerätekenner wird mit der Systemfunktion "Geräte Kennung" zugeordnet.

"Memory Funktion" ist die Automatikfunktion zum Auslösen. Dabei ist im Highbyte der Zeilen-Index der Automatikfunktion (Wertebereich: A-Z, a-z) und im Lowbyte der Spaltenindex (Wertebereich:1-8). Wird eine Erweiterung benötigt, so wird der Wertebereich erweitert.

Anfordern einer Automatikfunktion, Stellung bestimmt die Auslösung:

1. für Freigeben / Deaktivieren
2. für Aktiveren.

Beim Ausbau der Automatikfunktionen können weitere Stati eingeführt werden (wie Sperren, Reservieren oder Freigeben).

Mitteilen einer Statusänderung, Verwendung für Anzeige und Ablaufkontrolle: Bei der Antwort wird der aktuelle Aktivierungsstatus mitgeteilt:

0: Automatikfunktion deaktiviert, (Derzeitig: Nicht markiert)

1: Automatikfunktion aktiviert, (Derzeitig: Grün markiert)

2: Automatikfunktion im Ablauf, beim Einlaufen. (Derzeitig: Gelb Markiert)

_3: Block frei (Darstellung: Frei)_

_4: Block felegt (Darstellung: Belegt)_

_5: Block / Automatikfunktion Suspendiert, Wartet. (Darstellung: Wartend) 6: Block / Automatikfunktion Reserviert, Vorbelegt. (Darstellung: Reserviert) 254: Automatikfunktion wartet_

_255: Automatikfunktion Ablauffehler. (Darstellung: Status unbekannt)_

Weitere Stati können im Laufe der Entwicklung hinzukommen. Daher muss ein Endgerät unbekannte Stati und Memoryfunktionen als "Automatikfunktion Ablauffehler" mit Darstellung "Status unbekannt" interpretieren.

Die Farben zu den Block/Automatikstatus lässt sich durch den Benutzer einstellen.

Besonderheiten:

Wird nur von Graphical User Interface Prozessor verarbeitet.

Auslösung erfolgt durch Bediengerät oder weiterem Automatisierungsgerät.

Pro Auslösebefehl können mehrere Statusbefehle(Antworten) folgen, damit der entsprechende Status in den angeschlossenen Steuergeräten aktualisiert werden kann.

Sonderfall Broadcastadresse: Die Funktion wird NUR vom Master ausgeführt.