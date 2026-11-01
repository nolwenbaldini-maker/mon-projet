import {
  RARITIES, RARITY_KEYS, BOOSTERS, PITY_EPIC, PITY_LEGENDARY,
  createState, openBooster, canClaimDaily, claimDaily, completion,
} from './booster.js';
import { CARDS, GAMES } from './cards.js';

const STORAGE_KEY = 'esport-boosters-v1';
const $ = (sel) => document.querySelector(sel);

let state = load();

function load() {
  try {
    return { ...createState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  } catch {
    return createState();
  }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---------- Rendu d'une carte ----------
function cardHTML(card, { owned = true, count = 0, isNew = false, dupValue = 0 } = {}) {
  const r = RARITIES[card.rarity];
  const g = GAMES[card.game];
  if (!owned) {
    return `<div class="card locked" style="--rar:${r.color}">
      <div class="card-inner"><span class="q">?</span><small>${r.label}</small></div></div>`;
  }
  const initials = card.name.slice(0, 2).toUpperCase();
  return `<div class="card rar-${card.rarity}" style="--rar:${r.color};--game:${g.color}">
    ${isNew ? '<span class="badge new">NEW</span>' : ''}
    ${dupValue ? `<span class="badge dup">+${dupValue} 🪙</span>` : ''}
    ${count > 1 ? `<span class="badge count">x${count}</span>` : ''}
    <div class="card-inner">
      <div class="card-top"><span class="rating">${card.rating}</span><span class="game">${g.short}</span></div>
      <div class="avatar">${initials}</div>
      <div class="name">${card.flag} ${card.name}</div>
      <div class="team">${card.team}</div>
      <div class="role">${card.role}</div>
      <div class="rarity">${r.label}</div>
    </div>
  </div>`;
}

// ---------- Boutique ----------
function renderShop() {
  $('#coins').textContent = state.coins;
  $('#daily').disabled = !canClaimDaily(state);
  $('#pity').textContent =
    `MVP garanti dans ${PITY_EPIC - state.pity.epic} booster(s) · ` +
    `Légende garantie dans ${PITY_LEGENDARY - state.pity.legendary} booster(s)`;

  $('#boosters').innerHTML = BOOSTERS.map((b) => {
    const color = b.game ? GAMES[b.game].color : b.id === 'premium' ? '#ffb800' : '#7c5cff';
    return `<div class="booster" style="--pack:${color}">
      <div class="booster-art">${b.game ? GAMES[b.game].short : b.id === 'premium' ? '★' : 'ALL'}</div>
      <h3>${b.name}</h3>
      <p>${b.description}</p>
      <button data-buy="${b.id}" ${state.coins < b.price ? 'disabled' : ''}>Ouvrir · ${b.price} 🪙</button>
    </div>`;
  }).join('');
}

// ---------- Ouverture ----------
function startOpening(booster) {
  let result;
  try {
    result = openBooster(state, booster, CARDS);
  } catch (e) {
    alert(e.message);
    return;
  }
  state = result.state;
  save();

  const overlay = $('#opening');
  const pack = $('#pack');
  const reveal = $('#reveal');
  overlay.classList.remove('hidden');
  reveal.innerHTML = '';
  $('#opening-summary').textContent = '';
  $('#reveal-all').classList.add('hidden');
  $('#close-opening').classList.add('hidden');

  pack.className = 'pack shake';
  pack.textContent = booster.name;
  pack.style.setProperty('--pack', booster.game ? GAMES[booster.game].color : '#7c5cff');

  const showCards = () => {
    pack.className = 'pack hidden';
    reveal.innerHTML = result.pulls.map((p, i) => `
      <div class="flip" data-i="${i}" style="--rar:${RARITIES[p.card.rarity].color}">
        <div class="flip-inner">
          <div class="flip-back"><span>⚡</span></div>
          <div class="flip-front">${cardHTML(p.card, p)}</div>
        </div>
      </div>`).join('');
    $('#reveal-all').classList.remove('hidden');
  };
  pack.onclick = showCards;
  setTimeout(() => pack.classList.contains('shake') && showCards(), 1400);

  reveal.onclick = (e) => {
    const flip = e.target.closest('.flip');
    if (flip) flipCard(flip, result);
  };
  $('#reveal-all').onclick = () => {
    reveal.querySelectorAll('.flip:not(.flipped)').forEach((f, i) =>
      setTimeout(() => flipCard(f, result), i * 250));
  };
}

function flipCard(el, result) {
  if (el.classList.contains('flipped')) return;
  el.classList.add('flipped');
  const p = result.pulls[+el.dataset.i];
  if (RARITIES[p.card.rarity].order >= RARITIES.epique.order) {
    el.classList.add('glow');
    $('#opening').classList.add(`flash-${p.card.rarity}`);
    setTimeout(() => $('#opening').classList.remove(`flash-${p.card.rarity}`), 700);
  }
  if (!$('#reveal').querySelector('.flip:not(.flipped)')) {
    const news = result.pulls.filter((x) => x.isNew).length;
    const refund = result.pulls.reduce((s, x) => s + x.dupValue, 0);
    $('#opening-summary').textContent =
      `${news} nouvelle(s) carte(s) · doublons convertis : +${refund} 🪙`;
    $('#reveal-all').classList.add('hidden');
    $('#close-opening').classList.remove('hidden');
  }
}

// ---------- Collection ----------
function renderCollection() {
  const game = $('#filter-game').value;
  const rarity = $('#filter-rarity').value;
  const list = CARDS
    .filter((c) => (!game || c.game === game) && (!rarity || c.rarity === rarity))
    .sort((a, b) => RARITIES[b.rarity].order - RARITIES[a.rarity].order || b.rating - a.rating);

  $('#collection-grid').innerHTML = list
    .map((c) => cardHTML(c, { owned: !!state.collection[c.id], count: state.collection[c.id] }))
    .join('');
  const { owned, total, percent } = completion(state, CARDS);
  $('#completion').textContent = `Collection : ${owned}/${total} (${percent}%) · ${state.opened} booster(s) ouvert(s)`;
}

function render() {
  renderShop();
  renderCollection();
}

// ---------- Événements ----------
function init() {
  $('#filter-game').innerHTML += Object.entries(GAMES)
    .map(([k, g]) => `<option value="${k}">${g.name}</option>`).join('');
  $('#filter-rarity').innerHTML += RARITY_KEYS
    .map((k) => `<option value="${k}">${RARITIES[k].label}</option>`).join('');

  document.querySelectorAll('nav button').forEach((btn) => btn.addEventListener('click', () => {
    document.querySelectorAll('nav button, .view').forEach((el) => el.classList.remove('active'));
    btn.classList.add('active');
    $(`#${btn.dataset.view}`).classList.add('active');
  }));

  $('#boosters').addEventListener('click', (e) => {
    const id = e.target.dataset.buy;
    if (id) startOpening(BOOSTERS.find((b) => b.id === id));
  });
  $('#close-opening').addEventListener('click', () => {
    $('#opening').classList.add('hidden');
    render();
  });
  $('#daily').addEventListener('click', () => {
    state = claimDaily(state);
    save();
    render();
  });
  $('#reset').addEventListener('click', () => {
    if (confirm('Effacer toute la progression ?')) {
      state = createState();
      save();
      render();
    }
  });
  $('#filter-game').addEventListener('change', renderCollection);
  $('#filter-rarity').addEventListener('change', renderCollection);

  render();
}

init();
