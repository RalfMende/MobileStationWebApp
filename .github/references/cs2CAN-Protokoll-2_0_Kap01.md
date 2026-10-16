# CAN Anschluss

Der CAN Bus dient als Kommunikationsnetz der Steuergeräte bei Märklin Systems. Ziel ist, allen Geräten zur Steuerung einer Modellbahnanlage ein einheitliches Kommunikationsmedium zur Verfügung zu stellen.

Mittels CAN Meldungen werden Steueraufgaben übermittelt.

Mittels CAN Streams werden Updates und Konfigurationsdaten übertragen. Die Datenrate ist 250 KBit/s, die maximale Buslänge ist 100m.

## CAN Grundformat

Das CAN Protokoll schreibt vor, dass Meldungen mit einer 29 Bit Meldungskennung, 4 Bit Meldungslänge sowie bis zu 8 Datenbyte bestehen.

Die Meldungskennung wird aufgeteilt in die Unterbereiche Priorität (Prio), Kommando (Command), Response und Hash. Die Kommunikation basiert auf folgendem Datenformat:

| Meldungskennung |                                |                    |                      | DLC                     | Byte 0   | Byte 1   | Byte 2   | Byte 3   | Byte 4   | Byte 5   | Byte 6   | Byte 7   |
| --------------- | ------------------------------ | ------------------ | -------------------- | ----------------------- | -------- | -------- | -------- | -------- | -------- | -------- | -------- | -------- |
| Prio            | Command                        | Resp.              | Hash                 | DLC                     | D-Byte 0 | D-Byte 1 | D-Byte 2 | D-Byte 3 | D-Byte 4 | D-Byte 5 | D-Byte 6 | D-Byte 7 |
| 2+2 Bit         | 8 Bit                          | 1 Bit              | 16 Bit               | 4 Bit                   | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    |
| Message Prio    | Kommando<br><br>Kenn-zeichnung | CMD /<br><br>Resp. | Kollisions-auflösung | Anz.<br><br>Daten-bytes | Daten    | ....     |          |          |          |          |          |          |

## Feldergrundbeschreibung

- - 1. Priorität (Prio)

Bestimmt die Priorisierung der Meldung auf dem CAN Bus:

Prio 1: Stopp / Go / Kurzschluss-Meldung Prio 2: Rückmeldungen

Prio 3: Lok anhalten (?)

Prio 4: Lok / Zubehörbefehle Rest Frei

Die Priorisierung wird von den Teilnehmern nicht als Teil der Meldung verstanden, sondern dient zum Priorisieren der Meldung auf dem CAN Bus.

- - 1. Kommando

Bestimmt das vom Endgerät auszuführende, bzw. das ausgeführte Kommando. Kommandowerte sind eindeutig definiert.

Kennwertbereiche für die Kommandowerte:

| Bereich                     | Anzahl | Start | Ende |
| --------------------------- | ------ | ----- | ---- |
| Systembefehle               | 1      | 0x00  | 0x00 |
| Verwaltung                  | 8      | 0x01  | 0x0A |
| Zubehör                     | 2      | 0x0B  | 0x0D |
| Rückmeldungen               | \-     | 0x10  | 0x12 |
| Software Update / Konfig    | 6      | 0x18  | 0x1C |
| GUI Informationsübertragung | 3      | 0x20  | 0x22 |
| Automatisierungsbefehle     |        | 0x30  |      |

- - 1. Response

Bestimmt, ob CAN Meldung eine Anforderung oder Antwort oder eine vorhergehende Anforderung ist. Grundsätzlich wird eine Anforderung ohne ein gesetztes Response Bit angestoßen. Sobald ein Kommando ausgeführt wurde, wird es mit gesetztem Response Bit, sowie dem ursprünglichen Meldungsinhalt oder den angefragten Werten, bestätigt. Jeder Teilnehmer am Bus, welche die Meldung ausgeführt hat, bestätigt ein Kommando.

- - 1. Hash

Der Hash erfüllt eine Doppelfunktion:

Primär dient er zur Kollisionsauflösung der Meldungen und zur Sicherstellung der Kollisionsfreiheit zum CS1 Protokoll.

Sekundär kann er die Folgenummer einer Datenübertragung beinhalten. Kollisionsfreiheit zum CS1 Protokoll:

Im CAN Protokoll der CS1 wird der Wert 6 für den "com-Bereich der ID", dies sind die Bits 7..9, d.h. Highest Bit im Lowest-Byte (0b0xxxxxxx) und die beiden Bits darüber (0bxxxxxx11), nicht benutzt. Diese Bitkombination wird daher zur Unterscheidung fest im Hash verwendet.

Kollisionsauflösung:

Der Hash dient dazu, die CAN Meldungen mit hoher Wahrscheinlichkeit kollisionsfrei zu gestalten. Dieser 16 Bit Wert wird gebildet aus der UID Hash. Berechnung: 16 Bit High UID XOR 16 Bit Low der UID. Danach werden die Bits entsprechend zur CS1 Unterscheidung gesetzt.

Jeder Teilnehmer am Bus hat den Hash empfangener CAN-Meldungen auf Kollisionsfreiheit zu prüfen. Wird der eigene Hash empfangen, so ist ein neuer zu wählen. Dieser darf mit keinem weiteren empfangenen übereinstimmen.

Folgenummer einer Datenübertragung:

Wird der Hash zur Kennzeichnung der Paketnummer verwendet, so werden diese Bits bei der Berechnung der Paketnummer ausgeblendet. D.H. bei der 16 Bit Zahl werden die Bits 7 bis 9 ausgeblendet, die obersten 3 Bits sind 0. Der Wertebereich verringert sich entsprechend auf 8192.

15 8 7 0

|     |     |     |     |     |     | 1   | 1   |
| --- | --- | --- | --- | --- | --- | --- | --- |

| 0   |     |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- |

| 0   | 0   | 0   |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- |

- - 1. Meldungsbestätigung

Eine Initiator eine Meldung muss Sorge dafür tragen, dass die gewünschte Aktion tatsächlich ausgeführt wird. Die Meldungen werden nicht gesichert über den CAN-Bus übertragen. Der Empfang einer Meldung wird nicht bestätigt. Die Ausführung eines Kommandos wird bestätigt, bzw nur durch das Senden der Bestätigungsmeldung quittiert. Fehlt diese Quittierung, ist davon auszugehen, dass die Aktion nicht ausgeführt wurde.

- - 1. Sonstiges
- In der Kommunikation werden keine Sender + Empfänger Adresse verwendet.
- In der Kommunikation werden keine Remoteframes (=CAN-ID anfragen statt mit Daten senden) verwendet. Im allgemeinen sind die Teilnehmer so konfiguriert, dass diese nicht empfangen werden.
- Byte-Order in den Meldungen ist immer Motorola Big Endian.
  - 1. Übertragung der CAN Kommandos via Ethernet

Auf der CS2 kann - über das Setup / IP - Einstellungen - das Can-UDP-Gateway gestartet werden. Dort kann eine IP-Adresse (auch Broadcast) spezifiziert werden, an die das Gateway sendet. Die Portadressen sind über die Oberfläche nicht einstellbar und werden fest auf die Ports 15731 und 15730 gesetzt.

Funktionsweise:

Wenn gestartet, lauscht das Gateway auf dem Ethernet Empfangsport 15731. Es verwirft alle UDP-Pakete, die eine Länge ungleich 13 haben. Pakete der Länge 13 werden als Can-Bus-Pakete interpretiert: 4 Byte Can-Bus-Id (BigEndian oder Network-Order), 1 Byte Länge und 8 Byte Daten, die ggf. mit Nullbytes aufzufüllen sind. Dieses Paket wird dann als Can-Bus-Botschaft auf den Can-Bus gegeben. Nicht abzubildende Bits oder Bytes auf dem CAN-Bus werden nicht beachtet und sollten auf "0" gesetzt werden.

Umgekehrt liest das Gateway alle Can-Bus-Botschaften, wandelt sie in analoger Weise in UDP-Pakete der Länge 13 um und verschickt diese an die spezifizierte IP-Adresse und den Sendeport (15730).

Beispielkonfiguration im lokalen Netz mit dem Netzwerksegment 192.168.2.0

CS2: (192.168.2.20) empfängt auf Port 15731, sendet an die Broadcast-Adresse 192.168.2.255:15730. PC1: (192.168.2.10) empfängt auf Port 15730 sendet an CS2 (192.168.2.20:15731)

PC2: (192.168.2.11) empfängt auf Port 15730 sendet an CS2 (192.168.2.20:15731)

Im Ethernet werden immer Pakete mit 13 Bytes übertragen, unabhängig von der CAN - Datagramgröße, da das CAN - Ethernet - Gateway Pakete anderer Länge verwirft.

Die Bytes in der CAN- Botschaft werden folgendermaßen in dem UDP-Paket eingepackt:

- Bytes 1 bis 4 sind die Meldungskennung.
- Byte 5 entspricht dem DLC der CAN-Meldung.
- Bytes 6 - 13 sind die entsprechenden Nutzdaten. Dabei nicht benötigte Bytes sind mit 00 zu füllen.

## Allgemeines

- - 1. Adressen im System – Die UID

Der gesamte Adressraum hat 2\*\*32 Adressen (0x0000 0000 - 0xFFFF FFFF), dieses sind rund 4 Milliarden Adressen.

Diese werden auch als UID (Universal Identifyer) bezeichnet. Je nach eingesetztem Protokoll hat jedoch eine UID eine andere Bedeutung.

- - - 1. Definition der Teilnehmerkennungen

Im System besitzt jeder adressierbare Teilnehmer eine eindeutige 32 Bit Adresse. Dabei werden folgende UID unterschieden:

Geräte-UID Eindeutig vergebene Universal ID.

Loc-ID (=Local ID, nicht Locomotive ID) Aus dem Protokoll und der Adresse berechnete Lokale ID. MFX-UID MFX Universal ID, eindeutige Kennung eines mfx Teilnehmers.

Bestimmte Geräte-UID besitzen eine besondere Bedeutung:

Die UID 0x00000000 ist die Broadcastadresse. Signalisiert, dass mehrere Teilnehmer denselben Befehl abarbeiten sollen.

Die UID 0xFFFFFFFF ist ungültig und steht für eine nicht initialisierte UID des Endgerätes.

- - - 1. Einbindung bestehender Gleisprotokolle, Bildung der „Loc-ID"

Der Adressraum hat rund 4 Milliarden verfügbare Adressen. Von diesem Adressraum wird ein Teil (Adresse 0 - 65536) für die Einbindung bestehender Protokolle verwendet: In diesem reservierten Bereich werden die bestehenden Digitalprotokolle eingebettet, repräsentiert durch die Loc-ID. Durch Ihre Lage ergibt sich das Protokoll. Aufgeführt sind die unteren 2 Byte der Loc-ID bei diesen Protokollen, die oberen sind = 0x0000.

So ergibt sich folgendes Adressschema:

| StartAdresse | EndAdresse | Protokoll                                                             |
| ------------ | ---------- | --------------------------------------------------------------------- |
| 0x0000       | 0x03FF     | MM1,2 Loks und Funktionsdecoder (20 & 40 kHz, 80 & 255 Adressen)      |
| 0x0400       | 0x07FF     | _Reserviert_                                                          |
| 0x0800       | 0x0BFF     | SX1                                                                   |
| 0x0C00       | 0x0FFF     | _Reserviert_                                                          |
| 0x1000       | 0x13FF     | _Res. für MM1,2 Funktionsdecoder F1 - F4 (40 kHz, 80 & 255 Adressen)_ |
| 0x1400       | 0x17FF     | _Reserviert_                                                          |
| 0x1800       | 0x1BFF     | Frei für Privatanwender / Clubs                                       |
| 0x1C00       | 0x1FFF     | Frei für Firmen                                                       |
| 0x2000       | 0x23FF     | _Reserviert für MM1,2 Lokdecoder (20 kHz, 80 & 256 Adressen)_         |
| 0x2400       | 0x27FF     | _Reserviert_                                                          |
| 0x2800       | 0x2BFF     | SX1 - Zubehörartikel (Erweiterung)                                    |
| 0x2C00       | 0x2FFF     | _Reserviert für Traktionen (interne GUI Kennungen)_                   |
| 0x3000       | 0x33FF     | MM1,2 Zubehörartikeldecoder (40 kHz, 320 & 1024 Adressen)             |
| 0x3400       | 0x37FF     | _Reserviert_                                                          |
| 0x3800       | 0x3BFF     | DCC-Zubehörartikel                                                    |
| 0x3C00       | 0x3FFF     | DCC-Zubehörartikel                                                    |
|              |            |                                                                       |
| 0x4000       | 0x7FFF     | MFX                                                                   |
| 0x8000       | 0xBFFF     | SX2                                                                   |
| 0xC000       | 0xFFFF     | DCC                                                                   |

| Beispiel (Hex):                                    |               |             |
| -------------------------------------------------- | ------------- | ----------- |
| Märklin Motorola mit Adresse 2: Basis: 00 00 00 00 | Plus Adresse: | 00 00 00 02 |
| MM2 Zubehör mit Adresse 3: Basis: 00 00 30 00      | Plus Adresse: | 00 00 30 03 |
| 1.3.2 Bildung von Automatik-UID und Rückmelde-UID  |               |             |

Im Gesamtsystem können sich mehrere Geräte mit der Fähigkeit einer Automatisierung oder einer Rückmeldemöglichkeit befinden.

Für eine Möglichkeit, diese Ressourcen Systemweit nutzen zu können, muss diese Fähigkeit angesprochen werden können. Dabei wird die Möglichkeit der Rückmeldung und der Automatisierung in einem gemeinsamen Adressraum zusammengefasst.

Diese Kennungen bestehen aus zwei 16Bit Teilkennungen: Einer zugeordneten Gerätekennung und einer Kennung für die Automatik/Rückmeldekennung in diesem Gerät. Somit können 65K Geräte mit jeweils 65K Funktionen zusammengeschaltet werden. Die Kontaktadresse sowie die Automatisierungsadresse wird somit über eine Kombination von 16 Bit Gerätekenner und 16Bit Kontakt- / Automatikkennung gebildet. Über diese Adressierung werden im System alle Kontakte und Automatikfunktionen angesprochen.

Durch diese Kennungen ist es möglich, Ressourcen von einem Gerät zur Steuerung in einem anderen Gerät zu verwenden.

- - - 1. Gerätekennungen

Ressourcen in Systeme, die einen S88 Bus / Rückmeldebus besitzen oder eine Automatisierungsfunktionen realisieren, bekommen eine 16Bit Gerätekenner zugewiesen.

Die Master - Zentrale weist den Endgeräten die Kennung beim Systemstart jeweils zu. Eine Resetfeste Speicherung findet in den Geräten nicht statt.

Über diese zentrale Verwaltung der Gerätekennungen wird erreicht, dass eine ausgefallenes Gerät im System ersetzt werden kann. Die gespeicherte und verwendete Adressierung in Automatikfunktionen kann somit unverändert übernommen werden.

Der Master – Zentrale speichert eine Liste mit allen bekannten Geräten im System, sowie deren NickNames als .cs2 Konfigurationsdatei. Der Name/Kenner kann sinnvoll vorbelegt werden, muss aber vom Anwender geändert werden können.

- - - 1. Rückmeldekennungen und Automatikkennungen

Über diese Kennung wird sowohl eine Rückmeldung wie auch eine Automatisierungsfunktion angesprochen. S88 /

Rückmeldekennungen beginnen im Highbyte bei 0 bis maximal 63, Lowbyte im Bereich jeweils von 0 - 255. Somit maximal 16.384 Rückmeldekontakte pro Gerät möglich.

Der Wert 64 ist reserviert für SX1 Rückmelder.

Automatikfunktionen beginnen im Highbyte bei 65 der ASCII Darstellung von „A". Im Lowbyte beginnen per Konvention zur Zeit die Werte bei ASCII "1", dezimal 49 (0x31). (Dies ist die ASCII Darstellung „A1" – somit die erste memory Funktion). Die Lücke zwischen SX1 Rückmelder und Automatikfunktionen ist reserviert.

Dabei werden die jetzt schon vorhandenen Automatikfunktionen mit der schon vergebenen Bezeichnung A1 – z8 adressiert. Neue Kennungen können zur Realisation neuer Automatisierungsfunktionen benutzt werden.

Tabelle der sich daraus ergebenden Adressierung.

| Gerätekennung          | Start                 | Ende                    | Verwendung                           |
| ---------------------- | --------------------- | ----------------------- | ------------------------------------ |
| 0x0000 -<br><br>0xFFFF | 0x00 0x00<br><br>0 0  | 0x3F 0xFF<br><br>63 255 | S88 Rückmelder 16384 Melder          |
| 0x0000 -<br><br>0xFFFF | 0x40 0x00<br><br>64 0 | 0x40 0xFF<br><br>64 255 | Reserviert SX1 Rückmelder 128 Melder |

| 0x0000 -<br><br>0xFFFF | 0x41<br><br>65  | 0x00<br><br>0  | 0x41<br><br>65  | 0x30<br><br>48  | Frei / Reserve                                                        |
| ---------------------- | --------------- | -------------- | --------------- | --------------- | --------------------------------------------------------------------- |
| 0x0000 -<br><br>0xFFFF | 0x41<br><br>65  | 0x31<br><br>49 | 0x7F<br><br>127 | 0xFF<br><br>255 | Memory – Automatikfunktionen. Beginnend bei Ascii Darstellung „A" „1" |
| 0x0000 -<br><br>0xFFFF | 0x80<br><br>128 | 0x00<br><br>0  | 0xFF<br><br>255 | 0xFF<br><br>255 | Reserviert                                                            |

- - - 1. Automatisierungsadressen / Rückmeldeadressen

Diese Adressen werden zusammengesetzt aus der Gerätekennung (Höher wertig) und der entsprechenden Rückmeldekennung bzw Automatikkennung. Die Gerätekennung bildet dabei den höherwertigen Teil.

- - 1. Fahrstufen im System

Geschwindigkeiten im gesamten System werden als 10 - Bit Werte behandelt. Dieser Wert ist unabhängig vom real zur Lok (über das Gleis) gesendeten Wert. Der verwendete Wertebereich sollte von 0 bis 1000 gehen, 0 entspricht einer stehenden Lok, 1000 der maximalen Geschwindigkeit einer Lok.

Werte oberhalb 1000 (bis 1023) dürfen vorkommen und dürfen keinen Empfänger stören. Die Fahrgeschwindigkeit entspricht hierbei dem Maximum.

Die Umrechnung in reale möglich Fahrstufen ist anhand folgender Rechenvorschriften möglich: Systemfahrstufe = 1 + (Gleisfahrstufe - 1) \* Schrittweite

| Fahrstufen Anzahl | Schrittweite |
| ----------------- | ------------ |
| 14                | 77           |
| 27                | 38           |
| 28                | 37           |
| 31                | 33           |
| 126               | 8            |

Gleisfahrstufe 1 ist somit immer auch Systemfahrstufe 1. Gleisfahrstufe 11 ist bei: 14 Fahrstufen: 771

27 Fahrstufen: 381

28 Fahrstufen: 371

31 Fahrstufen: 331

126 Fahrstufen: 81

## Übersicht Werte der Kommandos

Übersichtstabelle der Kommandokenner

| **Befehl**                                                        | **Wert** | **Wert in CAN-ID** | **mögliche DLC** |
| ----------------------------------------------------------------- | -------- | ------------------ | ---------------- |
| System-Befehle                                                    | 0x00     | 0x00               | siehe unten      |
| Lok Discovery                                                     | 0x01     | 0x02               | 0,1,5,6          |
| MFX Bind                                                          | 0x02     | 0x04               | 6                |
| MFX Verify                                                        | 0x03     | 0x06               | 6,7              |
| Lok Geschwindigkeit                                               | 0x04     | 0x08               | 4,6              |
| Lok Richtung                                                      | 0x05     | 0x0A               | 4,5              |
| Lok Funktion                                                      | 0x06     | 0x0C               | 5,6,8            |
| Read Config                                                       | 0x07     | 0x0E               | 6,7              |
| Write Config                                                      | 0x08     | 0x10               | 8                |
| Zubehör Schalten                                                  | 0x0B     | 0x16               | 6,8              |
| Zubehör Konfig                                                    | 0x0C     | 0x18               |                  |
| S88 Polling (Feedback)                                            | 0x10     | 0x20               | 5,6,7,8          |
| S88 Event                                                         | 0x11     | 0x22               | 7,8              |
| SX1 Event                                                         | 0x12     | 0x24               | 5,6              |
| Softwarestand Anfrage/Teilnehmer Ping                             | 0x18     | 0x30               | 0,5,7,8          |
| Updateangebot                                                     | 0x19     | 0x32               | 8                |
| Read Config Data                                                  | 0x1A     | 0x34               | 4,8              |
| Bootloader CAN gebunden, „Service"                                | 0x1B     | 0x36               | 0,5,6,7,8        |
| Bootloader Schienen gebunden, „Service"                           | 0x1C     | 0x38               | 4,5,6,7,8        |
| Statusdaten Konfiguration                                         | 0x1D     | 0x3A               | 5,8              |
| Anfordern Config Data, „Data Query"                               | 0x20     | 0x40               | 8                |
| Config Data Stream                                                | 0x21     | 0x42               | 6,7,8            |
| 60128 (Connect 6021) Data Stream/ alte Bezeichnung „6021 adapter" | 0x22     | 0x44               | 5,6              |

Übersichtstabelle Systembefehle und Wert Subcommand

| **Befehl**                         | **Sub-CMD Wert** | **mögliche DLC** |
| ---------------------------------- | ---------------- | ---------------- |
| System Stopp                       | 0x00             | 5                |
| System Go                          | 0x01             | 5                |
| System Halt                        | 0x02             | 5                |
| Lok Nothalt                        | 0x03             | 5                |
| Lok Zyklus Stopp(beenden)          | 0x04             | 5                |
| Lok Datenprotokoll                 | 0x05             | 6                |
| Schaltzeit Zubehördecoder          | 0x06             | 5                |
| Fast Read für mfx                  | 0x07             | 6                |
| Gleisprotokoll frei schalten       | 0x08             | 6                |
| System MFX Neuanmeldezähler setzen | 0x09             | 7                |
| System Überlast                    | 0x0A             | 6                |
| System Status                      | 0x0B             | 6,8              |
| System Kennung                     | 0x0C             | 5,7              |
| Mfx Seek                           | 0x30             | 6,7,8            |
| System Reset                       | 0x80             | 6                |