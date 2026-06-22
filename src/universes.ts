/**
 * Regroupe les rubriques (collections Shopify) en grands "univers",
 * comme sur cash16.fr. L'ordre des univers et des rubriques est respecté.
 *
 * Les handles correspondent aux collections de la boutique. Si une rubrique
 * est ajoutée sur Shopify, ajoute simplement son handle ici pour la classer.
 */

export interface Universe {
  key: string;
  label: string;
  emoji: string;
  /** Handles des collections Shopify de cet univers, dans l'ordre d'affichage. */
  handles: string[];
}

export const UNIVERSES: Universe[] = [
  {
    key: "cartes",
    label: "Cartes à collectionner",
    emoji: "🃏",
    handles: [
      "cartes-pokemon-francaises",
      "cartes-pokemon-japonaises",
      "display-pokemon-fr",
      "displays-pokemon-japonaises",
      "produits-scelles-pokemon",
      "cartes-one-piece-fr",
      "carte-one-piece-us",
      "displays-one-piece",
    ],
  },
  {
    key: "culturels",
    label: "Produits Culturels",
    emoji: "🎬",
    handles: [
      "dvd-action",
      "dvd-comedie",
      "dvd-science-fiction",
      "dvd-fantastique",
      "dvd-thriller",
      "dvd-marvel-dc-comics",
      "dvd-manga",
      "blu-ray",
      "mangas",
    ],
  },
  {
    key: "consoles",
    label: "Consoles de Jeux",
    emoji: "🎮",
    handles: [
      "console-switch",
      "console-ps5",
      "console-ps4",
      "console-ps3",
      "console-xbox-series-s-x",
      "console-xbox-one",
      "console-xbox-360",
      "console-wii",
      "console-ds",
      "consoles-vintages",
    ],
  },
  {
    key: "jeux",
    label: "Jeux Vidéo",
    emoji: "👾",
    handles: [
      "jeux-switch",
      "jeux-ps5",
      "jeux-ps4",
      "jeux-ps3",
      "jeux-xbox-one",
      "jeux-xbox-360",
      "jeux-3ds",
      "jeux-ds",
      "jeux-wii",
      "jeux-retro",
    ],
  },
  {
    key: "hightech",
    label: "High-Tech & Accessoires",
    emoji: "🎧",
    handles: [
      "telephones",
      "pc-portables",
      "montres-connectees",
      "casques",
      "claviers",
      "souris",
      "accessoires",
    ],
  },
];
