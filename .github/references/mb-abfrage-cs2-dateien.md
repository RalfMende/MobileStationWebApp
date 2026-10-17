# Abfrage *.cs2 Dateien

Für z-lib komprimierte Dateien muß als erste Nachricht die Config Data Stream Nachricht mir 7 Bytes Länge benutzt werden, wobei das reservierte Byte den Wert 0x7b hat.

Anschließend folgen die Daten in Config Data Stream Nachrichten mit 8 Bytes Länge. Das erste Paket enthält zuerst die Länge der unkomprimierten Daten! Erst danach folgen die z-Lib komprimierten Daten!. Die letzte Nachricht wird mit 0 auf 8 Bytes aufgefüllt. Die CRC aus der Data Stream Nachricht mit 7 Bytes Länge wird über sämtliche Daten inclusive der unkomprimierten Länge und der Füllbytes berechnet.

Die CAN Prio der Datennpakete muß auf 0 gesetzt werden! Obwohl die Prio als nicht maßgeblich für die Kommandoauswertung definiert ist und die Daten mit geringer Prio gesendet werden sollen.

Die App RemoteCS2 (CS2.exe) erwartet in der lokomotive.cs2 in jedem Datensatz einer Lokomotive zuerst das Feld mit dem Namen, da dies eindeutig ist und als Key verwendet werden kann. Diese Eigenschaft ist nicht aus der Beschreibung von Märklin ableitbar!