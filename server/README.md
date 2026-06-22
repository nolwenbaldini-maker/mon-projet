# Mini-serveur admin €ASH

Petit serveur qui permet à l'app de **publier des produits sur Shopify** en
toute sécurité. Le jeton Admin (tout-puissant) reste **uniquement ici**, jamais
dans l'app.

## Ce qu'il fait

`POST /admin/products` (protégé par un mot de passe admin) crée un produit
Shopify avec : titre, description, **prix**, **stock** (créé automatiquement),
**photos** et, au mieux, une **rubrique**.

## 1. Obtenir un jeton Admin API Shopify

Il te faut un **jeton d'accès Admin API** avec les autorisations
`write_products` et `write_inventory`. Tu l'obtiens via une application installée
sur ta boutique (dev dashboard Shopify), section *Admin API / jetons d'accès*.

⚠️ Ce jeton (souvent préfixé `shpat_`) est **secret**. Ne le mets que dans les
variables d'environnement du serveur, jamais dans l'app ni dans Git.

## 2. Déployer gratuitement sur Render

1. Va sur **https://render.com** → crée un compte (gratuit).
2. **New + → Blueprint** → connecte ce dépôt GitHub → Render lit `render.yaml`.
3. Renseigne les 3 variables (onglet *Environment*) :
   - `SHOPIFY_STORE_DOMAIN` = `happycash16.myshopify.com`
   - `SHOPIFY_ADMIN_TOKEN` = ton jeton `shpat_...`
   - `ADMIN_SECRET` = un mot de passe solide (tu le saisiras dans l'app)
4. Déploie. Render te donne une URL du type
   `https://cash16-admin-server.onrender.com`.

## 3. Brancher l'app

Dans le fichier `.env` de l'app (à la racine du projet), ajoute :

```
EXPO_PUBLIC_ADMIN_API_URL=https://cash16-admin-server.onrender.com
```

Puis reconstruis l'app. Dans **Mon compte → Espace admin**, saisis le mot de
passe `ADMIN_SECRET` et tu peux publier des produits.

## Lancer en local (pour tester)

```bash
cd server
cp .env.example .env   # renseigne tes valeurs
npm install
npm start              # écoute sur http://localhost:3000
```

> Note : ce serveur utilise l'API Admin REST de Shopify (simple et efficace pour
> ce besoin). Elle reste disponible ; on pourra migrer vers GraphQL plus tard.
