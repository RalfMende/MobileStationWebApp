# Folgenummer der MS2

Die MS2 setzt als Folgenummer immer 0 bei der Abfrage der Loks der MS2. Damit müssen auch Nachrichten mit einem Hash Wert von 0 akzeptiert werden, wenn das Kommando "Config Data Stream" ist. Eine Abfrage, ob es sich um eine CS2 Nachricht handelt, kann damit wie folgt aussehen:
```
((Hash & MR_CS2_MASK_HASH_MAGIC) == MR_CS2_HASH_MAGIC) ||
(Hash == 0 && Command == MR_CS2_CMD_CFGDAT_STREAM);
```