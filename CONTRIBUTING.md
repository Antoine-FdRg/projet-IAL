# Guide de Contribution

Merci de votre intérêt pour contribuer au projet IAL ! Ce document décrit les pratiques et conventions à suivre pour contribuer efficacement.

## Table des matières

- [Avant de commencer](#avant-de-commencer)
- [Workflow de développement](#workflow-de-développement)
- [Standards de code](#standards-de-code)
- [Tests](#tests)
- [Message de commit](#message-de-commit)
- [Pull Requests](#pull-requests)

## Avant de commencer

### Prérequis

- Node.js 18+ et npm
- Docker et Docker Compose
- Git Bash ou WSL (pour Windows)

### Configuration initiale

1. Cloner le dépôt :
```bash
git clone https://github.com/Antoine-FdRg/projet-IAL.git
cd projet-IAL
```

2. Construire les images Docker :
```bash
./build-all.sh
```

3. Démarrer tous les services: pour s'assurer de leur bon fonctionnement initial
```bash
./start-all.sh
```

## Workflow de développement

### Branches

- `main` : branche de production (stable)
- `dev` : branche de développement (défaut pour les PRs)
- `feat/<numero-issue>-<description>` : nouvelles fonctionnalités
- `fix/<description>` : corrections de bugs

### Processus de contribution

1. **Créer une branche** depuis `dev` :
```bash
git checkout dev
git pull origin dev
git checkout -b feat/XX-ma-fonctionnalite
```

2. **Développer** en suivant les standards du projet

3. **Vérifier la qualité du code** :
```bash
export SONAR_TOKEN="<token_sonar>"
cd box/cleaner && npx sonar-scan
```

4. **Commit** avec un message conventionnel (voir section dédiée)

5. **Push** et créer une Pull Request vers `dev`

## Standards de code

### TypeScript

- Utiliser TypeScript strict mode
- Préférer `const` à `let`, éviter `var`
- Typer explicitement les paramètres de fonction et valeurs de retour
- Utiliser les interfaces pour les structures de données complexes

### Gestion des erreurs

- Logger les erreurs avec des messages descriptifs
- Ne pas exposer d'informations sensibles dans les logs

### Variables d'environnement

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

## Message de commit

Nous utilisons les conventions Gitmoji pour les commits. L'extension Gitmoji
de Seaton Jiang est recommandée pour faciliter l'insertion des emojis.

### Exemples

```bash
git commit -m "✨ add pulse validation in outlier filter. #11"
git commit -m "🐛 handle NATS reconnection timeout"
git commit -m "📝 update cleaner README with new env vars"
git commit -m "✅ add unit tests for normalizer conversions. #13"
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

3. Remplir la description de la PR avec :
   - Description des changements
   - Numéro d'issue associé
   - Screenshots si pertinent (UI)
   - Checklist des tests effectués

### Critères de validation

Avant de demander une revue, vérifier que :

- [ ] Les tests passent (`./run-all-tests.sh`)
- [ ] Le build fonctionne (`./build-all.sh`)
- [ ] Tous les services démarrent correctement (`./start-all.sh`)
- [ ] SonarCloud ne rapporte pas de bugs critiques
- [ ] La documentation est à jour (README si nécessaire)

### Revue de code

- Au moins un reviewer doit approuver la PR
- Répondre aux commentaires de manière constructive
- Appliquer les suggestions ou justifier pourquoi elles ne sont pas pertinentes

## Questions et support

- Créer une issue sur GitHub pour les bugs ou demandes de fonctionnalités
- Utiliser le Discord du projet pour les discussions
- Consulter les README individuels des services pour les détails spécifiques

## Licence

En contribuant, vous acceptez que vos contributions soient sous la même licence que le projet (ISC).
