# Normalizer
Le Normalizer est le deuxième composant de la pipeline d'ingestion de données. Il écoute les messages sur la queue NATS `MEASUREMENT.to_normalize` et normalise les unités de mesure avant de les envoyer à la queue `MEASUREMENT.to_save`.

## Configuration
Le fichier `.env` permet de configurer les variables d'environnement suivantes :
- `NATS_SERVER` : L'URL du serveur NATS distant.
- `NORMALIZER_CONSUMER_QUEUE` : La queue NATS où les données à normaliser sont consommées.
- `NORMALIZER_PRODUCER_QUEUE` : La queue NATS où les données normalisées sont publiées.


Le dossier `configuration/cert` doit inclure le certificat CA pour la connexion TLS au serveur NATS distant.

## Démarrage
`start-pipeline.sh` démarre automatiquement le Normalizer avec les autres composants de la pipeline.

## Utilisation
### Schéma donnée entrant
Le message entrant a la structure suivante via la queue `MEASUREMENT.to_normalize` :

```json
{
    "boxId": "string",
    "dataList": [
        {
            "type" : "string",
            "value" : "number",
            "unit" : "string",
            "timestamp": "string"
        },
        ...
    ]
}
```

### Schéma donnée sortant
Le message sortant a la structure suivante via la queue `MEASUREMENT.to_outlierfilter` :

```json
{
    "boxId": "string",
    "dataList": [
        {
            "type" : "string",
            "value" : "number",
            "unit" : "string",
            "timestamp": "string"
        },
        ...
    ]
}
```

### Normalisation des unités
Le Normalizer effectue les conversions d'unités suivantes :
- **Poids** : `lbs` → `kg` (multiplication par 0.45359237)
- **Température** : `°F` ou `f` → `°C` (formule: (°F - 32) × 5/9)
- **Fréquence cardiaque** : `bps` → `bpm` (multiplication par 60)

Les valeurs sont arrondies à 2 décimales pour assurer la cohérence des données.
