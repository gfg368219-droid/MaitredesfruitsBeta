# Éveil des Royaumes

Un jeu de rôle médiéval 3D lumineux pour enfants, où chaque geste transforme un village et chaque aventurier peut éveiller un pouvoir.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/eveil-des-royaumes/src/App.tsx` — boucle de jeu locale, progression, pouvoirs, actions et scène interactive.
- `artifacts/eveil-des-royaumes/src/index.css` — palette, profondeur isométrique, animations et responsive.
- `artifacts/eveil-des-royaumes/vite.config.ts` — configuration Vite de l’application web.

## Architecture decisions

- La première version est locale et sans backend pour rendre la boucle de jeu jouable immédiatement.
- La scène 3D est construite en CSS/HTML pour rester légère, lumineuse et compatible avec les appareils modestes.
- Les actions sont pensées comme des jouets : changer d’outil, cliquer un élément, accueillir un personnage et construire font progresser le même chapitre.

## Product

Le joueur dirige un jeune royaume, récolte des ressources, construit un toit pour les nouveaux arrivants et choisit entre plusieurs voies : Maître de guilde, Nécromancien, Dieu Solaire et Tempest. Les niveaux ajoutent progressivement des objectifs et des contraintes.

## User preferences

- Le jeu doit être lumineux, aventureux, médiéval et inspiré des anime, avec une grande liberté d’action.

## Gotchas

- Le gameplay actuel est volontairement en état local : recharger la page remet la partie à zéro.
- Les touches `1` à `4` changent d’outil pendant que le focus n’est pas dans un champ de texte.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
