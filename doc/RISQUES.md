# Analyse des risques
## Matrice des risques
La matrice des risques suivante a été utilisée pour évaluer et classer les risques associés au projet.
![](./images/matrice.png)

## Bowtie des risques majeurs
L'ensembl des schémas Bowtie des risques majeurs identifiés dans le projet est présenté [sur Canva](https://www.canva.com/design/DAG2OV4VHIQ/yKL4liR4sTiaAAw88MvC-w/edit?ui=eyJBIjp7fX0).


## Sécurité

### Authentification Save Service

Le save-service utilise des tokens Bearer pour authentifier les boitiers :

- Tokens stockés en SHA-256 dans la table `boxes`
- Header requis : `Authorization: Bearer <token>`
- Tokens de test : `box1-secret-token`, `box2-secret-token`

#### Exemple de génération de certificats

- Créer une clé privée CA

```shell
openssl genrsa -out ca.key 4096
```

- Créer un certificat CA auto-signé

```shell
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.pem -subj "/CN=MyNatsCA"
```

- Créer une clé serveur

```shell
openssl genrsa -out server.key 2048
```

- CSR (demande de signature) selon le hostname du broker

```shell
openssl req -new -key server.key -out server.csr -subj "/CN=nats\-broker"
```

- Signer le certificat serveur avec la CA

```shell
openssl x509 -req -in server.csr -CA ca.pem -CAkey ca.key -CAcreateserial -out server.crt -days 365 -sha256
```

Le serveur requiert `server.crt` et `server.key` pour démarrer en TLS. Le client requiert `ca.pem` pour vérifier l'identité du broker lorsqu'il s'y connecte
