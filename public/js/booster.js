// Moteur d'ouverture de boosters — logique pure, sans DOM.
// Utilisable dans le navigateur et dans Node (tests).

/** Raretés, de la plus faible à la plus forte. `weight` = poids de tirage de base. */
export const RARITIES = {
  commune: { label: 'Rookie', order: 0, weight: 62, dupValue: 5, color: '#9aa4b2' },
  peu_commune: { label: 'Pro', order: 1, weight: 25, dupValue: 15, color: '#3ddc84' },
  rare: { label: 'Star', order: 2, weight: 9.5, dupValue: 40, color: '#3d8bff' },
  epique: { label: 'MVP', order: 3, weight: 3, dupValue: 120, color: '#b65cff' },
  legendaire: { label: 'Légende', order: 4, weight: 0.5, dupValue: 400, color: '#ffb800' },
};

export const RARITY_KEYS = Object.keys(RARITIES).sort(
  (a, b) => RARITIES[a].order - RARITIES[b].order,
);

/** Nombre de boosters sans Légende après lequel une Légende est garantie. */
export const PITY_LEGENDARY = 40;
/** Nombre de boosters sans MVP (ou mieux) après lequel un MVP est garanti. */
export const PITY_EPIC = 10;

export const DAILY_REWARD = 300;
export const STARTING_COINS = 500;

/**
 * Types de boosters.
 * - size : nombre de cartes
 * - minLastSlot : rareté minimale garantie sur la dernière carte
 * - game : si défini, seules les cartes de ce jeu peuvent sortir
 * - boost : multiplicateurs appliqués aux poids de base
 */
export const BOOSTERS = [
  {
    id: 'standard',
    name: 'Booster Standard',
    description: '5 cartes, tous jeux confondus.',
    price: 100,
    size: 5,
    minLastSlot: 'peu_commune',
  },
  {
    id: 'premium',
    name: 'Booster Premium',
    description: '5 cartes, dernière carte Star ou mieux, chances MVP/Légende x2.',
    price: 300,
    size: 5,
    minLastSlot: 'rare',
    boost: { epique: 2, legendaire: 2 },
  },
  { id: 'lol', name: 'Booster League of Legends', description: '5 cartes LoL uniquement.', price: 150, size: 5, minLastSlot: 'peu_commune', game: 'lol' },
  { id: 'valorant', name: 'Booster Valorant', description: '5 cartes Valorant uniquement.', price: 150, size: 5, minLastSlot: 'peu_commune', game: 'valorant' },
  { id: 'cs2', name: 'Booster Counter-Strike 2', description: '5 cartes CS2 uniquement.', price: 150, size: 5, minLastSlot: 'peu_commune', game: 'cs2' },
  { id: 'rl', name: 'Booster Rocket League', description: '5 cartes Rocket League uniquement.', price: 150, size: 5, minLastSlot: 'peu_commune', game: 'rl' },
];

export function createState() {
  return {
    coins: STARTING_COINS,
    collection: {}, // cardId -> nombre d'exemplaires
    pity: { epic: 0, legendary: 0 }, // boosters ouverts depuis le dernier MVP+ / Légende
    lastDaily: null, // 'YYYY-MM-DD'
    opened: 0,
  };
}

/** Tire une rareté selon des poids, en ne gardant que celles >= minRarity. */
export function pickRarity(rng, { minRarity = 'commune', boost = {} } = {}) {
  const minOrder = RARITIES[minRarity].order;
  const pool = RARITY_KEYS.filter((k) => RARITIES[k].order >= minOrder).map((k) => [
    k,
    RARITIES[k].weight * (boost[k] ?? 1),
  ]);
  const total = pool.reduce((s, [, w]) => s + w, 0);
  let roll = rng() * total;
  for (const [key, w] of pool) {
    roll -= w;
    if (roll < 0) return key;
  }
  return pool[pool.length - 1][0];
}

/** Choisit une carte de la rareté demandée ; descend d'un cran si aucune n'existe. */
function pickCard(cards, rarity, rng) {
  let order = RARITIES[rarity].order;
  while (order >= 0) {
    const key = RARITY_KEYS[order];
    const candidates = cards.filter((c) => c.rarity === key);
    if (candidates.length) return candidates[Math.floor(rng() * candidates.length)];
    order--;
  }
  throw new Error('Aucune carte disponible pour ce booster');
}

/**
 * Ouvre un booster. Ne modifie pas `state` : renvoie un nouvel état.
 * @returns {{ state, pulls: Array<{card, isNew, dupValue}> }}
 */
export function openBooster(state, booster, allCards, rng = Math.random) {
  if (state.coins < booster.price) throw new Error('Pas assez de coins');
  const cards = booster.game ? allCards.filter((c) => c.game === booster.game) : allCards;

  // Raretés tirées slot par slot
  const rarities = [];
  for (let i = 0; i < booster.size; i++) {
    const isLast = i === booster.size - 1;
    rarities.push(
      pickRarity(rng, {
        minRarity: isLast ? booster.minLastSlot ?? 'commune' : 'commune',
        boost: booster.boost,
      }),
    );
  }

  // Système de pitié : on force la meilleure garantie sur la dernière carte
  const best = () => Math.max(...rarities.map((r) => RARITIES[r].order));
  const last = booster.size - 1;
  if (state.pity.legendary + 1 >= PITY_LEGENDARY && best() < RARITIES.legendaire.order) {
    rarities[last] = 'legendaire';
  } else if (state.pity.epic + 1 >= PITY_EPIC && best() < RARITIES.epique.order) {
    rarities[last] = 'epique';
  }

  // Tri croissant : la meilleure carte est révélée en dernier
  rarities.sort((a, b) => RARITIES[a].order - RARITIES[b].order);

  const collection = { ...state.collection };
  let refund = 0;
  const pulls = rarities.map((r) => {
    const card = pickCard(cards, r, rng);
    const isNew = !collection[card.id];
    collection[card.id] = (collection[card.id] ?? 0) + 1;
    const dupValue = isNew ? 0 : RARITIES[card.rarity].dupValue;
    refund += dupValue;
    return { card, isNew, dupValue };
  });

  const top = Math.max(...pulls.map((p) => RARITIES[p.card.rarity].order));
  return {
    pulls,
    state: {
      ...state,
      coins: state.coins - booster.price + refund,
      collection,
      opened: state.opened + 1,
      pity: {
        epic: top >= RARITIES.epique.order ? 0 : state.pity.epic + 1,
        legendary: top >= RARITIES.legendaire.order ? 0 : state.pity.legendary + 1,
      },
    },
  };
}

export function today(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function canClaimDaily(state, date = new Date()) {
  return state.lastDaily !== today(date);
}

export function claimDaily(state, date = new Date()) {
  if (!canClaimDaily(state, date)) throw new Error('Récompense déjà récupérée aujourd’hui');
  return { ...state, coins: state.coins + DAILY_REWARD, lastDaily: today(date) };
}

/** Statistiques de complétion de la collection. */
export function completion(state, allCards) {
  const owned = allCards.filter((c) => state.collection[c.id]).length;
  return { owned, total: allCards.length, percent: Math.round((owned / allCards.length) * 100) };
}
