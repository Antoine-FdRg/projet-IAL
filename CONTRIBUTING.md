# Guide de Contribution

Merci de votre intérêt pour contribuer au projet IAL ! Ce document décrit les pratiques et conventions à suivre pour contribuer efficacement.

## Table des matières

- [Avant de commencer](#avant-de-commencer)
- [Workflow de développement](#workflow-de-développement)
- [Standards de code](#standards-de-code)
- [Tests](#tests)
- [Commits et messages](#commits-et-messages)
- [Pull Requests](#pull-requests)
- [Architecture et conception](#architecture-et-conception)

## Avant de commencer

### Prérequis

- Node.js 18+ et npm
- Docker et Docker Compose
- Git Bash ou WSL (pour Windows)
- Accès au Discord du projet (pour le token SonarCloud)

### Configuration initiale

1. Cloner le dépôt :
```bash
git clone https://github.com/Antoine-FdRg/projet-IAL.git
cd projet-IAL
```

2. Installer les dépendances pour chaque service :
```bash
cd box/cleaner && npm install
cd ../normalizer && npm install
cd ../outlier-filter && npm install
# etc.
```

3. Construire les images Docker :
```bash
./build-all.sh
```

4. Démarrer la pipeline pour tester :
```bash
./start-pipeline.sh
```

## Workflow de développement

### Branches

- `main` : branche de production (stable)
- `dev` : branche de développement (défaut pour les PRs)
- `feat/<numero-issue>-<description>` : nouvelles fonctionnalités
- `fix/<description>` : corrections de bugs
- `refactor/<description>` : refactoring

### Processus de contribution

1. **Créer une branche** depuis `dev` :
```bash
git checkout dev
git pull origin dev
git checkout -b feat/XX-ma-fonctionnalite
```

2. **Développer** en suivant les standards du projet

3. **Tester** localement :
```bash
# Tests unitaires pour un service
cd box/cleaner && npm test

# Tests de tous les services
./run-all-tests.sh

# Lancer la pipeline complète
./start-pipeline.sh
```

4. **Vérifier la qualité du code** :
```bash
export SONAR_TOKEN="<token_du_discord>"
cd box/cleaner && npx sonar-scan
```

5. **Commit** avec un message conventionnel (voir section dédiée)

6. **Push** et créer une Pull Request vers `dev`

## Standards de code

### TypeScript

- Utiliser TypeScript strict mode
- Préférer `const` à `let`, éviter `var`
- Typer explicitement les paramètres de fonction et valeurs de retour
- Utiliser les interfaces pour les structures de données complexes

### Structure des services

Chaque service de la pipeline doit suivre cette structure :
```
service-name/
├── src/
│   └── main.ts           # Point d'entrée
├── tests/                # Tests Jest
├── configuration/
│   └── cert/             # Certificats TLS (non commités)
├── .env                  # Variables d'environnement (non commité)
├── .babelrc             # Config Babel (si tests Jest)
├── jest.config.ts       # Config Jest (si applicable)
├── tsconfig.json        # Config TypeScript
├── package.json
├── Dockerfile
├── docker-compose.yml
├── build.sh
├── sonar-project.properties
└── README.md
```

### Gestion des erreurs

- Logger les erreurs avec des messages descriptifs
- Ne pas exposer d'informations sensibles dans les logs
- Gérer la reconnexion NATS en cas de perte de connexion

### Variables d'environnement

- Ne jamais commiter de fichiers `.env`
- Documenter toutes les variables nécessaires dans le README du service
- Utiliser des noms explicites en UPPER_SNAKE_CASE

## Tests

### Écrire des tests

- Chaque service de la pipeline doit avoir des tests unitaires
- Couvrir au minimum les cas nominaux et les cas d'erreur principaux
- Utiliser Jest comme framework de test

### Structure des tests

```typescript
describe('ServiceName', () => {
  describe('functionName', () => {
    it('should handle valid input correctly', () => {
      // Arrange
      const input = { ... };

      // Act
      const result = functionName(input);

      // Assert
      expect(result).toEqual(expected);
    });

    it('should reject invalid input', () => {
      const invalidInput = { ... };
      expect(() => functionName(invalidInput)).toThrow();
    });
  });
});
```

### Exécution des tests

```bash
# Un service spécifique
cd box/cleaner && npm test

# Tous les services en parallèle
./run-all-tests.sh

# Mode watch pendant le développement
cd box/cleaner && npm run test:watch

# Avec couverture
cd box/cleaner && npm run test:coverage
```

## Commits et messages

### Format des commits

Nous utilisons les conventions Gitmoji pour les commits :

- 🎉 `:tada:` - Premier commit / début de projet
- ✨ `:sparkles:` - Nouvelle fonctionnalité
- 🐛 `:bug:` - Correction de bug
- 🔥 `:fire:` - Suppression de code ou fichiers
- 📝 `:memo:` - Documentation
- ✅ `:white_check_mark:` - Ajout/mise à jour de tests
- ♻️ `:recycle:` - Refactoring
- 🏗️ `:building_construction:` - Changements d'architecture
- 👷 `:construction_worker:` - CI/CD
- 🔧 `:wrench:` - Fichiers de configuration
- 🚑 `:ambulance:` - Hotfix critique

### Exemples

```bash
git commit -m "✨ feat: add pulse validation in outlier filter. #11"
git commit -m "🐛 fix: handle NATS reconnection timeout"
git commit -m "📝 docs: update cleaner README with new env vars"
git commit -m "✅ test: add unit tests for normalizer conversions. #13"
```

### Bonnes pratiques

- Référencer le numéro d'issue avec `#XX` quand applicable
- Utiliser l'anglais ou le français de manière cohérente (actuellement le français est utilisé)
- Messages concis mais descriptifs
- Un commit = une modification logique

## Pull Requests

### Créer une PR

1. Pousser votre branche :
```bash
git push origin feat/XX-ma-fonctionnalite
```

2. Créer la PR sur GitHub vers la branche `dev`

3. Remplir le template (si disponible) avec :
   - Description des changements
   - Numéro d'issue associé
   - Screenshots si pertinent (UI)
   - Checklist des tests effectués

### Critères de validation

Avant de demander une revue, vérifier que :

- [ ] Les tests passent (`./run-all-tests.sh`)
- [ ] Le build fonctionne (`./build-all.sh`)
- [ ] La pipeline démarre correctement (`./start-pipeline.sh`)
- [ ] SonarCloud ne rapporte pas de bugs critiques
- [ ] La documentation est à jour (README si nécessaire)
- [ ] Pas de fichiers sensibles commités (`.env`, certificats, etc.)

### Revue de code

- Au moins un reviewer doit approuver la PR
- Répondre aux commentaires de manière constructive
- Appliquer les suggestions ou justifier pourquoi elles ne sont pas pertinentes

## Architecture et conception

### Principes de conception

1. **Services stateless** : Chaque service de la pipeline ne maintient pas d'état entre les messages
2. **Idempotence** : Un message peut être retraité sans effets secondaires
3. **Single Responsibility** : Chaque service a une seule responsabilité bien définie
4. **Message-driven** : Communication uniquement via NATS queues

### Ajouter un nouveau service à la pipeline

1. Créer le dossier dans `box/`
2. Copier la structure d'un service existant (ex: `cleaner`)
3. Implémenter la logique dans `src/main.ts`
4. Configurer les queues NATS dans `.env` et `.env.queues`
5. Ajouter les tests dans `tests/`
6. Créer le `README.md` avec :
   - Configuration requise
   - Format des messages entrants/sortants
   - Logique métier spécifique
7. Ajouter le service à `build-all.sh`
8. Ajouter le service à `run-all-tests.sh`
9. Ajouter le service à `start-pipeline.sh` et `stop-all.sh`

### Format des messages NATS

Respecter strictement le format suivant :
```typescript
interface MeasurementMessage {
  boxId: string;
  dataList: Array<{
    type: string;      // "weight" | "temperature" | "pulse" | "steps"
    value: number;
    unit: string;
    timestamp: string; // ISO 8601
  }>;
}
```

### Sécurité

- **TLS obligatoire** pour toutes les connexions NATS
- Certificats CA dans `configuration/cert/ca.pem` (non commités)
- Pas de credentials en dur dans le code
- Valider tous les messages entrants (type, format, plausibilité)

## Questions et support

- Créer une issue sur GitHub pour les bugs ou demandes de fonctionnalités
- Utiliser le Discord du projet pour les discussions
- Consulter les README individuels des services pour les détails spécifiques

## Licence

En contribuant, vous acceptez que vos contributions soient sous la même licence que le projet (ISC).
