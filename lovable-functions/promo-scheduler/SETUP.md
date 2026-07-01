# Promotions programmées — mise en place (côté Lovable / Supabase)

Une seule fois. Ensuite tout se fait depuis l'app.

## 1. Créer la table
Dans Lovable → base de données → **SQL**, colle et exécute le contenu de
`scheduled_promos.sql`.

## 2. Créer la fonction
Crée une fonction Edge nommée **`promo-scheduler`** avec le code de
`promo-scheduler/index.ts`.

## 3. Secrets nécessaires
- `SHOPIFY_MANAGE_STOCK_TOKEN` : ton jeton Admin permanent (déjà créé).
- `CRON_SECRET` : invente une chaîne au hasard (ex. `cash16-cron-9f3k2x`). Elle protège le déclencheur automatique.

## 4. Programmer le cron (toutes les 5 minutes)
Il faut appeler `promo-scheduler` avec `{ "action": "tick" }` et l'en-tête
`x-cron-secret: <CRON_SECRET>`, toutes les 5 minutes.

Dans Supabase → SQL, avec pg_cron + pg_net :

```sql
select cron.schedule(
  'promo-scheduler-tick',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://<TON-PROJET>.supabase.co/functions/v1/promo-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body    := jsonb_build_object('action', 'tick')
  );
  $$
);
```

Remplace `<TON-PROJET>` par l'URL de ton projet et `<CRON_SECRET>` par ta valeur.

> Astuce : demande à Lovable « planifie un cron toutes les 5 minutes qui appelle
> ma fonction promo-scheduler avec action tick et l'en-tête x-cron-secret ».

## Fonctionnement
- Depuis l'app (Gérer les stocks → un produit → « Programmer une promo »), tu
  choisis un % et des dates de début/fin.
- Au début, le cron applique la promo à Shopify (prix barré + balise `promo`) →
  visible sur l'app **et** le site.
- À la fin, il la retire automatiquement (prix normal restauré).
