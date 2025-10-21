# Outlier Filter
L'Outlier Filter est le troisième composant de la pipeline d'ingestion de données. Il écoute les messages sur la queue NATS `MEASUREMENT.to_outlierfilter` et filtre les valeurs aberrantes avant de les envoyer vers les queues `MEASUREMENT.to_split,MEASUREMENT.to_analyze`.

## Configuration
Le fichier `.env` permet de configurer les variables d'environnement suivantes :
- `NATS_SERVER` : L'URL du serveur NATS distant.
- `OUTLIER_FILTER_CONSUMER_QUEUE` : La queue NATS où les données à filtrer sont consommées.
- `OUTLIER_FILTER_PRODUCER_QUEUE` : Les queues NATS où les données filtrées sont publiées.

### Production
Pour le lancement en mode production, les variables d'environnement suivantes doivent être définies :
- `NATS_NKEY_SEED` : La seed NKey pour l'authentification au serveur NATS.
- `NATS_CA_FILE` : Le chemin vers le fichier de certificat CA pour la connexion TLS.

Le dossier `configuration/cert` doit inclure le certificat CA pour la connexion TLS au serveur NATS distant.

## Démarrage
### Dev
`start-pipeline.sh` démarre automatiquement l'Outlier Filter avec les autres composants de la pipeline.
### Production
`start-pipeline-prod.sh` démarre automatiquement l'Outlier Filter avec les autres composants de la pipeline de manière sécurisée avec TLS et authentification via NKey.

## Utilisation
### Schéma donnée entrant
Le message entrant a la structure suivante via la queue `MEASUREMENT.to_outlierfilter` :

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
Le message sortant a la structure suivante via les queues `MEASUREMENT.to_split,MEASUREMENT.to_analyze` :

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

### Filtrage des valeurs aberrantes
L'Outlier Filter effectue les filtrages suivants selon le type de mesure :
- **Poids** (`weight`) : Rejette les valeurs < 15 kg ou > 500 kg
- **Température** (`temperature`) : Rejette les valeurs > 60°C
- **Fréquence cardiaque** (`pulse`) : Rejette les valeurs > 250 bpm

Les mesures qui ne respectent pas ces critères sont filtrées et un avertissement est généré dans les logs.
