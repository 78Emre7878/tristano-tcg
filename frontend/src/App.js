import React, { useEffect, useState } from "react";
import { useSocket } from "./SocketContext";
import Gameboard from "./Gameboard";

function App() {

  const socket = useSocket();

  const [name, setName] = useState("");

  const [inLobby, setInLobby] =
    useState(false);

  const [rooms, setRooms] =
    useState([]);

  const [roomId, setRoomId] =
    useState("");

  const [
    playersInRoom,
    setPlayersInRoom,
  ] = useState([]);

  const [ready, setReady] =
    useState(false);

  const [gameState, setGameState] =
    useState(null);

  useEffect(() => {

    if (!socket) return;

    socket.on("connect", () => {

      console.log(
        "Socket verbunden:",
        socket.id
      );

    });

    socket.on(
      "lobbyUpdate",
      (data) => {

        console.log(
          "Lobby Update:",
          data
        );

        setRooms(
          data.rooms || []
        );

      }
    );

    socket.on(
      "roomCreated",
      (room) => {

        console.log(
          "Raum erstellt:",
          room
        );

        setRoomId(room.id);

        setPlayersInRoom(
          room.players
        );

      }
    );

    socket.on(
      "roomJoined",
      (room) => {

        console.log(
          "Raum beigetreten:",
          room
        );

        setRoomId(room.id);

        setPlayersInRoom(
          room.players
        );

      }
    );

    socket.on(
      "readyStatus",
      (list) => {

        console.log(
          "Ready:",
          list
        );

      }
    );

    socket.on(
      "gameStarted",
      (state) => {

        console.log(
          "Spiel gestartet"
        );

        setGameState(state);

      }
    );

    socket.on(
      "gameStateUpdate",
      (state) => {

        setGameState(state);

      }
    );

    return () => {

      socket.off();

    };

  }, [socket]);

  // ----------------

  const joinLobby = () => {

    if (!name.trim()) {

      alert(
        "Bitte Namen eingeben."
      );

      return;
    }

    socket.emit(
      "joinLobby",
      {
        playerName: name,
      }
    );

    setInLobby(true);
  };

  const createRoom = () => {

    socket.emit(
      "createRoom"
    );

  };

  const joinRoom = (id) => {

    socket.emit(
      "joinRoom",
      id
    );

  };

  const toggleReady = () => {

    socket.emit(
      "playerReady",
      roomId
    );

    setReady(true);

  };

  const startAIMatch = () => {

    socket.emit(
      "startAIMatch"
    );

  };

  // ----------------

  if (!inLobby) {

    return (

      <div
        style={{
          padding: 20,
        }}
      >

        <h1>
          Tristanoh
        </h1>

        <input
          value={name}

          onChange={(e) =>
            setName(
              e.target.value
            )
          }

          placeholder="Name"
        />

        <button
          onClick={
            joinLobby
          }
        >
          Zur Lobby
        </button>

      </div>
    );
  }

  if (gameState) {

    return (
      <Gameboard
        playerName={name}
        gameState={
          gameState
        }
      />
    );

  }

  return (

    <div
      style={{
        padding: 20,
      }}
    >

      <h1>Lobby</h1>

      <h2>
        Willkommen {name}
      </h2>

      {!roomId && (

        <>

          <button
            onClick={
              createRoom
            }
          >
            Raum erstellen
          </button>

          <button
            onClick={
              startAIMatch
            }
          >
            KI Match
          </button>

          <h3>Räume</h3>

          {rooms.map(
            (room) => (

              <div
                key={room.id}
              >

                <strong>
                  {room.id}
                </strong>

                {" - "}

                {
                  room.players.join(
                    ", "
                  )
                }

                <button
                  onClick={() =>
                    joinRoom(
                      room.id
                    )
                  }
                >
                  Beitreten
                </button>

              </div>
            )
          )}

        </>

      )}

      {roomId && (

        <>

          <h2>
            Raum:
            {" "}
            {roomId}
          </h2>

          <p>

            Spieler:

            {" "}

            {
              playersInRoom.join(
                ", "
              )
            }

          </p>

          {!ready && (

            <button
              onClick={
                toggleReady
              }
            >
              Bereit
            </button>

          )}

        </>

      )}

    </div>

  );

}

export default App;