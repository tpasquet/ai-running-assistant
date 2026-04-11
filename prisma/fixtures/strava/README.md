# Strava Fixtures

Colle ici les fichiers `activities_part_*.json` issus de ton export Strava bulk.

```
prisma/fixtures/strava/
  activities_part_1.json
  activities_part_2.json
  ...
```

Ces fichiers ne sont **pas committés** (voir `.gitignore`).

## Script d'import

> ⚠️ Le script `db:setup-dev` sera disponible après le merge de `feature/auth`
> (nécessite le champ `email` sur le modèle `User`).

En attendant, `db:import-strava` est disponible si tu as déjà un `userId` en base :

```bash
npm run db:import-strava -- --userId <id> --path prisma/fixtures/strava
```
