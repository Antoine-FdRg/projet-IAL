# Script de démo
## Prérequis
Avant de lancer le script `start-home.sh`, assurez-vous d'avoir lancé avec succès le script à la racine du projet `start-cloud.sh` pour déployer les services cloud nécessaires.

## Lancement du script
Pour exécuter le script de démo, utilisez la commande suivante dans votre terminal une fois dans le répertoire `demo` :
Pour lancer la première maison :
```bash
./start-home.sh 1
```

Pour lancer la deuxième maison :
```bash
./start-home.sh 2
```

## Fonctionnement du script
Le script `start-home.sh` déploie un projet Docker Compose de station et un de device en utilisant un .env différent pour chaque maison (1 ou 2). Chaque station et device communiquent avec les services cloud déployés précédemment.