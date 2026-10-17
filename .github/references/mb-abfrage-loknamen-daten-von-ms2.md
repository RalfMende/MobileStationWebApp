# Abfrage Loknamen und -daten von der MS2

Wenn von einer MS2 Loknamen oder Lokdaten abgefragt werden während die MS2 auf Stop steht, kann sie in einen Zustand geraten, in dem sie nicht mehr richtig funktioniert. Diese Daten sollten nur abgefragt werden, wenn die MS2 selbst ping Nachrichten verschickt.

Mit der Version 3.55 der MS2 fordert die MS2 nicht mehr die "loknamen" an sondern liest alle Loknamen auf einmal mit der "lokliste" (siehe [hier](./mb-config-data.md). Die Version 3.55 der MS2 reagiert nicht auf die Abfrage der Loknamen.

Die lokliste ist nicht z-lib gepackt. Sie wird dennoch mit einem CAN Config Data Stream mit DLC=7 eingeleitet. Eigentlich sollten nicht gepackte Daten mit Config Data Stream mit DLC=6 eingeleitet werden.

Ab der Version 3.55 der MS2 enthält die Lokinfo zusätzlich den Wert .dv=0. Wie die lokliste wird auch die lokinfo mit einem Config Data Stream mit DLC=7 eingeleitet. Ältere Version der MS2 Software hatten die lokinfo mit Config Data Stream mit DLC=6 eingeleitet werden.