const cardValues = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "Bube",
  "Dame",
  "König",
  "Ass",
];

const powerMap = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  Bube: 11,
  Dame: 12,
  König: 13,
  Ass: 14,
};

const symbols = {
  rot: ["hearts", "diamonds"],
  schwarz: ["spades", "clubs"],
};

function getCardImagePath(wert, symbol) {
  const valueMap = {
    Bube: "jack",
    Dame: "queen",
    König: "king",
    Ass: "ace",
  };

  const valueString = valueMap[wert] || wert;

  return `/Cards-Ordner/img/cards/${valueString.toLowerCase()}_of_${symbol}.png`;
}

function shuffle(deck) {
  const array = [...deck];

  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

function generateDeck(color) {
  const deck = [];

  for (const value of cardValues) {
    for (const symbol of symbols[color]) {
      deck.push({
        farbe: color,
        wert: value,
        symbol,
        bild: getCardImagePath(value, symbol),

        power: powerMap[value],

        equipment: 0,

        hasAttacked: false,

        isFaceDown: false,

        turnsOnField: 0,
      });
    }
  }

  deck.push({
    farbe: color,
    wert: "Joker",
    isSpell: true,
    symbol: "joker",

    bild:
      color === "rot"
        ? "/Cards-Ordner/img/cards/red_joker.png"
        : "/Cards-Ordner/img/cards/black_joker.png",
  });

  return shuffle(deck);
}

function createGameState(players) {
  const redDeck = generateDeck("rot");
  const blackDeck = generateDeck("schwarz");

  return {
    players,

    turn: players[0],

    phase: "draw",

    winner: null,

    pendingEffect: null,

    normalSummonUsed: {
      [players[0]]: false,
      [players[1]]: false,
    },

    decks: {
      [players[0]]: redDeck,
      [players[1]]: blackDeck,
    },

    hands: {
      [players[0]]: redDeck.splice(0, 4),
      [players[1]]: blackDeck.splice(0, 4),
    },

    fields: {
      [players[0]]: {
        monsterZones: [null, null, null],
        shields: [true, true, true, true, true],
        graveyard: [],
      },

      [players[1]]: {
        monsterZones: [null, null, null],
        shields: [true, true, true, true, true],
        graveyard: [],
      },
    },
  };
}

function drawCard(gameState, playerName) {
  const deck = gameState.decks[playerName];
  const hand = gameState.hands[playerName];

  if (hand.length >= 6) return false;

  if (deck.length === 0) {
    gameState.winner =
      gameState.players.find(
        p => p !== playerName
      );

    return false;
  }

  hand.push(deck.pop());

  return true;
}

function playCardToField(
  gameState,
  playerName,
  handIndex,
  fieldIndex,
  faceDown = false
) {

  if (gameState.turn !== playerName)
    return false;

  if (
    gameState.normalSummonUsed[playerName]
  )
    return false;

  const hand =
    gameState.hands[playerName];

  const zones =
    gameState.fields[playerName]
      .monsterZones;

  const card = hand[handIndex];

  if (!card) return false;

  if (card.wert === "Joker")
    return false;

  let tribute = 0;

  if (
    ["Bube", "Dame"].includes(card.wert)
  )
    tribute = 1;

  if (
    ["König", "Ass"].includes(card.wert)
  )
    tribute = 2;

  if (
    zones.filter(Boolean).length <
    tribute
  )
    return false;

  for (let i = 0; i < tribute; i++) {
    const index =
      zones.findIndex(Boolean);

    gameState.fields[playerName]
      .graveyard.push(zones[index]);

    zones[index] = null;
  }

  if (zones[fieldIndex]) {
    fieldIndex =
      zones.findIndex(z => z === null);

    if (fieldIndex === -1)
      return false;
  }

  const monster =
    hand.splice(handIndex, 1)[0];

  monster.isFaceDown = faceDown;

  monster.hasAttacked = false;

  zones[fieldIndex] = monster;

  gameState.normalSummonUsed[playerName] =
    true;

  return true;
}

function specialSummon(
  gameState,
  playerName,
  keepIndex,
  discardIndex,
  fieldIndex
) {

  const hand =
    gameState.hands[playerName];

  const zones =
    gameState.fields[playerName]
      .monsterZones;

  if (zones[fieldIndex]) return false;

  const c1 = hand[keepIndex];
  const c2 = hand[discardIndex];

  if (!c1 || !c2)
    return false;

  if (c1.wert !== c2.wert)
    return false;

  const summon = { ...c1 };

  gameState.fields[playerName]
    .graveyard.push(c2);

  hand.splice(
    Math.max(keepIndex, discardIndex),
    1
  );

  hand.splice(
    Math.min(keepIndex, discardIndex),
    1
  );

  summon.hasAttacked = false;

  zones[fieldIndex] = summon;

  return true;
}

function attackMonsterZone(
  gameState,
  attackerPlayer,
  attackerIndex,
  defenderPlayer,
  defenderIndex
) {

  const atkZones =
    gameState.fields[attackerPlayer]
      .monsterZones;

  const defZones =
    gameState.fields[defenderPlayer]
      .monsterZones;

  const attacker =
    atkZones[attackerIndex];

  if (!attacker) return false;

  if (attacker.hasAttacked)
    return false;

  if (attacker.isFaceDown)
    return false;

  const enemyMonsters =
    defZones.filter(Boolean);

  if (enemyMonsters.length > 0) {

    const defender =
      defZones[defenderIndex];

    if (!defender)
      return false;

    const wasFaceDown =
      defender.isFaceDown;

    defender.isFaceDown = false;

    const atk =
      attacker.power +
      attacker.equipment;

    const def =
      defender.power +
      defender.equipment;

    if (atk > def) {

      defZones[defenderIndex] = null;

      gameState.fields[defenderPlayer]
        .graveyard.push(defender);

      // Effekt der 6

      if (
        wasFaceDown &&
        defender.wert === "6"
      ) {

        gameState.pendingEffect = {
          type: "six",
          owner: defenderPlayer,
        };
      }

    } else if (atk < def) {

      atkZones[attackerIndex] = null;

      gameState.fields[attackerPlayer]
        .graveyard.push(attacker);

    } else {

      atkZones[attackerIndex] = null;
      defZones[defenderIndex] = null;

      gameState.fields[attackerPlayer]
        .graveyard.push(attacker);

      gameState.fields[defenderPlayer]
        .graveyard.push(defender);
    }

  } else {

    const shield =
      gameState.fields[defenderPlayer]
        .shields.findIndex(Boolean);

    if (shield !== -1) {

      gameState.fields[defenderPlayer]
        .shields[shield] = false;

    } else {

      gameState.winner =
        attackerPlayer;
    }
  }

  if (atkZones[attackerIndex])
    atkZones[attackerIndex]
      .hasAttacked = true;

  return true;
}

function activateJoker(
  gameState,
  playerName,
  handIndex,
  targetIndex
) {

  const hand =
    gameState.hands[playerName];

  const joker =
    hand[handIndex];

  if (
    !joker ||
    joker.wert !== "Joker"
  )
    return false;

  const opponent =
    gameState.players.find(
      p => p !== playerName
    );

  const target =
    gameState.fields[opponent]
      .monsterZones[targetIndex];

  if (!target)
    return false;

  gameState.fields[opponent]
    .graveyard.push(target);

  gameState.fields[opponent]
    .monsterZones[targetIndex] =
    null;

  hand.splice(handIndex, 1);

  gameState.fields[playerName]
    .graveyard.push(joker);

  return true;
}

function activateCardEffect(
  gameState,
  playerName,
  handIndex,
  targetIndex = null
) {

  const hand =
    gameState.hands[playerName];

  const card =
    hand[handIndex];

  if (!card) return false;

  // 2/3

  if (
    card.wert === "2" ||
    card.wert === "3"
  ) {

    let restored = 0;

    gameState.fields[playerName]
      .shields.forEach((s, i) => {

        if (!s && restored < 2) {

          gameState.fields[playerName]
            .shields[i] = true;

          restored++;
        }
      });

    hand.splice(handIndex, 1);

    gameState.fields[playerName]
      .graveyard.push(card);

    return true;
  }

  // 5

  if (card.wert === "5") {

    hand.splice(handIndex, 1);

    gameState.fields[playerName]
      .graveyard.push(card);

    drawCard(
      gameState,
      playerName
    );

    return true;
  }

  // 4

  if (
    card.wert === "4" &&
    targetIndex !== null
  ) {

    const monster =
      gameState.fields[playerName]
        .monsterZones[targetIndex];

    if (!monster)
      return false;

    monster.equipment += 4;

    hand.splice(handIndex, 1);

    gameState.fields[playerName]
      .graveyard.push(card);

    return true;
  }

  return false;
}

function flipMonster(
  gameState,
  playerName,
  fieldIndex
) {

  const monster =
    gameState.fields[playerName]
      .monsterZones[fieldIndex];

  if (!monster)
    return false;

  if (!monster.isFaceDown)
    return false;

  monster.isFaceDown = false;

  return true;
}

function destroyBySix(
  gameState,
  playerName,
  targetPlayer,
  targetIndex
) {

  if (
    !gameState.pendingEffect
  )
    return false;

  const zones =
    gameState.fields[targetPlayer]
      .monsterZones;

  const target =
    zones[targetIndex];

  if (!target)
    return false;

  zones[targetIndex] = null;

  gameState.fields[targetPlayer]
    .graveyard.push(target);

  gameState.pendingEffect = null;

  return true;
}

function reviveMonster(
  gameState,
  playerName,
  graveIndex
) {

  const grave =
    gameState.fields[playerName]
      .graveyard;

  const freeZone =
    gameState.fields[playerName]
      .monsterZones.findIndex(
        z => z === null
      );

  if (freeZone === -1)
    return false;

  const monster =
    grave[graveIndex];

  if (!monster)
    return false;

  grave.splice(graveIndex, 1);

  monster.hasAttacked = false;

  gameState.fields[playerName]
    .monsterZones[freeZone] =
    monster;

  return true;
}

function nextPhase(gameState) {

  const phases = [
    "draw",
    "main",
    "battle",
    "end",
  ];

  const index =
    phases.indexOf(gameState.phase);

  gameState.phase =
    phases[(index + 1) % phases.length];

  if (gameState.phase === "draw") {

    gameState.turn =
      gameState.players.find(
        p => p !== gameState.turn
      );

    gameState.normalSummonUsed[
      gameState.turn
    ] = false;

    gameState.fields[
      gameState.turn
    ].monsterZones.forEach(card => {

      if (!card) return;

      card.hasAttacked = false;
      card.turnsOnField++;
    });
  }
}

module.exports = {
  createGameState,
  drawCard,
  playCardToField,
  specialSummon,
  attackMonsterZone,
  activateJoker,
  activateCardEffect,
  flipMonster,
  destroyBySix,
  reviveMonster,
  nextPhase,
};