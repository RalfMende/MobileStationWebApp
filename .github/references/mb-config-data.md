# Config Data

Es wurden 3 weitere Namen für die Config Daten beobachtet:

## ms2-conf

Die Antwort scheint die Gleisprotokolle zu liefern. Beobachtet wurde die Anforderung durch den MS2 Slave und die Antwort wurde auch durch den MS2 Slave verschickt. Diese Config Daten wurden ab der MS2 Version 3.55 beobachtet. Ein Beispiel für die Antwort ist:

```
[config]
.magprot=0
.lokprot=7
```

## lokliste

Die Lokliste fordert sämtliche Loknamen an anstelle einzelner Loknamen mit dem Config Data Namen loknamen. Diese Config Daten wurden ab der MS2 Version 3.55 beobachtet.

Die lokliste ist nicht z-lib gepackt. Sie wird auf Anforderung mit einem CAN Config Data Stream mit DLC=7 eingeleitet. Eigentlich sollten angeforderte Daten mit Config Data Stream mit DLC=6 eingeleitet werden.

```
[lokliste]
.dv=0
.idx=0
.llindex=0
.name=BR 140
.crc=34783
.idx=1
.llindex=1
.name=BR 89
.crc=5772
.idx=2
.llindex=2
.name=BR 260
.crc=8027
```

Auffallend ist, daß ein Datensatz nicht mit einem zusätzlichen Schlüsselwort eingeleitet wird und dann die Daten eine Ebene tiefer sind. Damit ist der Aufbau nicht ganz konsistent zu den anderen \*.cs2 Formaten. Der letzte Index in der Lokliste ist die höchste Positionn in der Schnellzugriffsliste, die belegt ist. Es werden auch nicht belegt Positionen (Lücken) mitgeliefert.

| Schlüsselwort | Bedeutung                          |
|---------------|------------------------------------|
| `.dv=0`       | ?                                  |
| `.idx=0`      | Position in der Schnellzugriffsliste |
| `.llindex=0`  | Position in der Schnellzugriffsliste |
| `.name=BR 140`| Lokname                            |
| `.crc=34783`  | ?                                  |

## lokinfo

Ab der Version 3.55 der MS2 enthält die Lokinfo zusätzlich den Wert .dv=0. Wie die lokliste wird auch die lokinfo mit einem Config Data Stream mit DLC=7 eingeleitet. Ältere Version der MS2 Software hatten die lokinfo mit Config Data Stream mit DLC=6 eingeleitet werden.

## files

Mit Files wird ein Directory Listing angefordert. Die zweite Nachricht ist die UID der MS2, von der das Directory Listing angefordert wird. Diese Config Daten wurden ab der MS2 Version 3.55 beobachtet.

Der Request sieht wie folgt aus:

```
cmd=20 CONFIG_DATA  rsp=0 id=0x00407B52 dlc=8 flags=08 data=66 69 6C 65 73 00 00 00 [files...]
cmd=20 CONFIG_DATA  rsp=0 id=0x00407B52 dlc=8 flags=08 data=34 64 35 35 61 39 32 31 [4d55a921]
```

Das Komando wird zuerst bestägt. anschließend wird das Directory Listing verschickt.

```
cmd=20 CONFIG_DATA  rsp=1 id=0x00417B52 dlc=8 flags=08 data=66 69 6C 65 73 00 32 31 [files.21]
```
