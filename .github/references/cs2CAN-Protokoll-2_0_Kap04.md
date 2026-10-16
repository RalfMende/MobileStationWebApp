# Zubehör-Befehle

Die Stellung des Zubehörs wird im Gleis Format Prozessor nicht gespeichert. Eine Funktion ist immer (auch vor Zeit - Ablauf) abschaltbar.

## Befehl: Zubehör Schalten

Kennung:

Zubehör schalten (_0x0B_, in CAN-ID: _0x16_) Format:

| Prio         | Command          | Resp. | Hash   | DLC   | D-Byte 0 | D-Byte 1 | D-Byte 2 | D-Byte 3 | D-Byte 4 | D-Byte 5 | D-Byte 6                         | D-Byte 7 |
| ------------ | ---------------- | ----- | ------ | ----- | -------- | -------- | -------- | -------- | -------- | -------- | -------------------------------- | -------- |
| 2+2 Bit      | 8 Bit            | 1 Bit | 16 Bit | 4 Bit | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit    | 8 Bit                            | 8 Bit    |
| Message Prio | Zubehör Schalten | 0\|1  |        | 6     | Loc-ID   |          |          |          | Stellung | Strom    |                                  |          |
|              |                  |       |        |       | High     |          |          | Low      |          |          |                                  |          |
| Message Prio | Zubehör Schalten | 0\|1  |        | 8     | Loc-ID   |          |          |          | Stellung | Strom    | Schaltzeit / Sonderfunktionswert |          |
|              |                  |       |        |       | High     |          |          | Low      |          |          |                                  |          |

Beschreibung:

Schaltbefehl an Zubehördecoder senden. DLC = 6:

Schalten mit Default Timeout / Systemtimeout des Gleis Format Prozessor (Siehe Befehl: "Schaltzeit Zubehördecoder")

- Stellung 0 - 255, je nach Protokoll unterschiedliche Werte möglich.
- Strom 0 - 31 (Dimmfunktion, je nach Unterstützung durch Protokoll) 0: Ausschalten.

1: Einschalten.

\>1: Einschalten mit Sonderfunktionswert sofern Protokoll dies unterstützt.

- Schaltzeit: Gleis Format Prozessor gesteuerte Schaltzeit in 10ms Schritten.

Bei Schaltzeit = 0: Gleis Format Prozessor schaltet nur ein.

Gleis Format Prozessor kann Schaltzeit nur im Telegrammrahmenraster realisieren. Schaltzeitangaben sind nur rudimentär einzuhalten.

Der Gleis Format Prozessor schaltet bei Strom = 0 ab ODER nach Default-Zeit. (Default ist durch Systembefehl "Schaltzeit Zubehördecoder festlegen" bestimmbar, Default ist ca. 1s.)

Protokollspezifische Stellungskodierung MM3:

Bit 0,1: Stellung:

00: Aus, Rund, Rot, Rechts, HP0 01: Ein, Grün, Gerade, HP1

10: Gelb, Links, HP2 11: Weis, SH0

DCC: Nur Stellung 0 (aus) oder 1 (ein) möglich. SX1: Nur Stellung 0 (aus) oder 1 (ein) möglich.

Besonderheiten:

Wird immer von Graphical User Interface Prozessor ausgelöst.

Schaltbefehle werden durch den Gleis Format Prozessor priorisiert gesendet, vor Fahr- / Funktionsbefehlen.