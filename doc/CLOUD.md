# Services cloud
Nos Service cloud héberge le principal de logique métier.
## Analyse des risques
### 1. Perte privacy
Pour éviter la perte de privacité, toutes les communications entre la Station et le cloud sont chiffrées via HTTPS pour garantir la confidentialité des données transmises. De plus, l'ensemble des communications entre les services cloud sont également chiffrées pour éviter toute interception malveillante.
### 2. Réception de fausse donnée
Pour éviter la réception de fausses données, un token d'authentification est attendu par le Save Service pour chaque requête reçue de la Station. Ce token est vérifié avant de traiter la requête. Cela permet de s'assurer que les données proviennent bien d'une source authentique et n'ont pas été altérées en cours de route.

### 3. Prise d'otage des données
Pour éviter la prise d'otage des données, toutes les communications entre la Station et le Save Service et les communications entre les services cloud sont chiffrées via HTTPS pour garantir la confidentialité des données transmises. De plus, les réseaux internes des services cloud sont restreints à la communication entre 2 services uniquement, empêchant toute communication externe non autorisée.

## Fonctionnement général
### Réception d’un batch de mesure
Lorsque le Save Service reçoit un batch de mesures d'une Station, il vérifie d'abord le token d'authentification. Si le token est valide, le Save Service stocke les mesures dans la Measurement DB. Si le token est invalide, la requête est rejetée.

### Envoie de notification au médecin
Tous les jours, le Doctor Notif Service utilise le Analyse Service pour envoyer, ou non selon le résultat de l'analyse, une alerte qui sera ajoutée au tableau de bord du médecin.

### Envoie de notification au proche
Toutes les semaines, le Family Notif Service utilise le Analyse Service pour envoyer une notification récapitulative de l'état de santé au proche du patient.

### Consultation des dashboards
Le médecin  et l'infirmier peuvent consulter les dashboards via l'interface web. L'interface web communique avec les bases de données pour récupérer les informations à afficher : récapitulatives pour l'infirmier, potentiellement plus détaillées pour le médecin.

## Composants logiciels
L'ensemble des services cloud sont développés en Node.js c'est une technologie permettant de créer des applications web performantes et scalables. De plus, contrairement à Java, les services sont plus légers et la gestion des objets JSON est native, ce qui facilite la manipulation des données échangées entre les services.
### Save Service
Le Save Service est responsable de la réception et du stockage des mesures envoyées par les Stations. Il vérifie l'authenticité des requêtes via des tokens et interagit avec la Measurement DB pour stocker les données.
#### Contrats d'interface
- **POST /measurement-list/{stationId}**
  - **Authentification**
    
    Le header authorization doit contenir le bearer token de la station.
  - **Body**
  
    MeasurementListDTO
    ```json
    {
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
  - **Retours**
    - 200 → données enregistrées
    - 401 → Authentification impossible
    - 404 → boxId introuvable
### Analyse Service
L'Analyse Service est responsable de l'analyse des mesures stockées dans la Measurement DB.
#### Contrats d'interface
- **GET /analyse/{stationId}/family**
  - **Retours**
    - 200 → Analyse reussie
      - Body : FamilyAnayseResultDTO
      
        ```json
        {
          "state" : "great" | "okay" | "bad" | "terrible",
          "message" : string
        }
        ```
    - 404 → boxId introuvable

- **GET /analyse/{stationId}/doctor**
  - **Retours**
    - 200 → Analyse reussie
      - Body : DoctorAnayseResultDTO
      
        ```json
        {
          "severity" : CRITICAL | HIGH | MEDIUM | LOW
          "reason" : string | null
        }
        ```
    - 404 → boxId introuvable
### Doctor Notif Service
Le Doctor Notif Service est responsable de l'envoie des notifications au médecin en fonction des résultats de l'analyse des mesures réalisée par l'Analyse Service en utilisant le endpoint /analyse/{stationId}/doctor.
### Family Notif Service
Le Family Notif Service est responsable de l'envoie des notifications au proche en fonction des résultats de l'analyse des mesures réalisée par l'Analyse Service en utilisant le endpoint /analyse/{stationId}/family.
### Measurement DB
La Measurement DB est une base de données PostgreSQL avec  l'extension  TimescaleDB, optimisée pour le stockage et la gestion de séries temporelles.
Elle stocke les mesures de santé envoyées par les Stations, permettant ainsi une analyse efficace et rapide des données pour le suivi de la santé des patients.

En savoir plus sur la MeasurementDB : [+ info](./databases/measurement-db/README.md)

### User DB
La User DB est une base de données PostgreSQL qui stocke les informations des utilisateurs : patient, médecin, infirmier, proche, ainsi que les informations des Stations associées aux patients. Elle gère également les relations entre ces entités pour faciliter l'accès et la gestion des données utilisateur.

En savoir plus sur la User DB : [+ info](./databases/user-db/README.md)

### Interface web
L'interface web permet aux médecins et infirmiers de consulter les dashboards de suivi de santé des patients. Elle communique avec la User DB pour l'authentification et la récupération des informations utilisateur, ainsi qu'avec la Measurement DB pour afficher les données de santé pertinentes. Cette interface est développée en Next.js, ce framework React permet d'utiliser sa librairie d'authentification NextAuth.js pour gérer facilement l'authentification des utilisateurs. Enfin, Next.js supporte le déploiement serverless, diminuant les ressources nécessaires pour héberger l'interface web.

#### Nurse Dashboard
Le tableau de bord infirmier offre une vue d'ensemble des patients sous sa responsabilité, avec des indicateurs clés de santé et des alertes en cas de détection de problèmes potentiels. Il permet également de filtrer les patients par état de santé et de consulter les détails des mesures enregistrées.
#### Doctor Dashboard
Le tableau de bord médecin fournit des informations détaillées sur chaque patient, y compris les tendances des mesures de santé et les alertes nécessitant une attention médicale. Il permet également de visualiser l'historique des mesures et d'exporter les données pour un examen plus approfondi.
#### Dashboard API
L'API du tableau de bord gère les requêtes de l'interface web pour récupérer les données nécessaires à l'affichage des informations utilisateur et des mesures de santé. Elle interagit avec la User DB pour l'authentification et la gestion des utilisateurs, ainsi qu'avec la Measurement DB pour fournir les données de santé pertinentes.


