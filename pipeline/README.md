# projet-IAL

## Pipeline

### Architecture de la pipeline

```mermaid
graph
    Device["Montre"]
    subgraph Boitier["IoT Gateway (Station)"]
        subgraph softb["Software"]
        ble["Serveur BLE<br/>réception des message"]
    Cleaner["Cleaner<br/>(supprimer/corriger données invalides)"]
    Outlier["Outlier Filter<br/>(valeurs aberrantes)"]
    Normalizer["Normalizer<br/>(unités/format cohérents)"]
        boxDB[("Buffer BDD")]
    Uploader["⟳ Uploader<br/>(compression, moyennage, envoi)"]
    end
    majs[Software Updater]
    end
subgraph Cloud["Cloud"]
        Save["Save Service<br/>(Sauvegarde en base de données)"]
        DB[("Measurement DB")]
        repo[[Software Registry]]
end
Device -.->|"BLE"|ble
ble-->|"Broker message"|Cleaner
Cleaner -->|"Broker message"| Normalizer
Normalizer -->|"Broker message"| Outlier
Outlier -.-> boxDB
boxDB <-.-> Uploader
Uploader-.->|"HTTPS/REST"| Save
Save -.-> DB

majs<-.->|"HTTPS/REST"|repo

```

[En savoir plus](https://www.notion.so/Diagramme-composants-Data-Pipeline-280b70b82f6b80f48968cb4c271ec0b5)

### Données échangées

#### Boitier (box) -> Cleaner

Queue : MEASUREMENT.to_clean

```json
{
    "boxId": string,
    "dataList": [
        {
            "type" : string
            "value" : number,
            "unit" : string,
            "timestamp": string
        },
        ...
    ]
}
```

#### Cleaner -> Outlier filter

Queue : MEASUREMENT.to_outlierfilter

```json
{
    "boxId": string,
    "dataList": [
        {
            "type" : string
            "value" : number,
            "unit" : string,
            "timestamp": string
        },
        ...
    ]
}
```

#### Outlier filter -> Normalizer

Queue : MEASUREMENT.to_normalize

```json
{
    "boxId": string,
    "dataList": [
        {
            "type" : string
            "value" : number,
            "unit" : string,
            "timestamp": string
        },
        ...
    ]
}
```

#### Normalizer -> Analyzer

Queue : MEASUREMENT.to_analyze

```json
{
    "boxId": string,
    "dataList": [
        {
            "type" : string
            "value" : number,
            "unit" : string,
            "timestamp": string
        },
        ...
    ]
}
```

#### Normalizer -> Splitter

Queue : MEASUREMENT.to_split

```json
{
    "boxId": string,
    "dataList": [
        {
            "type" : string
            "value" : number,
            "unit" : string,
            "timestamp": string
        },
        ...
    ]
}
```

#### Splitter -> Save Service

Queue : MEASUREMENT.to_save

```json
{
    "boxId" : string,
    "type" : string,
    "value" : number,
    "unit" : string,
    "timestamp": string,
}
```

#### Analyzer -> Save Service

Queue : MEASUREMENT.to_save

```json
{
    "boxId" : string,
    "type" : string,
    "fromTimestamp": string,
    "toTimestamp": string,
}
```
