---
name: protocol-development
description: Implementiert Funktionen gemäß der Protokoll-Spezifikation dieses Repositories. Verwenden beim Erstellen oder Ändern von Nachrichtenformaten, Parsern, Serialisierung, Deserialisierung, Kommunikationsabläufen, Protokollkonstanten und zugehörigen Tests.
---

# Protocol Development

## Ziel

Implementiere den Anwendungscode so, dass er die maßgebliche Protokoll-Spezifikation exakt einhält. Bestehende Architektur und Konventionen des Repositories bleiben erhalten.

## Verbindliche Referenzen

Die fachliche Quelle ist die Original-Spezifikation unter `docs/protocol/cs2CAN-Protokoll-2_0.pdf` bzw. `docs/protocol/cs2CAN-Protokoll-2_0.docx`.

Die durchsuchbaren Markdown-Referenzen befinden sich hier:

- [CAN Anschluss](./references/cs2CAN-Protokoll-2_0_Kap01.md)
- [System Befehle](./references/cs2CAN-Protokoll-2_0_Kap02.md)
- [Verwaltung](./references/cs2CAN-Protokoll-2_0_Kap03.md)
- [Zubehoer Befehle](./references/cs2CAN-Protokoll-2_0_Kap04.md)
- [Rueckmeldungen](./references/cs2CAN-Protokoll-2_0_Kap05.md)
- [Sonstige Befehle](./references/cs2CAN-Protokoll-2_0_Kap06.md)
- [GUI Informationsübertragung](./references/cs2CAN-Protokoll-2_0_Kap07.md)
- [Format der Konfigurationsdateien der CS2](./references/cs2CAN-Protokoll-2_0_Kap08.md)
- [Automatisierung](./references/cs2CAN-Protokoll-2_0_Kap09.md)
- [Abkürzungen](./references/cs2CAN-Protokoll-2_0_Kap10.md)

Lies nur die Referenzabschnitte, die für die aktuelle Aufgabe relevant sind. Wenn eine Datei noch nicht existiert, suche in den vorhandenen Referenzen und kennzeichne fehlende Informationen. Erfinde keine Inhalte.

Bei Widersprüchen oder unklaren Angaben:
1. Prüfe den betreffenden Abschnitt in der Original-Spezifikation.
2. Dokumentiere den Widerspruch mit Kapitel- oder Seitenangabe.
3. Triff keine unbelegte Protokollentscheidung.
4. Frage nach, wenn die Implementierung von der ungeklärten Entscheidung abhängt.

## Arbeitsablauf

1. Analysiere die Aufgabenstellung und identifiziere die betroffenen Protokollfunktionen.
2. Untersuche die bestehende Implementierung, verwandte Klassen, Schnittstellen und Tests.
3. Ermittle die einschlägigen Abschnitte der Spezifikation.
4. Erstelle einen kurzen Implementierungsplan, wenn mehrere Komponenten betroffen sind.
5. Implementiere die kleinstmögliche konsistente Änderung.
6. Ergänze oder aktualisiere automatisierte Tests.
7. Führe die verfügbaren relevanten Tests aus und prüfe die Ergebnisse.
8. Berichte, welche Protokollanforderungen umgesetzt wurden und welche Punkte ungeklärt bleiben.

## Implementierungsregeln

- Übernimm Feldnamen, Feldreihenfolge, Datentypen, Längen, Kodierungen, Wertebereiche und Standardwerte gemäß Spezifikation.
- Berücksichtige Byte-Reihenfolge, Bitbelegung, optionale Felder und Rahmenbedingungen, sofern sie für das Protokoll definiert sind.
- Unterscheide ausdrücklich zwischen Protokollvorgaben und bestehenden Projektentscheidungen.
- Erfinde keine Nachrichten-IDs, Flags, Fehlercodes, Zeitlimits oder Rückfallverhalten.
- Führe keine stillschweigenden Änderungen an bestehenden Protokollsemantiken durch.
- Validiere externe Eingaben und behandle fehlerhafte oder unvollständige Nachrichten entsprechend der spezifizierten Regeln.
- Vermeide unnötige Änderungen an nicht betroffenen Komponenten.
- Verwende die im Repository vorhandenen Bibliotheken, Stile und Testverfahren, sofern kein begründeter Änderungsbedarf besteht.

## Tests

Berücksichtige, soweit für die jeweilige Funktion relevant:

- gültige Nachrichten und reguläre Abläufe
- ungültige Nachrichten und fehlerhafte Eingaben
- minimale und maximale Feldwerte
- fehlende, optionale oder zusätzliche Felder
- ungültige Längen, Kodierungen und Werte
- Grenzfälle bei Byte-Reihenfolge und Bitmasken
- Rückwärtskompatibilität bestehender Nachrichten
- Fehlerbehandlung und Abbruchbedingungen

Leite erwartete Werte aus der Spezifikation ab. Erfinde keine Testvektoren, die nicht fachlich begründet sind.

## Abschluss

Melde nach der Implementierung:

- geänderte Dateien und deren Zweck
- umgesetzte Protokollanforderungen mit Kapitel- oder Seitenverweisen, soweit verfügbar
- ausgeführte Tests und deren Ergebnis
- bekannte Einschränkungen und offene Fragen

Behaupte nicht, dass die Implementierung vollständig konform ist, wenn relevante Anforderungen oder Tests nicht überprüft wurden.
