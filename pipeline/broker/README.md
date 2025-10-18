# Configuration du broker

## Sécurisation TLS
**Créer une clé privée CA**

openssl genrsa -out ca.key 4096

**Créer un certificat CA auto-signé**

openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.pem -subj "/CN=MyNatsCA"

**Créer une clé serveur**

openssl genrsa -out server.key 2048

**CSR (demande de signature)**

openssl req -new -key server.key -out server.csr -subj "/CN=nats"

**Signer le certificat serveur avec la CA**

openssl x509 -req -in server.csr -CA ca.pem -CAkey ca.key -CAcreateserial -out server.crt -days 365 -sha256

## Sécurisation par NKEYS
**Génerer un couple de NKey**

```
nk -gen user -pubout
```