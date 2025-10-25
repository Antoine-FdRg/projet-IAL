# Broker NATS
NATS est un middleware orienté messages léger et performant. Il est utilisé dans cette architecture pour faire transiter les messages entre les différents services la pipeline d'ingestion.

## Configuration
Le broker NATS est configuré grâce à l'application NodeJS qui met en place la persistance des messages via JetStream.

### Application NodeJS
L'application est chargé d'initialiser les streams NATS. Un stream permet de persister les messages échangés sur un sujet donné. [Voir la doc officielle](https://docs.nats.io/nats-concepts/jetstream/streams)
