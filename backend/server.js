const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const cors = require("cors");

const {
  createGameState,
  drawCard,
  playCardToField,
  specialSummon,
  attackMonsterZone,
  nextPhase,
  activateJoker,
  activateCardEffect,
  flipMonster,
  destroyBySix,
  reviveMonster,
} = require("./gameLogic");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.static(path.join(__dirname, "../frontend/build")));

const lobby = new Map();
const rooms = new Map();

function broadcastLobby() {
  io.emit("lobbyUpdate", {
    players: Array.from(lobby.values()),

    rooms: Array.from(
      rooms.entries()
    ).map(([id, room]) => ({
      id,
      players: room.players,
    })),
  });
}

function findRoomByPlayer(playerName) {
  for (const room of rooms.values()) {
    if (
      room.players.includes(playerName)
    ) {
      return room;
    }
  }

  return null;
}

io.on("connection", (socket) => {

  console.log(
    "🟢 Verbunden:",
    socket.id
  );

  let playerName = "";

  // ------------------
  // LOBBY
  // ------------------

  socket.on("joinLobby", (data) => {

    playerName = data.playerName;

    lobby.set(
      socket.id,
      playerName
    );

    broadcastLobby();
  });

  socket.on("createRoom", () => {

    if (!playerName) return;

    if (rooms.has(playerName))
      return;

    rooms.set(playerName, {
      id: playerName,
      players: [playerName],
      ready: new Set(),
      gameState: null,
    });

    lobby.delete(socket.id);

    socket.join(playerName);

    socket.emit("roomCreated", {
      id: playerName,
      players: [playerName],
    });

    broadcastLobby();
  });

  socket.on("joinRoom", (roomId) => {

    const room =
      rooms.get(roomId);

    if (!room) return;

    if (
      room.players.length >= 2
    ) return;

    room.players.push(playerName);

    socket.join(roomId);

    lobby.delete(socket.id);

    io.to(roomId).emit(
      "roomJoined",
      {
        id: roomId,
        players: room.players,
      }
    );

    broadcastLobby();
  });

  socket.on(
    "playerReady",
    (roomId) => {

      const room =
        rooms.get(roomId);

      if (!room) return;

      room.ready.add(playerName);

      io.to(roomId).emit(
        "readyStatus",
        Array.from(room.ready)
      );

      if (
        room.ready.size === 2 &&
        !room.gameState
      ) {

        room.gameState =
          createGameState(
            room.players
          );

        io.to(roomId).emit(
          "gameStarted",
          room.gameState
        );
      }
    }
  );

  // ------------------
  // SPIEL
  // ------------------

  socket.on("drawCard", () => {

    const room =
      findRoomByPlayer(
        playerName
      );

    if (
      !room ||
      !room.gameState
    ) return;

    drawCard(
      room.gameState,
      playerName
    );

    io.to(room.id).emit(
      "gameStateUpdate",
      room.gameState
    );
  });

  socket.on(
    "playCardToField",
    (data) => {

      const room =
        findRoomByPlayer(
          playerName
        );

      if (
        !room ||
        !room.gameState
      ) return;

      playCardToField(
        room.gameState,
        playerName,
        data.handIndex,
        data.fieldIndex,
        data.faceDown
      );

      io.to(room.id).emit(
        "gameStateUpdate",
        room.gameState
      );
    }
  );

  socket.on(
    "specialSummon",
    (data) => {

      const room =
        findRoomByPlayer(
          playerName
        );

      if (
        !room ||
        !room.gameState
      ) return;

      specialSummon(
        room.gameState,
        playerName,
        data.keepIndex,
        data.discardIndex,
        data.fieldIndex
      );

      io.to(room.id).emit(
        "gameStateUpdate",
        room.gameState
      );
    }
  );

  socket.on(
    "activateJoker",
    (data) => {

      const room =
        findRoomByPlayer(
          playerName
        );

      if (
        !room ||
        !room.gameState
      ) return;

      activateJoker(
        room.gameState,
        playerName,
        data.handIndex,
        data.targetIndex
      );

      io.to(room.id).emit(
        "gameStateUpdate",
        room.gameState
      );
    }
  );

  socket.on(
    "activateEffect",
    (data) => {

      const room =
        findRoomByPlayer(
          playerName
        );

      if (
        !room ||
        !room.gameState
      ) return;

      activateCardEffect(
        room.gameState,
        playerName,
        data.handIndex,
        data.targetIndex
      );

      io.to(room.id).emit(
        "gameStateUpdate",
        room.gameState
      );
    }
  );

  socket.on(
    "flipMonster",
    (fieldIndex) => {

      const room =
        findRoomByPlayer(
          playerName
        );

      if (
        !room ||
        !room.gameState
      ) return;

      flipMonster(
        room.gameState,
        playerName,
        fieldIndex
      );

      io.to(room.id).emit(
        "gameStateUpdate",
        room.gameState
      );
    }
  );

  socket.on(
    "destroyBySix",
    (data) => {

      const room =
        findRoomByPlayer(
          playerName
        );

      if (
        !room ||
        !room.gameState
      ) return;

      destroyBySix(
        room.gameState,
        playerName,
        data.targetPlayer,
        data.targetIndex
      );

      io.to(room.id).emit(
        "gameStateUpdate",
        room.gameState
      );
    }
  );

  socket.on(
    "reviveMonster",
    (graveIndex) => {

      const room =
        findRoomByPlayer(
          playerName
        );

      if (
        !room ||
        !room.gameState
      ) return;

      reviveMonster(
        room.gameState,
        playerName,
        graveIndex
      );

      io.to(room.id).emit(
        "gameStateUpdate",
        room.gameState
      );
    }
  );

  socket.on(
    "attack",
    (data) => {

      const room =
        findRoomByPlayer(
          playerName
        );

      if (
        !room ||
        !room.gameState
      ) return;

      const opponent =
        room.players.find(
          p => p !== playerName
        );

      attackMonsterZone(
        room.gameState,
        playerName,
        data.attackerIndex,
        opponent,
        data.defenderIndex
      );

      io.to(room.id).emit(
        "gameStateUpdate",
        room.gameState
      );
    }
  );

  socket.on("nextPhase", () => {

    const room =
      findRoomByPlayer(
        playerName
      );

    if (
      !room ||
      !room.gameState
    ) return;

    nextPhase(room.gameState);

    io.to(room.id).emit(
      "gameStateUpdate",
      room.gameState
    );
  });

  socket.on("disconnect", () => {

    console.log(
      "🔴 Getrennt:",
      playerName
    );

    lobby.delete(socket.id);

    for (const [id, room] of rooms) {

      if (
        room.players.includes(
          playerName
        )
      ) {

        room.players =
          room.players.filter(
            p => p !== playerName
          );

        room.ready.delete(
          playerName
        );

        if (
          room.players.length === 0
        ) {
          rooms.delete(id);
        }

        break;
      }
    }

    broadcastLobby();
  });

});

app.get("*", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "../frontend/build/index.html"
    )
  );

});

const PORT =
  process.env.PORT || 3000;

server.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `✅ Server läuft auf Port ${PORT}`
    );

  }
);