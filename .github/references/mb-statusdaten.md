# Statusdaten

Es gibt von der CAN Nachricht Statusdaten (0x1d) eine Variante mit DLC=6 und der Paketanzahl und DLC=8 mit 8 Byte Daten. Damit wäre die erwartete Anwort auf das Anfordern der Statusdaten wie folgt:
```
Statusdaten 0x1d, DLC=6
           |
           V
Statusdaten 0x1d, DLC=8
          ...
Statusdaten 0x1d, DLC=6
           |
           V
Statusdaten 0x1d, DLC=7, Response Bit gesetzt
```
Leider gibt es aufgrund von Fehlern auch einen Ablauf mit der MS2, bei dem zuerst die Daten mit Statusdaten (0x1d, DLC=8) geschickt werden und anschließend eine Nachricht Statusdaten (0x1d, DLC=6) mit der Anzahl der Pakete geschickt wird. Dieser Ablauf wird nicht mit Statusdaten (0x1d, DLC=5, Response Bit) quitiert.

Es empfiehlt sich damit der folgende Ablauf:

Wenn zuerst die Anzahl der Pakete geschickt wird, werden alle Daten solange "gesammelt", bis die Anzahl Pakete erreicht ist. Dann können die Daten ausgewertet werden.

Wenn zuerst die Pakete gesendet werden, kann mit dem ersten Paket ein Puffer angelegt werden, der ausreichend groß ist (was immer ausreichen hier bedeutet). Wenn der Befehl quitiert wird, können die Daten ausgewertet werden.

Die Quitierung des Befehls wird nicht zum Auslösen einer Aktion benutzt.