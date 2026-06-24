import React, { useState } from "react";
import { useSocket } from "./SocketContext";
import "./styles.css";

function Gameboard({ playerName, gameState }) {
  const socket = useSocket();

  const [selectedAttacker, setSelectedAttacker] =
    useState(null);

  const [selectedHandCards, setSelectedHandCards] =
    useState([]);

  const [effectMode, setEffectMode] =
    useState(null);

  const opponent =
    gameState.players.find(
      p => p !== playerName
    );

  const yourField =
    gameState.fields[playerName];

  const enemyField =
    gameState.fields[opponent];

  const yourHand =
    gameState.hands[playerName];

  const yourDeck =
    gameState.decks[playerName];

  // -----------------
  // Handkarten wählen
  // -----------------

  const selectHandCard = index => {

    if (
      selectedHandCards.includes(index)
    ) {

      setSelectedHandCards(
        selectedHandCards.filter(
          i => i !== index
        )
      );

    } else {

      if (
        selectedHandCards.length >= 2
      ) return;

      setSelectedHandCards([
        ...selectedHandCards,
        index,
      ]);
    }
  };

  // -----------------
  // Beschwören
  // -----------------

  const normalSummon = () => {

    const freeZone =
      yourField.monsterZones.findIndex(
        z => z === null
      );

    socket.emit(
      "playCardToField",
      {
        handIndex:
          selectedHandCards[0],

        fieldIndex:
          freeZone === -1
            ? 0
            : freeZone,

        faceDown: false,
      }
    );

    setSelectedHandCards([]);
  };

  const setFaceDown = () => {

    const freeZone =
      yourField.monsterZones.findIndex(
        z => z === null
      );

    socket.emit(
      "playCardToField",
      {
        handIndex:
          selectedHandCards[0],

        fieldIndex:
          freeZone === -1
            ? 0
            : freeZone,

        faceDown: true,
      }
    );

    setSelectedHandCards([]);
  };

  const specialSummon = () => {

    const c1 =
      yourHand[selectedHandCards[0]];

    const c2 =
      yourHand[selectedHandCards[1]];

    if (
      c1.wert !== c2.wert
    ) {

      alert(
        "Nur gleiche Karten!"
      );

      return;
    }

    const freeZone =
      yourField.monsterZones.findIndex(
        z => z === null
      );

    socket.emit(
      "specialSummon",
      {
        keepIndex:
          selectedHandCards[0],

        discardIndex:
          selectedHandCards[1],

        fieldIndex: freeZone,
      }
    );

    setSelectedHandCards([]);
  };

  // -----------------
  // Effekte
  // -----------------

  const activateEffect = () => {

    const card =
      yourHand[
        selectedHandCards[0]
      ];

    if (!card) return;

    if (
      card.wert === "Joker"
    ) {

      setEffectMode("joker");

      alert(
        "Wähle ein gegnerisches Monster."
      );

      return;
    }

    if (
      card.wert === "4"
    ) {

      setEffectMode("equip");

      alert(
        "Wähle ein eigenes Monster."
      );

      return;
    }

    if (
      card.wert === "7"
    ) {

      setEffectMode("revive");

      alert(
        "Wähle eine Karte im Friedhof."
      );

      return;
    }

    socket.emit(
      "activateEffect",
      {
        handIndex:
          selectedHandCards[0],
      }
    );

    setSelectedHandCards([]);
  };

  // -----------------
  // Angriff
  // -----------------

  const selectAttacker =
    index => {

      // 4 ausrüsten

      if (
        effectMode === "equip"
      ) {

        socket.emit(
          "activateEffect",
          {
            handIndex:
              selectedHandCards[0],

            targetIndex: index,
          }
        );

        setSelectedHandCards([]);
        setEffectMode(null);

        return;
      }

      // Monster aufdecken

      const card =
        yourField.monsterZones[index];

      if (
        card &&
        card.isFaceDown
      ) {

        socket.emit(
          "flipMonster",
          index
        );

        return;
      }

      if (!card) return;

      setSelectedAttacker(index);
    };

  const attackTarget =
    defenderIndex => {

      if (
        selectedAttacker === null
      )
        return;

      socket.emit(
        "attack",
        {
          attackerIndex:
            selectedAttacker,

          defenderIndex,
        }
      );

      setSelectedAttacker(null);
    };

  // -----------------
  // Karten darstellen
  // -----------------

  const renderCard =
    (card, enemy = false) => {

      if (!card) {

        return (
          <div className="empty-slot">
            Leer
          </div>
        );
      }

      let image =
        card.bild;

      if (
        card.isFaceDown
      ) {

        image =
          "/Cards-Ordner/img/cards/back-side.png";
      }

      return (
        <img
          className="card"
          src={image}
          alt={card.wert}
        />
      );
    };

  return (
    <div className="game-container">

      {gameState.winner && (

        <h1>
          🏆 Sieger:
          {" "}
          {gameState.winner}
        </h1>

      )}

      <h2>
        Phase:
        {" "}
        {gameState.phase}
      </h2>

      <h1
        style={{
          color:
            gameState.turn ===
            playerName
              ? "lime"
              : "red",
        }}
      >

        {gameState.turn ===
        playerName

          ? "🟢 DEIN ZUG"

          : "🔴 GEGNER IST AM ZUG"}

      </h1>

      {/* Gegner */}

      <div className="enemy-section">

        <h2>Gegner</h2>

        <div className="hand">

          {gameState.hands[
            opponent
          ].map((_, i) => (

            <img
              key={i}
              className="card"
              src="/Cards-Ordner/img/cards/back-side.png"
              alt=""
            />

          ))}

        </div>

        <h3>
          Schilde:
          {" "}
          {
            enemyField.shields.filter(
              Boolean
            ).length
          }
        </h3>

        <div className="shields">

          {enemyField.shields.map(
            (shield, i) => (

              <button
                key={i}
                disabled={!shield}
                onClick={() =>
                  attackTarget(-1)
                }
              >

                {shield
                  ? `Schild ${i + 1}`
                  : "X"}

              </button>

            )
          )}

        </div>

        <div className="monster-zones">

          {enemyField.monsterZones.map(
            (card, i) => (

              <div
                key={i}

                onClick={() => {

                  if (
                    effectMode ===
                    "joker"
                  ) {

                    socket.emit(
                      "activateJoker",
                      {
                        handIndex:
                          selectedHandCards[0],

                        targetIndex: i,
                      }
                    );

                    setSelectedHandCards([]);
                    setEffectMode(null);

                    return;
                  }

                  if (
                    gameState.pendingEffect &&
                    gameState.pendingEffect.type === "six"
                  ) {

                    socket.emit(
                      "destroyBySix",
                      {
                        targetPlayer:
                          opponent,

                        targetIndex: i,
                      }
                    );

                    return;
                  }

                  attackTarget(i);
                }}
              >

                {renderCard(card, true)}

              </div>

            )
          )}

        </div>

      </div>

      {/* Eigenes Feld */}

      <div className="your-section">

        <h2>Dein Feld</h2>

        <div className="hand">

          {yourHand.map(
            (card, i) => (

              <img
                key={i}
                className="card"
                src={card.bild}
                alt=""

                style={{
                  border:
                    selectedHandCards.includes(i)
                      ? "4px solid yellow"
                      : "none",
                }}

                onClick={() =>
                  selectHandCard(i)
                }
              />

            )
          )}

        </div>

        {selectedHandCards.length > 0 && (

          <div>

            {selectedHandCards.length === 1 && (

              <>
                <button
                  onClick={
                    normalSummon
                  }
                >
                  Beschwören
                </button>

                <button
                  onClick={
                    setFaceDown
                  }
                >
                  Setzen
                </button>

                <button
                  onClick={
                    activateEffect
                  }
                >
                  Effekt
                </button>
              </>

            )}

            {selectedHandCards.length === 2 && (

              <button
                onClick={
                  specialSummon
                }
              >
                Spezialbeschwörung
              </button>

            )}

          </div>

        )}

        <h3>
          Schilde:
          {" "}
          {
            yourField.shields.filter(
              Boolean
            ).length
          }
        </h3>

        <div className="monster-zones">

          {yourField.monsterZones.map(
            (card, i) => (

              <div
                key={i}
                onClick={() =>
                  selectAttacker(i)
                }
              >

                {renderCard(card)}

                {selectedAttacker ===
                  i && (
                  <p>
                    ⚔️
                  </p>
                )}

              </div>

            )
          )}

        </div>

      </div>

      {/* Buttons */}

      <div className="controls">

        <button
          onClick={() =>
            socket.emit(
              "drawCard"
            )
          }
        >
          Karte ziehen
        </button>

        <button
          onClick={() =>
            socket.emit(
              "nextPhase"
            )
          }
        >
          Nächste Phase
        </button>

      </div>

      {/* Seitenleiste */}

      <div className="side-panel">

        <h3>
          Deck:
          {" "}
          {yourDeck.length}
        </h3>

        <h3>Friedhof</h3>

        <div className="graveyard">

          {yourField.graveyard.map(
            (card, i) => (

              <img
                key={i}
                className="card"
                src={card.bild}
                alt=""

                onClick={() => {

                  if (
                    effectMode ===
                    "revive"
                  ) {

                    socket.emit(
                      "reviveMonster",
                      i
                    );

                    setEffectMode(null);
                    setSelectedHandCards([]);
                  }

                }}
              />

            )
          )}

        </div>

      </div>

    </div>
  );
}

export default Gameboard;