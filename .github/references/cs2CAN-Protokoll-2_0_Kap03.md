# Verwaltung

Verwaltungsbefehle dienen zum Steuern der vom Gleisformatprozessor angesprochenen Empfänger. Hier sollten keine Befehle enthalten sein, die das Verhalten des Gleisformatprozessors beeinflussen.

## Befehl: Lok Discovery

Kennung:

Discovery (_0x01_, in CAN-ID: _0x02_) Format:

D-Byte 5 D-Byte 6 D-Byte 7

Resp. Hash

Prio Command 2+2 Bit 8 Bit Message Discovery Prio

Message Discovery Prio

Message Discovery Prio

16 Bit

DLC

4 Bit

0

D-Byte 0 D-Byte 1

8 Bit 8 Bit

D-Byte 2 D-Byte 3

8 Bit 8 Bit

D-Byte 4

8 Bit

1 Bit 0|1

8 Bit 8 Bit

8 Bit

0

1

0|1

5

Protokoll-Kennung

MFX-UID / Loc-ID

High

MFX-UID / Loc-ID

High

Low

Message Discovery Prio

1

6

Range/ Protokoll-Kennung Range

Low

ASK-

Verhältnis

Beschreibung:

Suchen von Loks auf dem Gleis. Gleis wird durch Protokoll-Kennung bestimmt. Anfragen:

Form 1: DLC = 0: Starten "Erkennen alle Protokolle". (später >= V2.0)

Form 2: DLC = 1: Erkennen nach Datenprotokoll, Protokoll - Kennung bestimmt Datenprotokoll,

Gleis Format Prozessor macht MFX - Discovery / Lok - Erkennen eigenständig. Die Discovery-Zwischenschritte werden in Form 3 kommuniziert.

Pro Erkennungsvorgang wird nur ein Decoder erkannt.

Antwort:

Positiv mit DLC=5 und (bisher) gefundener Adresse Negativ: DLC=0

Form 3: DLC = 5: 1.) Einzel - MFX - Discovery: Senden der Anforderung mit Range (=Info Länge der Bits) (Realisiert in V1.0)

2.) Sonstiges Erkennen: Aus Loc-ID werden Adresse und Protokoll extrahiert. Mit diesen Daten wird versucht, diese Adresse auf dem Gleis zu erkennen.

Antworten:

Zur Anzeige der MFX Erkennung wird bei einem durch den Gleis Format Prozessor gesteuerten Zyklus auch die Zwischenschritte kommuniziert. Erst ein Range = 32 bestimmt die vollständige Decoder-UID.

Zum Debug: DLC = 6: Einzel - MFX - Discovery: Antwort mit Range und ASK-Verhältnis.

| Anfrage Programmiergleis: |                                  |                                                                                                                                                                                                                                |
| ------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Protokoll                 | Range/ Protokoll-<br><br>Kennung | Bemerkung                                                                                                                                                                                                                      |
| MFX:                      | 0-32                             | \=Range. Anfrage zur Erkennung der Lok auf dem Programmiergleis. Wenn die Lok antwortet, wird das Antwortbit gesetzt<br><br>Sonderfall: Range=0: Es wird ein Zwangsneuanmelden eines<br><br>Decoders auf dem PGL durchgeführt. |

| MM2:                | 33    | Erkennung der MM2-Lok auf dem Programmiergleis.<br><br>In der Antwort wird die MM2-Adresse gemeldet. (20 kHz)                                                                       |
| ------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MM2:                | 34    | Erkennung der MM2-Lok auf dem Programmiergleis.<br><br>In der Antwort wird die MM2-Adresse gemeldet. (40 kHz) (>V3.0)                                                               |
| DCC:                | 35    | Auslesen der DDC-Adresse auf dem Programmiergleis.<br><br>Bewirkt denselben Vorgang wie 36, Antwort entweder 35 oder 36.<br><br>In der Antwort wird die kurze DCC-Adresse gemeldet. |
| DCC                 | 36    | Auslesen der DDC-Adresse auf dem Programmiergleis.<br><br>Bewirkt denselben Vorgang wie 35, Antwort entweder 35 oder 36. In der Antwort wird die lange DCC-Adresse gemeldet.        |
| DCC:                | 37    | DCC-Erkennen (Intervall-Schachtelungs-Algorithmus mit DCC-K=127 Adr). In der Antwort wird die DCC-Adresse gemeldet. (>V3.0)                                                         |
| SX1:                | 38    | Auslesen der SX1-Adresse auf dem Programmiergleis. In der Antwort wird die SX1-Adresse gemeldet. (>V3.0)                                                                            |
| SX1:                | 39    | Erkennen (Intervall-Schachtelungs-Algorithmus mit Adr 0-99) In der Antwort wird die SX1-Adresse gemeldet. (>V3.0)                                                                   |
|                     |       |                                                                                                                                                                                     |
| Anfrage Hauptgleis: |       | Range = Wert mod 64.                                                                                                                                                                |
| MFX:                | 64-96 | Anfrage zur Erkennung der Lok auf dem Hauptgleis. Wenn die Lok antwortet, wird das Antwortbit gesetzt                                                                               |
| MM2:                | 98    | Ungültig, da Hardwaretechnisch nicht möglich                                                                                                                                        |
| DCC:                | 99    | Ungültig, da Hardwaretechnisch nicht möglich                                                                                                                                        |
| DCC:                | 100   | Ungültig, da Hardwaretechnisch nicht möglich                                                                                                                                        |
| SX1:                | 101   | Ungültig, da Hardwaretechnisch nicht möglich                                                                                                                                        |
| SX1:                | 102   | Ungültig, da Hardwaretechnisch nicht möglich                                                                                                                                        |

Beispiel:

00024711 1 20 Voller mfx Discoveryzyklus

00024711 5 FF FF FF FF 00 Range 0 MFX Discovery

00024711 1 21 MM2 Discovery Besonderheiten:

Wird immer von Graphical User Interface Prozessor ausgelöst. Das Auslösen eines Discoverys sollte nur vom Master - Bediengerät gemacht werden. Ansonsten sind Vorkehrungen für das gleichzeitige Auslösen von Dicoverys zu treffen.

Antworten auf ein Discovery sollen und dürfen von allen Teilnehmern empfangen und auch entsprechend ausgewertet werden.

Mfx Discovery unterscheidet nicht nach Hauptgleis oder Programmiergleis.

Wird eine MFX Lok nach Form 1 gesucht, so wird bei einer Antwort der komplette Zyklus mit 32 Stufen durchgeführt.

ASK Verhältnis ist eine Kenngröße für die Qualität der MFX Rückmeldesignale.

Bei einem kompletten Zyklus wird die letzte Meldung mit und ohne ASK Verhältnis gesendet. Bei diesem Kommando handelt es sich um ein sequenziell in der Abarbeitung befindlichen

Programmierbefehl. Diese werden nicht in einer Befehlqueue zwischengespeichert. Erst nach einer Antwort durch den Gleis Format Prozessor darf der nächste Programmierbefehl angefordert werden. Genau ein Programmierbefehl wird durch den Gleis Format Prozessor zeitgleich abgearbeitet.

## Befehl: MFX Bind

Kennung:

Bind (_0x02_, in CAN-ID: _0x04_)

Format:

| Prio                | Command | Resp. | Hash   | DLC   | D-Byte 0 | D-Byte 1 | D-Byte 2 | D-Byte 3 | D-Byte 4 | D-Byte 5 | D-Byte 6 | D-Byte 7 |
| ------------------- | ------- | ----- | ------ | ----- | -------- | -------- | -------- | -------- | -------- | -------- | -------- | -------- |
| 2+2 Bit             | 8 Bit   | 1 Bit | 16 Bit | 4 Bit | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    |
| Message<br><br>Prio | Bind    | 0\|1  |        | 6     | MFX-UID  |          |          |          | MFX-SID  |          |          |          |
|                     |         |       |        |       | High     |          |          | Low      | High     | Low      |          |          |

Beschreibung:

Einem MFX-Decoder mit MFX-UID mittels mfx-BIND die MFX-SID zuweisen, Anmelden einer per Discovery gefundenen mfx-Lok. Der Decoder kann danach mit einer Loc-ID angesprochen werden.

Für mfx Decoder ist eine automatisierte Adressvergabe realisiert. Im der GUI werden diese durch den Loknamen ausgewählt und auch durch diese Kennung gefahren. Eine Schienenadresse ist hier nicht sichtbar. Das Steuergerät verwendet für die Ansteuerung der Decoder jedoch eine Adresse.

Des weiteren hat jeder Decoder eine eindeutige UID, mit welcher dieser sich im System bekannt macht. Die Kennung wird für das Anmeldverfahren verwendet (Siehe Discovery). Durch das Bind Kommando wird dem Decoder eine kürzere Schieneadresse zugewiesen. Durch diese Schienenadresse wird der Decoder steuerbar und er nimmt am Anmeldeverfahren nicht mehr teil.

Beispiel:

00044711 6 FF FA 8C 43 00 05 Bind UID: FF FA 8C 43 auf SID: 05

00054711 6 FF FA 8C 43 00 05 Antwort

Antwort:

Ursprünglicher Befehl mit gesetztem Response Bit. Antwort zeigt das Ende der Ausführung an.

Besonderheiten:

Nur gültig für MFX.

Wird immer von Graphical User Interface Prozessor ausgelöst. Das Auslösen von Bind sollte nur vom Master - Bediengerät gemacht werden. Ansonsten sind Vorkehrungen für das gleichzeitige Auslösen von Binds zu treffen.

Antworten auf ein Bind sollen und dürfen von allen Teilnehmern empfangen und auch entsprechend ausgewertet werden.

Bei diesem Kommando handelt es sich um ein sequenziell in der Abarbeitung befindlichen Programmierbefehl. Diese werden nicht in einer Befehlqueue zwischengespeichert. Erst nach einer Antwort durch den Gleis Format Prozessor darf der nächste Programmierbefehl angefordert werden. Genau ein Programmierbefehl wird durch den Gleis Format Prozessor zeitgleich abgearbeitet.

## Befehl: MFX Verify

Kennung:

Verify (_0x03_, in CAN-ID: _0x06_) Format:

| Prio         | Command | Resp. | Hash   | DLC   | D-Byte 0 | D-Byte 1 | D-Byte 2 | D-Byte 3 | D-Byte 4 | D-Byte 5 | D-Byte 6               | D-Byte 7 |
| ------------ | ------- | ----- | ------ | ----- | -------- | -------- | -------- | -------- | -------- | -------- | ---------------------- | -------- |
| 2+2 Bit      | 8 Bit   | 1 Bit | 16 Bit | 4 Bit | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit                  | 8 Bit    |
| Message Prio | Verify  | 0\|1  |        | 6     | MFX-UID  |          |          |          | MFX-SID  |          |                        |          |
|              |         |       |        |       | High     |          |          | Low      | High     | Low      |                        |          |
| Message Prio | Verify  | 1     |        | 7     | MFX-UID  |          |          |          | MFX-SID  |          | ASK-<br><br>Verhältnis |          |
|              |         |       |        |       | High     |          |          | Low      | High     | Low      |                        |          |

Beschreibung:

DLC = 6:

Anfrage auf Überprüfung, ob eine Lok unter der Kombination MFX-UID / MFX- SID vorhanden ist. DLC = 7:

Sollte diese Kombination vorhanden sein, so wird eine Bestätigung mit MFX-UID und MFX-SID sowie dem ASK-Verhältnis (Qualität der Antwort) gesendet. Bei negativer Antwort wird die SID zu 0x0000 gesetzt.

Beispiel:

00064711 6 FF FA 8C 43 00 05 Verify FF FA 8C 43 auf SID 05

00074711 6 FF FA 8C 43 00 00 Antwort negativ

00074711 7 FF FA 8C 43 00 05 D1 Antwort positiv mit ASK-Verhältnis 0xD1 Antwort:

DLC = 6: Sollte die Kombination nicht vorhanden sein, so wird in der Antwort mit gesetztem Response Bit die SID auf 0x0000 gesetzt.

DLC = 7: Sollte die Kombination vorhanden sein, so wird als Antwort der ursprünglicher Befehl gesendet mit gesetztem Response Bit und in D-Byte 6 das ASK-Verhältnis.

Besonderheiten:

Nur gültig für MFX.

Empfängt ein gebundener MFX-Decoder eine falsche Kombination aus MFX-UID und MFX-SID, so wird ein UnBIND im Lokdecoder mit der entsprechenden MFX-SID ausgelöst.

Wird immer von einem Bediengerät ausgelöst. Das Auslösen des Verifys sollte nur vom Master - Bediengerät gemacht werden. Ansonsten sind Vorkehrungen für das gleichzeitige Auslösen von Verifys zu treffen.

Antworten auf ein Verify sollen und dürfen von allen Teilnehmern empfangen und auch entsprechend ausgewertet werden.

Bei diesem Kommando handelt es sich um ein sequenziell in der Abarbeitung befindlichen Programmierbefehl. Diese werden nicht in einer Befehlqueue zwischengespeichert. Erst nach einer Antwort durch den Gleis Format Prozessor darf der nächste Programmierbefehl angefordert werden. Genau ein Programmierbefehl wird durch den Gleis Format Prozessor zeitgleich abgearbeitet.

## Befehl: Lok Geschwindigkeit

Kennung:

Lok Geschwindigkeit (_0x04_, in CAN-ID: _0x08_) Format:

| Prio                | Command            | Resp. | Hash   | DLC   | D-Byte 0 | D-Byte 1 | D-Byte 2 | D-Byte 3 | D-Byte 4        | D-Byte 5 | D-Byte 6 | D-Byte 7 |
| ------------------- | ------------------ | ----- | ------ | ----- | -------- | -------- | -------- | -------- | --------------- | -------- | -------- | -------- |
| 2+2 Bit             | 8 Bit              | 1 Bit | 16 Bit | 4 Bit | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit           | 8 Bit    | 8 Bit    | 8 Bit    |
| Message<br><br>Prio | Lok<br><br>Geschw. | 0\|1  |        | 4     | Loc-ID   |          |          |          |                 |          |          |          |
|                     |                    |       |        |       | High     |          |          | Low      |                 |          |          |          |
| Message Prio        | Lok Geschw.        | 0\|1  |        | 6     | Loc-ID   |          |          |          | Geschwindigkeit |          |          |          |
|                     |                    |       |        |       | High     |          |          | Low      | High            | Low      |          |          |

Beschreibung:

Dies ist der Fahrbefehl für Lokomotiven. Bei bekannter Loc-ID kann eine Lokomotive sofort gefahren werden. Durch Auswerten der Fahrbefehle (Antworten) kann eine Anzeige stetig aktualisiert werden.

Geschwindigkeiten im gesamten System werden als 10 - Bit Werte behandelt. Dieser Wert ist unabhängig vom real zur Lok (über das Gleis) gesendeten Wert. Der verwendete Wertebereich sollte von 0 bis 1000 gehen, 0 entspricht einer stehenden Lok, 1000 der maximalen Geschwindigkeit einer Lok.

Werte oberhalb 1000 (bis 1023) dürfen vorkommen und sollten keinen Empfänger stören. Die Fahrgeschwindigkeit entspricht hierbei dem Maximum.

DLC = 6, Setzen der Fahrstufe:

Lok mit LOC-ID wird mit Geschwindigkeit angesteuert. Geschwindigkeit im Bereich von 0 bis 1024 (10 Bit). Für alle Protokolle wird die Geschwindigkeit auf die reale mögliche Fahrstufe umgerechnet.

Fahrstufe 0 ist Lok - Haltebefehl mit eingestellter Anfahr- und Bremsverzögerung (Nicht Nothalt). DLC = 4, Abfrage der Fahrstufe:

Abfrage der aktuellen Geschwindigkeit bei fehlendem Geschwindigkeitswert (DLC = 4) Beispiel:

00084711 6 00 00 08 03 03 20 Lok Geschwindigkeit SX1 Adr 3, V=0x0320=800 von 1024

00084711 6 00 00 08 03 00 A0 Lok Geschwindigkeit SX1 Adr 3, V=0x00A0=10 von 1024

00084711 6 00 00 40 01 03 20 Lok Geschwindigkeit mfx Adr 1, V=0x0320=800 von 1024

00084711 6 00 00 C0 03 01 20 Lok Geschwindigkeit DCC Adr 3

00084711 6 00 00 C0 03 00 A0 Lok Geschwindigkeit DCC Adr 3 Antwort:

Setzen einer Geschwindigkeit:

Ursprünglicher Befehl mit gesetztem Response Bit. Lesen der Geschwindigkeit:

Antwort in Form Geschwindigkeit setzen, wenn Lok bekannt.

Sonst fehlende Geschwindigkeitsinformation (Ursprüngliche Anfrage).

Besonderheiten:

Erster Befehl nimmt Lok/Funktionsdecoder in Zyklus auf.

## Befehl: Lok Richtung

Kennung:

Lok Richtung (_0x05_, in CAN-ID: _0x0A_) Format:

| Prio                | Command             | Resp. | Hash   | DLC   | D-Byte 0 | D-Byte 1 | D-Byte 2 | D-Byte 3 | D-Byte 4 | D-Byte 5 | D-Byte 6 | D-Byte 7 |
| ------------------- | ------------------- | ----- | ------ | ----- | -------- | -------- | -------- | -------- | -------- | -------- | -------- | -------- |
| 2+2 Bit             | 8 Bit               | 1 Bit | 16 Bit | 4 Bit | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    |
| Message<br><br>Prio | Lok<br><br>Richtung | 0     |        | 4     | Loc-ID   |          |          |          |          |          |          |          |
|                     |                     |       |        |       | High     |          |          | Low      |          |          |          |          |
| Message Prio        | Lok Richtung        | 0\|1  |        | 5     | Loc-ID   |          |          |          | Richtung |          |          |          |
|                     |                     |       |        |       | High     |          |          | Low      |          |          |          |          |

Beschreibung:

Abfragen oder setzen der Fahrtrichtung einer Lok DLC = 4, Abfrage der Richtung:

Aktuelle Richtung erfragen. Antwort mit 5 Bytes in Form von „Setzen Richtung". DLC = 5, Setzen der Richtung:

Ändern der Fahrtrichtung gemäß dem Parameter „Richtung". Bei einer Änderung der Richtung sorgt Gleis Format Prozessor für Fahrstufe 0, Lok wird mit Decoder „ABV" gebremst. Wird Richtung nicht geändert, erfolgt keine Änderung der Fahrstufe.

Bedeutung Parameter Richtung:

0 = Fahrtrichtung bleibt

1 = Fahrtrichtung vorwärts

2 = Fahrtrichtung rückwärts

3 = Fahrtrichtung umschalten Rest: Richtung bleibt

Antwort:

Setzen der Richtung:

Ursprünglicher Befehl mit gesetztem Response Bit.

Abfrage der Richtung:

Antwort in Form "Richtung setzen". Eine Antwort erfolgt auf jeden Fall, auch wenn Lok nicht bekannt ist.

Besonderheiten:

Erster Befehl nimmt Lok/Funktionsdecoder in Zyklus auf.

Je nach Lokdecoder kann es sein, dass die Richtungsumkehr nur im Stand stattfindet. Die neue Richtung wird auf jeden Fall vom Gleis Format Prozessor gesendet.

Wird immer von Graphical User Interface Prozessor ausgelöst.

## Befehl: Lok Funktion

Kennung:

Lok Funktion (_0x06_, in CAN-ID: _0x0C_) Format:

| Prio                | Command             | Resp. | Hash   | DLC   | D-Byte 0 | D-Byte 1 | D-Byte 2 | D-Byte 3 | D-Byte 4 | D-Byte 5 | D-Byte 6      | D-Byte 7 |
| ------------------- | ------------------- | ----- | ------ | ----- | -------- | -------- | -------- | -------- | -------- | -------- | ------------- | -------- |
| 2+2 Bit             | 8 Bit               | 1 Bit | 16 Bit | 4 Bit | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit         | 8 Bit    |
| Message<br><br>Prio | Lok<br><br>Funktion | 0     |        | 5     | Loc-ID   |          |          |          | Funktion |          |               |          |
|                     |                     |       |        |       | High     |          |          | Low      |          |          |               |          |
| Message Prio        | Lok Funktion        | 0\|1  |        | 6     | Loc-ID   |          |          |          | Funktion | Wert     |               |          |
|                     |                     |       |        |       | High     |          |          | Low      |          |          |               |          |
| Message Prio        | Lok Funktion        | 0\|1  |        | 8     | Loc-ID   |          |          |          | Funktion | Wert     | Funktionswert |          |
|                     |                     |       |        |       | High     |          |          | Low      |          |          |               |          |

Beschreibung:

Lok Funktion auslösen / ausschalten oder abfragen.

Funktion ist im Bereich 0-31. 0 entspricht F0, 31 entspricht F31. Der Status weiterer Funktionen wird im Gleis Format Prozessor nicht gespeichert.

Wert im Bereich von 0 bis 31, 0 = aus, 1 – 31 an. Bei Protokollen welche einen Funktionswert unterstützen wird dieser an Decoder gesendet. Funktionswerte werden nicht im Gleis Format Prozessor gespeichert, nur der Status.

DLC = 5: Abfrage Zustand der Funktion.

Abfrage des Zustandes einer Funktion. Geliefert wird nur Aktiv oder Inaktiv, nicht ein evtl. Dimmzustand Status aus Gleis Format Prozessor, nicht aus der Abfrage des Decoders.

DLC = 6: Aktivieren einer Funktion.

Einschalten einer Funktion. Je nach Gleisprotokoll wird die entsprechende Funktion eingeschaltet oder mit dem entsprechenden Dimmwert angesteuert. Der gültige Bereich eines Funktionswertes richtet sich nach den Lokdecodern und dem Gleisprotokoll.

DLC = 8: Aktivieren eines Wertes mit Sonderfunktionen. (Später, derzeit nicht implementiert). Wie bei DLC = 6. Funktionswert wird an Lokdecoder übermittelt.

Besonderheiten:

Erster Befehl nimmt Lok/Funktionsdecoder in Zyklus auf.

Dimmfunktionen und Dimmwert wird nicht im Gleis Format Prozessor gehalten (Speicher). Solange der Dimmwert aktiv sein soll, wird aktiv (1) zurückgemeldet.

Wird immer von Graphical User Interface Prozessor ausgelöst.

## Befehl: Read Config

Kennung:

Read Config (_0x07_, in CAN-ID: _0x0E_) Format:

| Prio                | Command            | Resp. | Hash   | DLC   | D-Byte 0 | D-Byte 1 | D-Byte 2 | D-Byte 3 | D-Byte 4                                   | D-Byte 5 | D-Byte 6 | D-Byte 7 |
| ------------------- | ------------------ | ----- | ------ | ----- | -------- | -------- | -------- | -------- | ------------------------------------------ | -------- | -------- | -------- |
| 2+2 Bit             | 8 Bit              | 1 Bit | 16 Bit | 4 Bit | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit                                      | 8 Bit    | 8 Bit    | 8 Bit    |
| Message<br><br>Prio | Read<br><br>Config | 0     |        | 7     | Loc-ID   |          |          |          | CV-Index (6 Bit)<br><br>CV-Nummer (10 Bit) |          | Anzahl   |          |
|                     |                    |       |        |       | High     |          |          | Low      |                                            |          |          |          |
| Message Prio        | Read Config        | 1     |        | 7     | Loc-ID   |          |          |          | CV-Index (6 Bit)<br><br>CV-Nummer (10 Bit) |          | Wert     |          |
|                     |                    |       |        |       | High     |          |          | Low      |                                            |          |          |          |
| Message Prio        | Read Config        | 1     |        | 6     | Loc-ID   |          |          |          | CV-Index (6 Bit)<br><br>CV-Nummer (10 Bit) |          |          |          |
|                     |                    |       |        |       | High     |          |          | Low      |                                            |          |          |          |

Beschreibung:

Lesen von Werten aus rückmeldefähigen Decodern.

Bei einer Anfrage wird die CV-Nummer und der Startindex angegeben. Durch die Anzahl der zu lesenden Bytes wird bestimmt, wie viele gelesen werden sollen. Eine Anfrage kann, bedingt durch die Anzahl der zu lesenden Bytes, mehrere Antworten auslösen.

Durch Loc-ID werden Protokoll und Adresse des Decoders bestimmt.

CV-Nummer bestimmt, welche Konfigurationsvariable gelesen werden soll. Möglich sind insgesamt 1024 Adressen. CV-Nummer steht in D-Byte 5 und den 2 niedrigstwertigen Bits von D-Byte 4.

CV-Index bestimmt den Index der zu lesenden CV-Nummer. CV-Index ist nur für Mfx zulässig. CV-Index steht in den 6 höchstwertigen Bits von D-Byte 4.

Bei der Antwort wird Byteweise ein Wert gesendet. CV-Nummer und CV-Index bestimmen dabei, um welches Bytes es sich handelt. Platzhalter Anzahl beinhaltet nun den gelesenen Wert.

Konnte kein Wert ausgelesen werden, so wird dies mit der negativen Quittung mit DLC = 6, also fehlendem Wert mitgeteilt.

Protokolltypische Wertebereiche und Verhalten:

DCC:

CV-Index wird nicht behandelt. CV-Nummer liegt im Bereich 1 - 1024.

Parameter "Anzahl" bestimmt die Anzahl der zu lesenden Bytes ab der angegebenen Start - CV-Nummer. Wert "00" für "Anzahl" liest 256 Bytes aus dem Decoder.

Als Antwort wird das gelesene Byte angehängt. CV-Nummer wird in der Antwort aktualisiert. Konnte kein Wert ausgelesen werden, so wird ein Frame mit DLC=6 und fehlendem D-Byte 6 ausgegeben.

Decoder kann nur auf dem Programmiergleis gelesen werden. MFX:

CV-Nummer liegt im Bereich zwischen 1 und 1024.

CV-Index wird beachtet und liegt im Bereich zwischen 0 und 63.

Parameter "Anzahl" bestimmt die Anzahl der zu lesenden Bytes ab dem angegebenen Start - CV-Index. Parameter CV-Nummer bleibt konstant. Es können maximal 63 Byte pro Befehl ausgelesen werden. Der Gleis Format Prozessor zerlegt die Leseanfrage in Mehrbytelesebefehle und liest maximal 4 Byte gleichzeitig aus dem Decoder aus.

Als Antwort wird das gelesene Byte angehängt. CV-Index wird in der Antwort aktualisiert. Konnte kein Wert ausgelesen werden, so wird ein Frame mit DLC=6 und fehlendem D-Byte 6 ausgegeben.

Decoder kann auf Hauptgleis und Programmiergleis gelesen werden. Eine Unterscheidung findet nicht statt.

SX1:

CV-Index wird nicht behandelt. CV-Nummer liegt im Bereich 1 - 5.

Parameter "Anzahl" bestimmt die Anzahl der zu lesenden Bytes ab der angegebenen Start - CV-Nummer "CV-Nummer". Es können maximal 5 Bytes gelesen werden.

Als Antwort wird das gelesene Byte angehängt. CV-Nummer wird in der Antwort aktualisiert. Konnte kein Wert ausgelesen werden, so wird ein Frame mit DLC=6 und fehlendem D-Byte 6 ausgegeben.

Da SX1 keine Nummerierung der Konfigurationswerte kennt, wird folgende Umsetzung vorgenommen:

| CV-Nummer | Bedeutung                      |
| --------- | ------------------------------ |
| 1         | Adresse                        |
| 2         | Höchstgeschwindigkeit          |
| 3         | Beschleunigung                 |
| 4         | Impulsbreite des Motorimpulses |
| 5         | 1 / 2 – Halteabschnitte        |

Ein Decoder kann nur auf dem Programmiergleis gelesen werden. MM2:

MM2 Loks können nicht ausgelesen werden.

Besonderheiten:

Wird immer von Graphical User Interface Prozessor ausgelöst. Der Befehl nimmt Lok/Funktionsdecoder nicht in Zyklus auf.

Je nach Protokoll nur auf dem Programmiergleis möglich.

Bei diesem Kommando handelt es sich um ein sequenziell in der Abarbeitung befindlichen Programmierbefehl. Diese werden nicht in einer Befehlqueue zwischengespeichert. Erst nach einer Antwort durch den Gleis Format Prozessor darf der nächste Programmierbefehl angefordert werden. Genau ein Programmierbefehl wird durch den Gleis Format Prozessor zeitgleich abgearbeitet.

## Befehl: Write Config

Kennung:

Write Config (_0x08_, in CAN-ID: _0x10_) Format:

| Prio                | Command             | Resp. | Hash   | DLC   | D-Byte 0 | D-Byte 1 | D-Byte 2 | D-Byte 3 | D-Byte 4                                  | D-Byte 5 | D-Byte 6 | D-Byte 7   |
| ------------------- | ------------------- | ----- | ------ | ----- | -------- | -------- | -------- | -------- | ----------------------------------------- | -------- | -------- | ---------- |
| 2+2 Bit             | 8 Bit               | 1 Bit | 16 Bit | 4 Bit | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit                                     | 8 Bit    | 8 Bit    | 8 Bit      |
| Message<br><br>Prio | Write<br><br>Config | 0     |        | 8     | Loc-ID   |          |          |          | CV-Index (6 Bit)<br><br>CV-Nummer (10Bit) |          | Wert     | Ctrl(2Bit) |
|                     |                     |       |        |       | High     |          |          | Low      |                                           |          |          |            |
| Message Prio        | Write Config        | 1     |        | 8     | Loc-ID   |          |          |          | CV-Index (6 Bit) CV-Nummer (10Bit)        |          | Wert     | Rslt(2Bit) |
|                     |                     |       |        |       | High     |          |          | Low      |                                           |          |          |            |

Beschreibung:

Schreiben von CV-Werten in einen programmierbaren Decoder.

Abhängig vom Protokoll des zu programmierenden Decoders sind unterschiedliche Parameter möglich. Das Schreiben der CV-Werte wird, sofern möglich, durch ein nachträgliches Lesen verifiziert. Im Bestätigungsframe wird das Ergebnis der Verifikation mitgeteilt. (> V3.0)

In Loc-ID stehen Protokoll und Adresse des zu programmierenden Decoders.

CV-Nummer bestimmt, welche Konfigurationsvariable verändert werden soll. Möglich sind insgesamt 1024 Adressen. CV-Nummer steht in D-Byte 5 und den 2 niedrig wertigen Bits von D-Byte 4.

CV-Index bestimmt einen möglichen Index der zu verändernden CV-Nummer. CV-Index ist nur für Mfx zulässig. CV-Index steht in den 6 höchstwertigen Bits von D-Byte 4.

Parameter Wert enthält das zu schreibende Byte. Bei Programmierart "DCC-Bitprogrammierung" hat das Datenbyte die Information im entsprechenden DCC Format also:

1111DBBB D: Wert des Bits, BBB: Bitposition.

Die Bedeutung des letzten Bytes im Telegramm ist für Anforderung und Bestätigung unterschiedlich:

#### Anforderung

Ctrl (Bit 8 & Bit 7) enthält Anweisungen zum Befehl.

Bit 8: Unterscheidung Gleis Hauptgleis (Wert = 1) oder Programmiergleis (Wert = 0) Bit 7: Multibyteschreiben Es folgen weitere Schreibbefehle.

Bit 6: DCC Programmierart 1 (DCC Register oder Direct / Bitprogrammierung ) Bit 5: DCC Programmierart 2

Anz (Bits 4 bis 0) ist Reserviert DCC Programmierartauswahl:

| DCC1 | DCC2 | Art                     |
| ---- | ---- | ----------------------- |
| 0    | 0    | Direct Programmierung   |
| 0    | 1    | Register Programmierung |
| 1    | 0    | Bitprogrammierung       |
| 1    | 1    | Reserviert              |

#### Bestätigung

In Result (Bit 8 & Bit 7) stehen die Ergebnisse zu Schreiben und Verifizieren: Bit 8: Schreiben erfolgreich betätigt durch Kontroller.

Bit 7: Verifiy erfolgreich verlaufen.

Je nach Decodertyp können negative Ergebnisse trotz allem erfolgreich verlaufen sein. Z.B. wenn diese weder Auslesen noch Bestätigen beherrschen.

Protokolltypische Wertebereiche und Verhalten:

DCC:

CV-Index wird nicht behandelt.

CV-Nummer liegt im Bereich 1 - 1024. Schreiben auf Programmiergleis und Hauptgleis

Decoder kann vollständig auf dem Programmiergleis beschrieben werden.

Parameter, die mit "POM" manipuliert werden können, sind auch auf dem Hauptgleis veränderbar. MFX:

CV-Nummer liegt im Bereich zwischen 1 und 1024.

CV-Index wird beachtet und liegt im Bereich zwischen 1 und 63.

Das Schreiben findet grundsätzlich auf Hauptgleis und Programmiergleis statt. SX1:

CV-Index wird nicht behandelt. CV-Nummer liegt im Bereich 1 - 5.

Ein Decoder kann nur auf dem Programmiergleis programmiert werden.

Bei SX1 haben die Parameter keine Nummern. Folgende Umsetzung wird vorgenommen:

| CV-Nummer | Bedeutung                      |
| --------- | ------------------------------ |
| 1         | Adresse                        |
| 2         | Höchstgeschwindigkeit          |
| 3         | Beschleunigung                 |
| 4         | Impulsbreite des Motorimpulses |
| 5         | 1 / 2 – Halteabschnitte        |

MM2:

CV-Index wird nicht behandelt. CV-Nummer liegt im Bereich 1 - 256.

Die Programmierung kann sowohl nur auf dem Programmiergleis stattfinden.

Durch die in der Loc-ID angegebene MM2 Adresse lässt sich die "MM2 Programmieradresse" festlegen. Ein programmierbarer MM2 - Decoder kann entweder unter seiner eigenen Adresse oder auf Adresse 80 programmiert werden. Dies ist auf dem Hauptgleis zu beachten.

Besonderheiten:

Wird immer von Graphical User Interface Prozessor ausgelöst. Der Befehl nimmt Lok/Funktionsdecoder nicht in Zyklus auf.

Bei MM2 bestimmt diese Adresse die Programmieradresse, unter welcher das Programmieren stattfindet. Also auch von Adresse 80 abweichende Adressen.

Bei diesem Kommando handelt es sich um ein sequenziell in der Abarbeitung befindlichen Programmierbefehl. Diese werden nicht in einer Befehlqueue zwischengespeichert. Erst nach einer Antwort durch den Gleis Format Prozessor darf der nächste Programmierbefehl angefordert werden. Genau ein Programmierbefehl wird durch den Gleis Format Prozessor zeitgleich abgearbeitet.