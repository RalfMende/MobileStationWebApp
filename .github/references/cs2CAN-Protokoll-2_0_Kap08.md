# Format der Konfigurationsdateien der CS2

Die Formatdateien der CS2 unterliegen einer beständigen Weiterentwicklung. Erweiterungen zu den bisherigen Inhalten sind jederzeit möglich. Unbekannte / bisher nicht dokumentierte Einträge sind daher möglich.

## Konfigurationsdatei "Lokomotive.cs2"

Diese Datei enthält die Konfigurationsdaten aller Lokomotiven der CS2. Grundformat:

```
[lokomotive] version
.major=0
.minor=3 session
.id=24 lokomotive
.uid=0xc002
.name=Dcc-2
.vorname=Dcc-2
.adresse=0x3e8
.typ=dcc
.sid=0xcdcd
.mfxuid=0xffffffff
.icon=
.symbol=0
.av=30
.bv=30
.volume=2
.progmask=0x2
.velocity=0
.richtung=0
.tachomax=350
.vmax=255
.vmin=1
.xprot=3
.mfxtyp=205
.funktionen
..nr=0
..typ=1
..dauer=0
..wert=0
.inTraktion=0xffffffff
```

- - 1. Sektion "version" Beschreibung:

Entält die Versionsnummer der Konfigurationsdatei. Wird verwendet um die Rückwärtskompatibilität herzustellen. Diese Sektion darf nur einmal vorhanden sein.

Felder:

.major={Wert}

.minor={Wert}

Aktuelle Werte sind .major=0 und .minor=3

- - 1. Sektion "session" Beschreibung:

Der Wert des aktuellen mfx Neuanmeldezähler. Der MFX Neuanmeldezähler wird zur Anmeldung von mfx-lokomotiven benötigt. Diese Sektion darf nur einmal vorhanden sein.

Felder:

.id={Wert}

Beginndend bei 1. Max ist 65536.

- - 1. Sektion "lokomotive" Beschreibung:

Enthält die Konfigurationsdaten einer Lokomotive.

Felder:

.uid=0xc002 UID in Hexadezimaler Darstellung.

.name=Dcc-2 aktueller Name der Lokomotive.

.vorname=Dcc-2 Name vor der letzten Änderung

(erlaubt Namensänderungen an andere CS2-en zu kommunizieren)

.adresse=0x3e8 Adresse als Hex.

.typ=dcc Decodertyp: mm2_prg, mm2_dil8, dcc, mfx, sx1

.sid=0xcdcd bei mfx: Die SID

.mfxuid=0xffffffff bei mfx: UID des Decoders

.icon= Leer: noch kein Icon gewählt, sonst: Dateiname ohne Endung

.symbol=0 Lok-Symbol für MS1 (0=Elok, 1=Diesellok, 2=Dampflok, 3=kein Icon)

.av=30 Anfahrverzögerung

.bv=30 Bremsverzögerung

.volume=2 Lautstärke

.progmask=0x2 Interner Merker für Lokprogrammierung, zu programmierende Werte

.velocity=0 Fahrgeschwindigkeit der Lok

.richtung=0 Fahrtrichtung der Lok

.tachomax=350 Endausschlag des Tachos

.vmax=255 Maximalsgeschwindigkeit der Lok

.vmin=1 Minimalgeschwindigkeit der Lok

.xprot=3 Erweitertes Protokoll (Fahrstufen, Unterprotokoll)

.mfxtyp=205 Typ des mfx Decoders

.funktionen Eröffnung einer 2.Ebene. Es folgen die 16 Funktionen. Pro Erweiterung ein Feld Paramter der Ebene siehe Kapitel funktionen

.inTraktion=0xffffffff kein Mitglied einer Traktion

.prg Eröffnung einer 2.Ebene. Pro Erweiterung ein Feld

Erweiterter Programmiermodus. Es folgen die Definitionen des Konfigurationsdialogs. Pro Zeile ein Eintrag. Paramter der Ebene siehe Kapitel prg

- - - 1. 2\. Ebene Sektion ".funktionen" Beschreibung:

Beschreibt das Verhalten und Aussehen einer Funktion auf der Oberfläche.

Felder:

..nr=0 Beschreibung 0 -> F0 15 -> F15

..typ=1 Datei-Nummer des F-Icons (hier Licht)

..dauer=0 Auslösedauer, 0: Dauerfunktion, -1 Momentfunktion, sonst Zeitfunktion

..wert=0 aktueller Zustand

- - - 1. 2\. Ebene Sektion ".prg" Beschreibung:

Beschreibt eine Zeile in der erweiterten CV-Programmierung. Diese finden Verwendung innerhalb des erweiterten CV-Zugriffs.

Felder:

..adresse=1 Nummer der CV

..name=Cv Name Name der CS

..wert=3 aktuell eingetragener Wert

..maske=0 Bitmaske

## Konfigurationsdatei "magnetartikel.cs2"

Enthält die Konfiguration und Stellungen der Magnetartikel Grundformat:

```
[magnetartikel]
version
.major=0
.minor=1 artikel
.id=1
.name=src
.typ=lichtsignal_HP012_SH01
.stellung=2
.schaltzeit=200
.ungerade=0
.dectyp=mm2
```

- - 1. Sektion "version" Beschreibung

Entält die Versionsnummer der Konfigurationsdatei. Wird verwendet um die Rückwärtskompatibilität herzustellen. Diese Sektion darf nur einmal vorhanden sein.

Felder:

.major={Wert}

.minor={Wert}

Aktuelle Werte sind .major=0 und .minor=1

- - 1. Sektion "artikel" Beschreibung

Enthält die Beschreibung genau eines Magnetartikels.

Felder:

artikel Beginn Beschreibung eines Artikels

.id=1 Adresse des Artikels

.name=Signal 1 Name/Bezeichnung des Artikels

.typ= std_rot_gruen Typ des Artikels. Mögliche Werte: std_rot_gruen

std_rot std_gruen

entkupplungsgleis entkupplungsgleis_1 rechtsweiche linksweiche y_weiche k84_ausgang k84_doppelausgang dreiwegweiche DKW 2 Antriebe

DKW 1 Antrieb lichtsignal_HP01 lichtsignal_HP02 lichtsignal_HP012 lichtsignal_HP012_SH01 lichtsignal_SH01 formsignal_HP01

formsignal_HP02 formsignal_HP012 formsignal_HP012_SH01 formsignal_SH01 urc_lichtsignal_HP01 urc_lichtsignal_HP012 urc_lichtsignal_HP012_SH01 urc_lichtsignal_SH01 schiebebuehne drehscheibe_alt digitaldrehscheibe

.stellung=1 aktuelle Stellung

.schaltzeit=200 eingestellte Schaltzeit

.ungerade=0 Bei Artikeln mit einem Begriff relevant

.dectyp=mm2 Decodertyp, entweder dcc oder mm2

## Konfigurationsdatei "fahrstrasse.cs2"

Enthält die Konfiguration und Stellungen der Magnetartikel. Jede Konfiguration kann eine der vorkonfigurierten Plätze belegen.

Grundformat:

```
[fahrstrassen] version
.major=0
.minor=1 fahrstrasse
.id=1
.name=FS1ein
.s88=1
.s88Ein=1
.extern=1
.item
..fsverweis=-1
..magnetartikel=23
..stellung=1
```

- - 1. Sektion "version" Beschreibung

Entält die Versionsnummer der Konfigurationsdatei. Wird verwendet um die Rückwärtskompatibilität herzustellen. Diese Sektion darf nur einmal vorhanden sein.

Felder:

.major={Wert}

.minor={Wert}

Aktuelle Werte sind .major=0 und .minor=1

- - 1. Sektion "fahrstrasse" Beschreibung

Listet einen Eintrag einer Fahrstrasse auf Felder:

.id=1 Nummer der Fahrstrasse

.name=FS1ein Name der Fahrstrasse

.s88=1 S88-Kontakt, der diese Fahrstrasse beim Schließen auslöst, 0 wenn keine S88-Steuerung gewünscht

.s88Ein=1 S88-Kontakt, der diese Fahrstrasse beim Öffnen auslöst, ansonsten 0

.extern=1 Handbetrieb (0) oder gemischter Automatikbetrieb.

.item Beginn einer weiteren Subsektion.

Bereich mit zu schaltendem Artikeln oder Fahrstrassen. Pro Artikel ein Abschnitt.

- - - 1. 2\. Ebene Sektion ".item" Beschreibung:

Listet die zu schaltenden Elemente der Fahrstrasse auf.

Felder:

..fsverweis= -1 Verweis auf andere Fahrstrasse. Entweder Nummer der Fahrstrasse oder -1 für Magnetartikel. Bei Verweis auf weitere Fahrstrasse ist ..magnetartikel und

..stellung auf 0 zu setzen.

..magnetartikel=23 Magnetartikel, Nummer aus Keyboard, 0 bei Verweis auf weitere Fahrstrasse

..stellung=1 Zu schaltende Stellung, je nach Artikel zwischen 1 und 4 oder 0 bei Verweis auf weitere Fahrstrasse.

## Konfigurationsdatei "gleisbild.cs2"

Enthält die Konfiguration des Gleisbildstellpultes Grundformat:

```
[gleisbild]
version
.major=0
.minor=6 groesse
.width=20
.height=15 zuletztBenutzt
.name=Haupt-alt seite
.id=0
.name=Haupt-alt seite
.id=1
.name=Hauptbahnhof element
.id=0x301
.typ=s88kontakt
.drehung=0
.artikel=2
.text=
```

- - 1. Sektion "version" Beschreibung

Entält die Versionsnummer der Konfigurationsdatei. Wird verwendet um die Rückwärtskompatibilität herzustellen. Diese Sektion darf nur einmal vorhanden sein.

Felder:

.major={Wert}

.minor={Wert}

Aktuelle Werte sind .major=0 und .minor=6

- - 1. Sektion "groesse" Beschreibung

Anzahl der Elemente pro Seite. Diese Sektion darf nur einmal vorhanden sein.

Felder:

.width=20 Feste Einstellung

.height=15 Feste Einstellung

- - 1. Sektion "zuletztBenutzt" Beschreibung

Definition der zuletzt benutzten Gleisbildseite Felder:

.seite=0 Name der Seite

- - 1. Sektion "seite" Beschreibung

Definition einer Stellpultseite. Die Definitionen der Stellpultseiten müssen hintereinander folgen. Pro Seite eine Sektion.

Felder:

.id=0 Nummer der Seite

.name=Seite0 Namen der Seite

- - 1. Sektion "element" Beschreibung

Festlegung eines Elementes einer Stellpultseite. Pro Element eine Definition.

Felder:

.id=0x010301 Hexadezimal ssxxyy: ss Seite, xx x-Koord., yy y-Koord (also Seite=1, x=3, y=1)

.typ=gerade Typ des Elements. Mögliche Werte:

leer gerade kreuzung

unterfuehrung prellbock bogen doppelbogen tunnel linksweiche rechtsweiche dreiwegweiche yweiche dkweiche dkweiche_2 signal s88kontakt s88bogen

pfeil (Verweis auf andere Gleisbildseite) fahrstrasse

text signal_hp02 signal_hp012 signal_hp01s

signal_p_hp012s signal_f_hp012s signal_p_hp012 signal_f_hp01 signal_f_hp02 signal_f_hp012 signal_sh01 k84_einfach k84_doppelt entkuppler entkuppler_1 std_rot std_gruen std_rot_gruen_0 std_rot_gruen_1

schiebebuehne_0 schiebebuehne_1 schiebebuehne_2 schiebebuehne_3 drehscheibe_alt_0 drehscheibe_alt_1

drehscheibe_alt_2 drehscheibe_alt_3 drehscheibe_dig_0

.. bis drehscheibe_dig_31

.drehung=1 Anzeigerichtung, im Uhrzeigersinn von 0 bis 3.

.artikel=-1 Adresse des Magnetartikels im Keyboard, -1 für keine Äquivalenz

.text= Beschriftung der Elementes

## Konfigurationsstream "lokinfo"

Diese und die folgenden Informationen liegen nicht oder nicht dauerhaft auf der CS2 in Dateiform vor, sie werden temporär über das Streaming-Protokoll an die anfordernden Stationen gesandt.

"lokinfo" enthält einen – für die anfordernde Station (z.B.) MS2 ausreichenden – Teilausschnitt aus der Lokokonfigurationsdatei der CS2.

Grundformat:

```
[lokomotive] lok
.uid=0x4005
.name=M4
.adresse=0x9
.typ=mfx
.mfxuid=0xff001234
.av=64
.bv=48
.volume=64
.vmax=255
.vmin=12
.fkt
..nr=0
..typ=32
.fkt
..nr=1
..typ=12
.fkt
..nr=2
..typ=38
.fkt
..nr=3
..typ=43
.fkt
..nr=4
..typ=91
.fkt
..nr=5
..typ=22
.fkt
..nr=6
..typ=39
.fkt
..nr=7
..typ=31
.fkt
..nr=8
..typ=19
.fkt
..nr=9
..typ=133
.fkt
..nr=10
..typ=27
.fkt
..nr=11
..typ=29
.fkt
..nr=12
..typ=89
.fkt
..nr=13
..typ=16
.fkt
..nr=14
..typ=14
.fkt
..nr=15
..typ=4
.mfxAdr
..target=2
..name=3
..addr=136
..xcel=78
..speedtable=79
..volume=117
..numfunc=16
..func=21
```

Als einzigen Zusatz enthält "lokinfo" für mfx-Loks in der Untersektion .mfxAdr die Adress-Information der benötigten mfx-Konfig-Einträge.

## Konfigurationsstream "loknamen"

"loknamen" enthält die angeforderte Anzahl von Loks aus der Lokliste der CS2 zusammen mit der Information, wie viele Loks insgesamt auf der CS2 verfügbar sind. Die MS2 z.B. fordert jeweils 2 Einträge an, die sie auf ihrem Display anzeigt; beim Hoch- oder Herunterscrollen werden jeweils die vorangehenden oder nachfolgenden Loknamen angefordert.

Grundformat:

```
[lokomotive] lok
.nr=3
.name=MaK 1206 ACTS
lok
.nr=4
.name=M4-RIoS numloks
.wert=8
```

## Konfigurationsstream "maginfo"

"maginfo" enthält den angeforderten Ausschnitt der Magnetartikel-Konfigurationsdatei. Grundformat:

```
[magnetartikel]
artikel
.id=3
.name=1.3
.typ=rechtsweiche
.schaltzeit=200
.dectyp=mm2 artikel
.id=4
.name=1.4
.typ=entkupplungsgleis
.schaltzeit=200
.dectyp=mm2
```

## Konfigurationsstream "lokdb"

lokdb enthält die Lokdatenbank als Binär-Stream

## Konfigurationsstream "ldbver"

ldbver enthält die Versionsinformation der auf der CS2 verfügbaren Lok-Datenbank Grundformat:

```
.version=9
.monat=2
.jahr=10
.anzahl=1078
```