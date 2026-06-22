# €ASH Angoulême — Application mobile

Application **Android (et iOS)** de la boutique [cash16.fr](https://cash16.fr) :
achat/vente de cartes à collectionner, DVD/Blu-Ray, consoles et jeux vidéo.

C'est une **vraie application e-commerce native** (catalogue, fiches produits,
panier, commande) construite avec **Expo / React Native** et connectée
directement à ta boutique **Shopify**.

## ✨ Comment ça marche

L'app n'est pas une simple copie du site : elle lit les **mêmes données Shopify**
que cash16.fr via la *Storefront API*. Concrètement :

- Les produits, prix et photos affichés sont ceux de ta boutique Shopify.
- Une commande passée dans l'app est une commande Shopify → **le stock baisse
  automatiquement** partout (app **et** site web). Tout est synchronisé.
- Le paiement réutilise le **checkout sécurisé Shopify** (CB, PayPal… déjà
  configurés chez toi).

## 🔌 Connecter ta boutique Shopify (à faire une fois)

1. Va sur ton **admin Shopify** → **Paramètres** → **Applications et canaux de
   vente** → **Développer des applications** → **Créer une application**.
2. Onglet **Configuration** → active **Storefront API** et coche au minimum les
   accès en lecture aux **produits**, **collections**, et la gestion du
   **panier (cart)**.
3. **Installe** l'application, puis dans l'onglet **Identifiants de l'API**,
   copie le **jeton d'accès Storefront API**.
4. Ouvre le fichier [`src/config/shopify.ts`](src/config/shopify.ts) et remplis :
   - `SHOPIFY_STORE_DOMAIN` → ton domaine technique, ex. `cash16.myshopify.com`
     (et **pas** `cash16.fr`).
   - `SHOPIFY_STOREFRONT_TOKEN` → le jeton copié à l'étape 3.

Tant que ce n'est pas rempli, l'app affiche un écran d'aide au lieu du catalogue.

## ▶️ Lancer l'app en développement

```bash
npm install        # installe les dépendances (une fois)
npm start          # démarre Expo
```

Installe l'application **Expo Go** sur ton téléphone Android, puis scanne le
QR code affiché dans le terminal pour voir l'app en direct.

## 📦 Générer un fichier APK (pour installer sur un téléphone)

On utilise **EAS Build** (le service de build d'Expo, gratuit pour commencer) :

```bash
npm install -g eas-cli      # installe l'outil
eas login                   # connexion (crée un compte Expo gratuit si besoin)
eas build -p android --profile preview   # génère un APK
```

À la fin, Expo fournit un lien pour télécharger le fichier `.apk` à installer
sur ton téléphone. Pour publier ensuite sur le **Google Play Store**, il te
faudra un compte **Google Play Console** (frais unique d'environ 25 $).

## 🗂️ Structure du projet

```
App.tsx                  Point d'entrée : navigation + panier
src/
  config/shopify.ts      ⚙️ Tes identifiants Shopify (à remplir)
  shopify/               Connexion + requêtes vers la Storefront API
  context/CartContext    État du panier partagé dans toute l'app
  screens/               Accueil, Fiche produit, Panier
  components/            Carte produit, bouton panier
  theme.ts               Couleurs et formatage des prix
```

## 🚧 Pistes d'évolution

- Recherche de produits
- Compte client / suivi des commandes dans l'app
- Notifications push (« nouvel arrivage cette semaine »)
- Mise en avant des nouveautés sur l'accueil

## Licence

MIT
