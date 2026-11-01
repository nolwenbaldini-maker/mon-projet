# Esport Boosters

Système d'ouverture de boosters de cartes à collectionner, version esport : on ouvre des boosters,
on révèle les cartes de joueurs (LoL, Valorant, CS2, Rocket League) et on complète sa collection.

## Lancer

```bash
npm start      # http://localhost:3000
npm test       # tests du moteur de tirage
```

Aucune dépendance : il faut juste Node 18 ou plus récent.

## Fonctionnalités

- **6 boosters** : Standard, Premium (dernière carte Star ou mieux, chances MVP/Légende x2) et un booster par jeu.
- **5 raretés** : Rookie (62 %), Pro (25 %), Star (9,5 %), MVP (3 %), Légende (0,5 %).
- **Garanties** : la dernière carte de chaque booster a une rareté minimale.
- **Système de pitié** : un MVP garanti tous les 10 boosters, une Légende tous les 40.
- **Doublons** convertis automatiquement en coins (selon la rareté).
- **Récompense quotidienne** de 300 coins, 500 coins au départ.
- **Animation d'ouverture** : le booster tremble, les cartes sont distribuées face cachée, on les retourne
  une par une ou toutes d'un coup, avec un flash pour les MVP et les Légendes.
- **Collection** filtrable par jeu ou rareté, avec les cartes manquantes en silhouette et le pourcentage de complétion.
- La progression est sauvegardée dans le `localStorage` du navigateur.

## Structure

| Fichier | Rôle |
|---|---|
| `public/js/booster.js` | Moteur de tirage (raretés, boosters, pitié, doublons, récompense quotidienne). Ne dépend pas du DOM. |
| `public/js/cards.js` | Catalogue des jeux et des cartes |
| `public/js/app.js` | Interface : boutique, ouverture, collection |
| `public/style.css` | Styles et animations |
| `server.js` | Serveur statique minimal |
| `test/booster.test.js` | Tests du moteur |

## Personnaliser

- **Cartes** : modifie le tableau `raw` dans `public/js/cards.js`. Les joueurs et les équipes actuels sont **fictifs**.
- **Taux et pitié** : change `RARITIES`, `PITY_EPIC` et `PITY_LEGENDARY` dans `public/js/booster.js`.
- **Boosters** : ajoute une entrée dans `BOOSTERS` (prix, taille, `minLastSlot`, `game`, `boost`).

## Licence

MIT
