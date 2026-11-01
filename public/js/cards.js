// Catalogue de cartes. Joueurs et équipes FICTIFS : remplace-les par tes propres données.
// rarity : commune | peu_commune | rare | epique | legendaire

export const GAMES = {
  lol: { name: 'League of Legends', short: 'LoL', color: '#c89b3c' },
  valorant: { name: 'Valorant', short: 'VAL', color: '#ff4655' },
  cs2: { name: 'Counter-Strike 2', short: 'CS2', color: '#f5a623' },
  rl: { name: 'Rocket League', short: 'RL', color: '#1f8fff' },
};

const raw = [
  // League of Legends
  ['lol', 'Kaelix', 'Nova Wolves', 'Mid', 'legendaire', 97, '🇰🇷'],
  ['lol', 'Brisa', 'Kraken Esports', 'ADC', 'epique', 92, '🇫🇷'],
  ['lol', 'Thornwall', 'Nova Wolves', 'Top', 'rare', 88, '🇩🇪'],
  ['lol', 'Lumen', 'Solaris Gaming', 'Support', 'rare', 86, '🇪🇸'],
  ['lol', 'Jaxxon', 'Velvet Raptors', 'Jungle', 'peu_commune', 82, '🇺🇸'],
  ['lol', 'Mirelle', 'Kraken Esports', 'Mid', 'peu_commune', 80, '🇫🇷'],
  ['lol', 'Oruk', 'Solaris Gaming', 'Top', 'peu_commune', 79, '🇵🇱'],
  ['lol', 'Pixl', 'Velvet Raptors', 'ADC', 'commune', 74, '🇸🇪'],
  ['lol', 'Tenko', 'Nova Wolves', 'Support', 'commune', 72, '🇯🇵'],
  ['lol', 'Vargo', 'Kraken Esports', 'Jungle', 'commune', 71, '🇮🇹'],
  ['lol', 'Sable', 'Solaris Gaming', 'ADC', 'commune', 70, '🇧🇷'],

  // Valorant
  ['valorant', 'Zephyr', 'Phantom Unit', 'Duelist', 'legendaire', 96, '🇧🇷'],
  ['valorant', 'Nyx', 'Eclipse Five', 'Controller', 'epique', 91, '🇫🇷'],
  ['valorant', 'Rook', 'Phantom Unit', 'Initiator', 'rare', 87, '🇺🇸'],
  ['valorant', 'Kestrel', 'Iron Lotus', 'Sentinel', 'rare', 85, '🇹🇷'],
  ['valorant', 'Flick', 'Eclipse Five', 'Duelist', 'peu_commune', 81, '🇬🇧'],
  ['valorant', 'Moss', 'Iron Lotus', 'Controller', 'peu_commune', 80, '🇨🇦'],
  ['valorant', 'Echo', 'Neon Tide', 'Initiator', 'peu_commune', 78, '🇰🇷'],
  ['valorant', 'Drift', 'Neon Tide', 'Sentinel', 'commune', 73, '🇫🇮'],
  ['valorant', 'Hush', 'Phantom Unit', 'Controller', 'commune', 72, '🇲🇦'],
  ['valorant', 'Brix', 'Iron Lotus', 'Duelist', 'commune', 71, '🇦🇷'],
  ['valorant', 'Pulse', 'Eclipse Five', 'Sentinel', 'commune', 69, '🇧🇪'],

  // Counter-Strike 2
  ['cs2', 'Volkov', 'Northern Forge', 'AWPer', 'legendaire', 98, '🇺🇦'],
  ['cs2', 'Ardent', 'Crimson Vault', 'Rifler', 'epique', 92, '🇩🇰'],
  ['cs2', 'Blitzer', 'Northern Forge', 'Entry', 'rare', 88, '🇷🇺'],
  ['cs2', 'Calder', 'Steel Hydra', 'IGL', 'rare', 85, '🇫🇷'],
  ['cs2', 'Dusk', 'Crimson Vault', 'Lurker', 'peu_commune', 82, '🇸🇪'],
  ['cs2', 'Ferro', 'Steel Hydra', 'Rifler', 'peu_commune', 80, '🇵🇹'],
  ['cs2', 'Gale', 'Onyx Syndicate', 'Support', 'peu_commune', 78, '🇧🇦'],
  ['cs2', 'Hex', 'Onyx Syndicate', 'AWPer', 'commune', 74, '🇨🇿'],
  ['cs2', 'Ivo', 'Northern Forge', 'Support', 'commune', 72, '🇧🇬'],
  ['cs2', 'Jolt', 'Crimson Vault', 'Entry', 'commune', 71, '🇳🇴'],
  ['cs2', 'Kilo', 'Steel Hydra', 'Lurker', 'commune', 69, '🇭🇺'],

  // Rocket League
  ['rl', 'Aerion', 'Skyline Drive', 'Striker', 'legendaire', 97, '🇫🇷'],
  ['rl', 'Boost', 'Turbo Owls', 'Playmaker', 'epique', 91, '🇺🇸'],
  ['rl', 'Ceiling', 'Skyline Drive', 'Defender', 'rare', 87, '🇬🇧'],
  ['rl', 'Dribbla', 'Apex Motors', 'Striker', 'rare', 85, '🇳🇱'],
  ['rl', 'Edge', 'Turbo Owls', 'Defender', 'peu_commune', 81, '🇪🇸'],
  ['rl', 'Flip', 'Apex Motors', 'Playmaker', 'peu_commune', 79, '🇧🇷'],
  ['rl', 'Glide', 'Redline RC', 'Striker', 'peu_commune', 78, '🇸🇦'],
  ['rl', 'Halo', 'Redline RC', 'Defender', 'commune', 73, '🇩🇪'],
  ['rl', 'Ignis', 'Skyline Drive', 'Playmaker', 'commune', 71, '🇫🇷'],
  ['rl', 'Juke', 'Turbo Owls', 'Striker', 'commune', 70, '🇦🇺'],
  ['rl', 'Kick', 'Apex Motors', 'Defender', 'commune', 68, '🇲🇽'],
];

export const CARDS = raw.map(([game, name, team, role, rarity, rating, flag]) => ({
  id: `${game}-${name.toLowerCase()}`,
  game,
  name,
  team,
  role,
  rarity,
  rating,
  flag,
}));
