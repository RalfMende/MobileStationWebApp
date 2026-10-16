# GUI Informationsübertragung

Konfigurationsabgleich mehrerer Graphical User Interface Prozessors.

## Befehl: Anfordern Config Data

Kennung:

Anfordern Config Data (_0x20_, in CAN-ID: _0x40_) Format:

| Prio         | Command     | Resp. | Hash   | DLC   | D-Byte 0 | D-Byte 1 | D-Byte 2 | D-Byte 3 | D-Byte 4 | D-Byte 5 | D-Byte 6 | D-Byte 7 |
| ------------ | ----------- | ----- | ------ | ----- | -------- | -------- | -------- | -------- | -------- | -------- | -------- | -------- |
| 2+2 Bit      | 8 Bit       | 1 Bit | 16 Bit | 4 Bit | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    |
| Message Prio | Konfig Data |       | Hash   | 8     | Byte 0   | Byte 1   | Byte 2   | Byte 3   | Byte 4   | Byte 5   | Byte 6   | Byte 7   |

Beschreibung:

Anfordern einer Configdatei. Darin enthalten ist ein 8 Byte Dateiname. Bestätigen der Anforderung mit gesetztem Resp. Bit.

Die folgenden Dateinamen werden von der CS2 unterstützt:

| **Dateiname** | **Ab-sender**      | **Bedeutung**                          | **Folge-Info**                                                                                 | **Stream-Datenformat**                                                       |
| ------------- | ------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| "lokinfo"     | MS2                | Daten einer Lok                        | Anfang des Lok-Namens 2 Pakete mit zusammen<br><br>max. 16 Zeichen                             | Text (Ausschnitt aus "lokomotive.cs2")                                       |
| "loknamen"    | MS2                | Namen von n Loks und Gesamtzahl        | 1 Datagram mit Nr. der ersten Lok und Anzahl durch Leerzeichen<br><br>getrennt                 | Text: Lok-Nr, Lok-Name und Gesamtanzahl der Loks im .cs2-Format.             |
| "maginfo"     | MS2                | Daten von n Magnetartikeln             | 1 Datagram mit Adresse des ersten Magnet-artikels und Anzahl durch<br><br>Leerzeichen getrennt | Text (Ausschnitt aus "magnetartikel.cs2")                                    |
| "lokdb"       | MS2                | Lokdatenbank                           | \-                                                                                             | Binär<br><br>(MS2-Lokdb-Format)                                              |
| „lang"        | MS2                | Sprachendatei                          | \-                                                                                             | Binär<br><br>(MS2-Sprachen-Format)                                           |
| „ldbver"      | MS2                | Versionsinfo der Lokdatenbank          | \-                                                                                             | Text: Versionsnummer, Monat, Jahr, Anzahl der<br><br>Einträge im .cs2-Format |
| „langver"     | MS2                | Versionsinfo der Sprachendatei         | \-                                                                                             | Text: Versionsnummer und Größe der Sprachendatei<br><br>im .cs2-Format       |
| „loks"        | CS2<br><br>(Slave) | Komplette Lokliste                     | \-                                                                                             | Konfigurationsdatei<br><br>„lokomotive.cs2"<br><br>**Zlib-komprimiert**      |
| „mags"        | CS2<br><br>(Slave) | Komplette Magnetartikel-konfiguration  | \-                                                                                             | Konfigurationsdatei<br><br>„magnetartikel.cs2"<br><br>**Zlib-komprimiert**   |
| „gbs"         | CS2<br><br>(Slave) | Komplette Gleisbildgrund-konfiguration | \-                                                                                             | Konfigurationsdatei<br><br>„gleisbild.cs2"<br><br>**Zlib-komprimiert**       |
| „gbs-#"       | CS2                | Konfiguration einer                    | \-                                                                                             | Konfigurationsdatei einer                                                    |

|           | (Slave)            | Gleisbildseite                                |     | Gleisbildseite<br><br>**Zlib-komprimiert**                                |
| --------- | ------------------ | --------------------------------------------- | --- | ------------------------------------------------------------------------- |
| „fs"      | CS2<br><br>(Slave) | Komplette Fahrstraßen-konfiguration           | \-  | Konfigurationsdatei<br><br>„fahrstrassen.cs2"<br><br>**Zlib-komprimiert** |
| „lokstat" | CS2<br><br>(Slave) | Aktueller Zustand der Loks                    | \-  | Statusdatei<br><br>„lokomotive.sr2"<br><br>**Zlib-komprimiert**           |
| „magstat" | CS2<br><br>(Slave) | Aktueller Zustand der Magnetartikel           | \-  | Statusdatei<br><br>„magnetartikel.sr2"<br><br>**Zlib-komprimiert**        |
| „gbsstat" | CS2<br><br>(Slave) | Aktueller Zustand einer<br><br>Gleisbildseite | \-  | Statusdatei „gleisbild.sr2"<br><br>**Zlib-komprimiert**                   |
| fsstat    | CS2<br><br>(Slave) | Reserve für Fahrstrassen                      | \-  | _Nicht implementiert_                                                     |

Wenn in der Spalte Folge-Info etwas angegeben ist, erwartet die Master-CS2 nach der Quittung

**eine(?)** weitere Config-Data-Anfrage, in der die erste Anfrage weiter qualifiziert wird.

Besonderheiten:

Kann vom PC auch angefordert werden (für Datensicherung).

## Befehl: Config Data Stream

Kennung:

Config Data Stream (_0x21_, in CAN-ID: _0x42_) Format:

| Prio                | Command                | Resp. | Hash   | DLC   | D-Byte 0                          | D-Byte 1 | D-Byte 2 | D-Byte 3 | D-Byte 4 | D-Byte 5 | D-Byte 6 | D-Byte 7 |
| ------------------- | ---------------------- | ----- | ------ | ----- | --------------------------------- | -------- | -------- | -------- | -------- | -------- | -------- | -------- |
| 2+2 Bit             | 8 Bit                  | 1 Bit | 16 Bit | 4 Bit | 8 Bit                             | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    |
| Message<br><br>Prio | CFG Data<br><br>Stream |       |        | 6     | Dateilänge / Streamlänge in Bytes |          |          |          | CRC      |          |          |          |
|                     |                        |       |        |       | High                              |          |          | Low      | High     | Low      |          |          |
| Message Prio        | CFG Data Stream        |       |        | 7     | Dateilänge / Streamlänge in Bytes |          |          |          | CRC      |          | Byte 6   |          |
|                     |                        |       |        |       | High                              |          |          | Low      | High     | Low      |          |          |
| Message Prio        | CFG Data Stream        |       |        | 8     | Byte 0                            | Byte 1   | Byte 2   | Byte 3   | Byte 4   | Byte 5   | Byte 6   | Byte 7   |

Beschreibung:

Überträgt den Datenstrom einer Konfigurationsdatei.

Folgt unmittelbar auf das (letzte) Antwortframe der "Config Data Anforderung" oder zum Mitteilen einer Konfigurationsänderung per Broadcast. Durch die DLC wird der Inhalt unterschieden:

DLC = 6:

Ist das erste Paket im Datenstrom. Es definiert den Datenstrom als Antwort auf eine Config Data Anfrage. Es enthält die Dateilänge in Bytes, sowie die CRC der zu übertragenden Bytes.

Bei diesem Typ des Datenstroms wird zur Kollisionsauflösung der Hash des **Empfängers** verwendet.

Erweiterung: Dies kann auch die Antwort auf eine "blokinfo" Frage sein. Dieser Text wird zu einem Rückmeldekontakt / Block dargestellt. Bietet somit die Möglichkeit einer freien Textdarstellung im Gleisbild.

DLC = 7:

Ist das erste Paket im Datenstrom. Es definiert den Datenstrom als Broadcast einer Konfigänderung. Es enthält die Dateilänge in Bytes, sowie die CRC der zu übertragenden Bytes, sowie einem reservierten Byte. Der Datenstrom ist bei dieser Übertragungsform immer(?) Zlib-Komprimiert.

Bei diesem Typ des Datenstroms wird zur Kollisionsauflösung der Hash des **Senders** verwendet.

DLC = 8:

Datenpaket: Es enthält immer 8 Byte an Daten. Stehen weniger Daten zur Verfügung, so wird mit 0x00 gepaddet. Wird immer ab dem 2.ten Datenpaket gesendet. Hash richtet sich nach obiger Systematik.

Alle anderen DLC-Längen:

Tritt im Datenstrom eine andere Länge auf, so ist der Empfang abzubrechen bzw. zu beenden.

Besonderheiten:

Pakete werden nicht bestätigt und werden mit niedriger Prio im CAN übertragen.

Der CRC ist ein 16-Bit-CRC mit dem Startwert 0xFFFF und dem Polynom 0x1021, der nach folgendem Algorithmus berechnet wird.

```
u16 CtDataSender::updateCRC (u16 CRC_acc, u8 CRC_input)
{
#define POLY 0x1021
// Create the CRC "dividend" for polynomial arithmetic (binary arithmetic with no carries) CRC_acc = CRC_acc ^ (CRC_input << 8);
// "Divide" the poly into the dividend using CRC XOR subtraction CRC_acc holds the
// "remainder" of each divide. Only complete this division for 8 bits since input is 1 byte for (int i = 0; i < 8; i++) {
// Check if the MSB is set (if MSB is 1, then the POLY can "divide" into the "dividend") if ((CRC_acc & 0x8000) == 0x8000) {
// if so, shift the CRC value, and XOR "subtract" the poly CRC_acc = CRC_acc << 1;
CRC_acc ^= POLY;
}
else {
// if not, just shift the CRC value CRC_acc = CRC_acc << 1;
}
}
// Return the final remainder (CRC value) return CRC_acc;
}
```