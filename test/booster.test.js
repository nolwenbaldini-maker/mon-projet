import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOOSTERS, RARITIES, PITY_EPIC, PITY_LEGENDARY, DAILY_REWARD,
  createState, openBooster, pickRarity, claimDaily, canClaimDaily,
} from '../public/js/booster.js';
import { CARDS, GAMES } from '../public/js/cards.js';

// RNG déterministe (mulberry32)
function seeded(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const byId = (id) => BOOSTERS.find((b) => b.id === id);
const rich = () => ({ ...createState(), coins: 1e9 });

test('le catalogue couvre toutes les raretés pour chaque jeu', () => {
  for (const game of Object.keys(GAMES)) {
    for (const r of Object.keys(RARITIES)) {
      assert.ok(CARDS.some((c) => c.game === game && c.rarity === r), `${game}/${r}`);
    }
  }
  assert.equal(new Set(CARDS.map((c) => c.id)).size, CARDS.length, 'ids uniques');
});

test('un booster donne le bon nombre de cartes et débite le prix', () => {
  const { state, pulls } = openBooster(createState(), byId('standard'), CARDS, seeded(1));
  assert.equal(pulls.length, 5);
  const refund = pulls.reduce((s, p) => s + p.dupValue, 0);
  assert.equal(state.coins, createState().coins - 100 + refund);
  assert.equal(state.opened, 1);
});

test('refuse sans coins suffisants', () => {
  assert.throws(() => openBooster({ ...createState(), coins: 10 }, byId('standard'), CARDS));
});

test('la dernière carte respecte la rareté minimale garantie', () => {
  const rng = seeded(42);
  let s = rich();
  for (let i = 0; i < 300; i++) {
    const res = openBooster(s, byId('premium'), CARDS, rng);
    s = res.state;
    const last = res.pulls.at(-1).card;
    assert.ok(RARITIES[last.rarity].order >= RARITIES.rare.order);
  }
});

test('les boosters de jeu ne donnent que des cartes de ce jeu', () => {
  const rng = seeded(7);
  let s = rich();
  for (let i = 0; i < 100; i++) {
    const res = openBooster(s, byId('valorant'), CARDS, rng);
    s = res.state;
    assert.ok(res.pulls.every((p) => p.card.game === 'valorant'));
  }
});

test('pitié : jamais plus de PITY_EPIC boosters sans MVP, ni PITY_LEGENDARY sans Légende', () => {
  const rng = seeded(123);
  let s = rich();
  let sinceEpic = 0;
  let sinceLeg = 0;
  for (let i = 0; i < 2000; i++) {
    const res = openBooster(s, byId('standard'), CARDS, rng);
    s = res.state;
    const top = Math.max(...res.pulls.map((p) => RARITIES[p.card.rarity].order));
    sinceEpic = top >= RARITIES.epique.order ? 0 : sinceEpic + 1;
    sinceLeg = top >= RARITIES.legendaire.order ? 0 : sinceLeg + 1;
    assert.ok(sinceEpic < PITY_EPIC);
    assert.ok(sinceLeg < PITY_LEGENDARY);
  }
});

test('les doublons sont convertis en coins', () => {
  const s = { ...rich(), collection: Object.fromEntries(CARDS.map((c) => [c.id, 1])) };
  const res = openBooster(s, byId('standard'), CARDS, seeded(9));
  assert.ok(res.pulls.every((p) => !p.isNew && p.dupValue === RARITIES[p.card.rarity].dupValue));
});

test('pickRarity respecte grossièrement les poids', () => {
  const rng = seeded(5);
  const counts = {};
  const N = 100000;
  for (let i = 0; i < N; i++) {
    const r = pickRarity(rng);
    counts[r] = (counts[r] ?? 0) + 1;
  }
  const total = Object.values(RARITIES).reduce((s, r) => s + r.weight, 0);
  for (const [k, r] of Object.entries(RARITIES)) {
    assert.ok(Math.abs(counts[k] / N - r.weight / total) < 0.01, k);
  }
});

test('récompense quotidienne une seule fois par jour', () => {
  const d = new Date('2026-11-01T12:00:00Z');
  const s = claimDaily(createState(), d);
  assert.equal(s.coins, createState().coins + DAILY_REWARD);
  assert.equal(canClaimDaily(s, d), false);
  assert.throws(() => claimDaily(s, d));
  assert.equal(canClaimDaily(s, new Date('2026-11-02T12:00:00Z')), true);
});
