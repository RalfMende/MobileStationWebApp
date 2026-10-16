# Sonstige Befehle

\_**\_**\___

## Befehl: Softwarestand Anfrage / Teilnehmer Ping

Kennung:

Softwarestand / Teilnehmer Ping (_0x18_, in CAN-ID: _0x30_) Format:

| Prio                | Command                 | Resp. | Hash   | DLC   | D-Byte 0            | D-Byte 1 | D-Byte 2 | D-Byte 3 | D-Byte 4          | D-Byte 5 | D-Byte 6      | D-Byte 7 |
| ------------------- | ----------------------- | ----- | ------ | ----- | ------------------- | -------- | -------- | -------- | ----------------- | -------- | ------------- | -------- |
| 2+2 Bit             | 8 Bit                   | 1 Bit | 16 Bit | 4 Bit | 8 Bit               | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit             | 8 Bit    | 8 Bit         | 8 Bit    |
| Message<br><br>Prio | SW-Stand<br><br>Anfrage | 0\|1  |        | 0\|8  | Absender Geräte UID |          |          |          | SW-Versionsnummer |          | Gerätekennung |          |
|                     |                         |       |        |       | High                |          |          | Low      |                   |          |               |          |

Beschreibung:

Jedes Gerät antwortet mit den entsprechenden Daten. Damit wird die Konfigurationsabfrage aller am CAN Bus erreichbarer Teilnehmer erreicht.

DLC = 0:

Abfrage aller Teilnehmer am Bus. DLC = 8

Bei der Antwort wird die UID durch die des antwortenden Gerätes ersetzt. Somit kann die Graphical User Interface Prozessor bestimmen, welche Geräte angeschlossen sind.

Versionsnummer ist ein Kennung der Softwareversion.

In Byte 6 und Byte 7 (DB) steht Big-Endian codiert die Typ-Information des Geräts. Zur Zeit sind folgende Gerätekennungen festgelegt:

| Gerätekennung | Gerät                                                     |
| ------------- | --------------------------------------------------------- |
| 0x00 0x00     | Gleis Format Prozessor 60213,60214 / Booster 60173, 60174 |
| 0x00 0x10     | Gleisbox 60112 und 60113                                  |
| 0x00 0x20     | Connect 6021 Art-Nr.60128                                 |
| 0x00 0x30     | MS 2 60653, Txxxxx                                        |
| 0xFF 0xE0     | Wireless Devices                                          |
| 0xFF 0xFF     | CS2-GUI (Master)                                          |

Besonderheiten:

Es antworten nur die Steuergeräte. Keine Lokdecoder.

## Befehl: Statusdaten Konfiguration

Kennung:

Statusdaten (_0x1D_, in CAN-ID: _0x3A_) Format:

| Prio                | Command            | Resp. | Hash   | DLC   | D-Byte 0        | D-Byte 1 | D-Byte 2 | D-Byte 3 | D-Byte 4 | D-Byte 5     | D-Byte 6 | D-Byte 7 |
| ------------------- | ------------------ | ----- | ------ | ----- | --------------- | -------- | -------- | -------- | -------- | ------------ | -------- | -------- |
| 2+2 Bit             | 8 Bit              | 1 Bit | 16 Bit | 4 Bit | 8 Bit           | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit        | 8 Bit    | 8 Bit    |
| Message<br><br>Prio | Statusdaten        | 0     |        | 5     | Ziel Geräte-UID |          |          |          | Index    |              |          |          |
|                     |                    |       |        |       | High            |          |          | Low      |          |              |          |          |
| Message Prio        | Statusdaten Stream | 1     | Paket# | 8     | Byte 0          | Byte 1   | Byte 2   | Byte 3   | Byte 4   | Byte 5       | Byte 6   | Byte 7   |
| Message Prio        | Statusdaten        | 1     |        | 6     | Geräte-UID      |          |          |          | Index    | Paket-anzahl |          |          |
|                     |                    |       |        |       | High            |          |          | Low      |          |              |          |          |

Beschreibung:

Abfrage der Beschreibung der Messwertdaten und der Konfigurationsdaten eines Gerätes.

#### Messwertdaten eines Endgerätes

Messwertdaten eines Gerätes sind in Indices gegliedert. Zu jedem Index gehört eine Beschreibung. In der Antwort sind für jeden Index die im Gerät gespeicherten Konfigurationsdaten enthalten. Index 0 ist die Gerätebeschreibung und enthält unter anderem die Anzahl der zur Verfügung gestellten Messwerte. Jeder weitere Index liefert eine Beschreibung, wie der entsprechende Messkanal dargestellt werden kann. Die Indices für Messwerte beginnen bei 1 und dürfen hier keine Lücken enthalten.

Die Übertragung der Daten erfolgt als Datenstrom, im Hash befindet sich die Paketnummer.

Der Abschluss der Übertragung erfolgt durch Bestätigung der ursprünglichen Datagramms und der Information der gesendeten Pakete.

Format Gerätebeschreibung

Unter Index 0 sind die Gerätebeschreibung abrufbar. Primär ist dies die Anzahl der zur Verfügung gestellten Messkanäle. Weiterhin enthalten sind Angaben zur Identifikation des Gerätes.

_Format Gerätebeschreibung:_

| Typ    | Bedeutung                         |
| ------ | --------------------------------- |
| Char   | Anzahl der Messwerte im Gerät.    |
| Char   | Anzahl der Konfigurationskanäle   |
| 2 Byte | frei.                             |
| U32    | Seriennummer CS2.                 |
| String | 8 Byte Artikelnummer.             |
| String | Gerätebezeichnung, \\0 Terminiert |

Format des Datenblocks zur Beschreibung eines Messwert:

Die folgenden Indices enthalten eine zum Messwert gehörende Beschreibung: Format Messwertbeschreibung

| Typ  | Bedeutung            | Beispiel                             |
| ---- | -------------------- | ------------------------------------ |
| Char | Abfragekanalnummer   | 0x01: Abfrage unter Kanal 1          |
| Char | Potenz des Messwerts | \-3 Bedeutet: 10<sup>\-3</sup>       |
| Char | Farbe Bereich 1      | 0x00: Farbdarst. Sw, SW-Darst: Sw    |
| Char | Farbe Bereich 2      | 0x31: Farbdarst. Grün, SW-Darst: Gr1 |
| Char | Farbe Bereich 3      | 0xF2: Farbdarst. Gelb, SW-Darst: Gr2 |

| Char   | Farbe Bereich 4     | 0xC3: Farbdarst. Rot SW-Darst: Ws |
| ------ | ------------------- | --------------------------------- |
| U16    | Nullpunkt           | 0                                 |
| U16    | Ende Bereich 1      | 1800                              |
| U16    | Ende Bereich 2      | 2000                              |
| U16    | Ende Bereich 3      | 2100                              |
| U16    | Ende Bereich 4      | 2250                              |
| String | Messwertbezeichnung | Hauptgleisstrom\\0                |
| String | Bezeichnung Start   | 0.000\\0                          |
| String | Bezeichnung Ende    | 2.500\\0                          |
| String | Einheit             | Achsen\\0 oder A\\0               |

Abfragekanalnummer:

Wert bestimmt, unter welcher Kanalnummer mit dem Befehl "System Status" der entsprechende Messwert abgerufen werden kann. Messwerte sind als vorzeichenlose 16 Bit Messwerte normiert.

Ebenso wird bei einer Überlastmeldung diese Kanalnummer verwendet. Potenz des Messwerts:

Bestimmt, welche Potenz der zugehörige Messwert hat, also Messwert 1000 entspricht 1 bei Potenz -3 Farben der Bereiche eines Kanals:

Für eine farbliche Darstellung eines Messkanals benötigt man Bereichsgrenzen und die Informationen für die Farbdarstellung des Bereichs.

Beispiel Strommessung

Grün ist der normale Lastbereich, Gelb ist grenzwertig und bei Rot sollte nicht zu lange Betrieb sein. Max entspricht hier dem Überlastbereich, wenn dieser zu lange anhält wird abgeschaltet.

| Bereich 1 | Bereich 2 | Bereich 3 | Bereich 4 |
| --------- | --------- | --------- | --------- |
|           |           |           |           |

Werte aus Strings " Bezeichnung Start" und "Bezeichnung Ende": Ende aus String

0 2.500

Mitgeteilte Messwerte aus dem obigen Bereichsangaben:

Nullpunkt Ende Bereich 4

0 300 325 375 400

Beispiel Spannungsmessung

Unterspannung und Überspannung sind Rot. Gelb ist ein Bereich, in dem Betrieb möglich aber nicht Empfehlenswert, Grün ist der normale Betriebsbereich.

| Bereich 1 | Bereich 2 | Bereich 3 | Bereich 4 |
| --------- | --------- | --------- | --------- |
|           |           |           |           |

Die Farbdarstellung wird als 8 Bitwert, im Format RGB und Graudarstellung, repräsentiert. Dabei werden je 2 Bit für jede Information verwendet.

Die Werte für Nullpunkt und Bereiche 1-4 bestimmen den Messwert ab welchem diese Farbe gültig ist. Nullpunkt bestimmt, ab welchem Messwert der Wert angezeigt werden soll.

Messwertbezeichnung:

Liefert eine Bezeichnung zum Messwert. Internationalisierung:

Messwerte müssen in der Graphical User Interface Prozessor internationalisiert werden können. Damit dies realisiert werden kann, sind folgende vordefinierte Begriffe festgelegt:

| Messwertbezeichnung | Bezeichnung Deutsch | Bez. Englisch |
| ------------------- | ------------------- | ------------- |
| HGL                 | Hauptgleis          | Maintrack     |
| PGL                 | Programmiergleis    | Programtrack  |
| TRACK               | Boostergleis        | Boostertrack  |
| VOLT                | Versorgungsspannung | Supplyvoltage |
| ACHSEN              | Achsen              | Axes          |
| TEMP                | Temperatur          | Temperature   |
| TEMPO               | Geschwindigkeit     | Speed         |

Ist ein Begriff in dieser Tabelle nicht enthalten, so wird er wie empfangen dargestellt und nicht internationalisiert.

Bezeichnung Start:

Format einer Gleitkommazahl. Liefert sowohl die Information, für den Startwert der Darstellung als auch eine Information, wie der Messwert dargestellt werden soll. Die Anzahl der Nachkommastellen sind auch die Anzahl der Nachkommastellen des Messwerts (mA also 3 Nachkommastellen). Abgefragter Messwert muss bei der Darstellung durch 1000 geteilt werden. Die Anzahl der Nachkommastellen und die Potenz des Messwerts müssen identisch sein.

Bezeichnung Ende:

Format und Funktion wie Bezeichnung Start. Für das Ende der Darstellung. Einheit:

Liefert für die Darstellung des Messwertes die entsprechende Einheit.

#### Format des Datenblocks zur Beschreibung eines Konfigurationskanals

Ein Konfigurationskanal liefert eine Möglichkeit zum Einstellen von Bertriebsparametern eines Endgeätes. Die Abfragenummern der Konfigkanäle folgen unmittelbar auf die Messwertkanäle.

Ein Konfigurationskanal hat eine Konfigkanalnummer, welche mit einem Messwertkanal korrespondieren kann. Die GUI hat damit die Möglichkeit, den Messwertkanal einer Einstellmöglichkeit zuzuordnen.

Somit ist es möglich, z.B. die maximale Stromabgabe des HGL durch einen Konfigkanal zu beinflussen.

Ist die Konfigkanalnummer ausserhalb des Bereiches der Messwertkanäle, so exisitert zu dieser Einstellmöglichkeit keine Messwertabfrage.

Für Konfigkanäle sind 2 Grundformate definiert:

1. Eine Auswahlliste mit deren Bezeichnern zur Auswahl von diskreten Werten (Drop Down)
2. Eine Analoge Auswahl mit der Möglichkeit der gleitenden Eingabe von Werten (Slider). Format eines Datenblocks mit der Möglichkeit eine Auswahl zu treffen:

| Typ    | Bedeutung                    | Beispiel                       |
| ------ | ---------------------------- | ------------------------------ |
| Char   | Konfigkanalnummer            | 0x01: Setzen unter Kanal 1     |
| Char   | Kenner Auswahlliste          | Wert 1                         |
| Char   | Anzahl der Auswahlpunkte     | 2 - 255                        |
| Char   | Jetzige (Default)Einstellung |                                |
| Char   | 4 Res                        |                                |
| String | Auswahlbezeichnung           | Betrieb mit Stromversorgung\\0 |
| String | Auswahl 1                    | Trafo 60 VA 60052\\0           |
| String | Auswahl 2                    | Schaltnetzteil 60061 \\0       |
| String | Auswahl 3                    | Schaltnetzteil 60101\\0        |

Es müssen so viele Auswahlstrings wie Optionen mitgeteilt werden.

Auswahl 0 wird der Wert 0 zugeordnet, Auswahl 1 der Wert 1. Ausgewählte Optionen werden im Endgerät entsprechend umgesetzt.

Das Setzen eines Auswahlpunktes geschieht mittels dem Befehl: „System Status" und einer DLC = 8. Der hierzu in diesem Befehl benötigte Kanal ist die Konfigurationskanalnummer.

Format eines Datenblocks mit der Möglichkeit einen Wert einzustellen:

| Typ    | Bedeutung                 | Beispiel                    |
| ------ | ------------------------- | --------------------------- |
| Char   | Konfigirationskanalnummer | 0x05: Setzen unter Kanal 5  |
| Char   | Kenner Slider             | Wert 2                      |
| Word   | Unterer Wert              | 0                           |
| Word   | Oberer Wert               | 660                         |
| Word   | Aktuelle Einstellung      | 500                         |
| String | Auswahlbezeichnung        | Variable Strombegrenzung\\0 |
| String | Bezeichnung Start         | 0.000\\0                    |
| String | Bezeichnung Ende          | 2.500\\0                    |
| String | Einheit                   | Achsen\\0 oder A\\0         |

Die Umrechnung der Eingabewerte zur Anzeige geschieht analog der Anzeige von Messwerten. Setzen der Einstellung entsprechend dem obigen System.

Besonderheiten:

Wird immer von Graphical User Interface Prozessor ausgelöst. Kanalnummer und Kanalindex müssen nicht übereinstimmen.

Bei diesem Kommando handelt es sich um ein sequenziell in der Abarbeitung befindlichen Programmierbefehl. Diese werden nicht in einer Befehlqueue zwischengespeichert. Erst nach einer Antwort durch den Gleis Format Prozessor darf der nächste Programmierbefehl angefordert werden. Genau ein Programmierbefehl wird durch den Gleis Format Prozessor zeitgleich abgearbeitet.