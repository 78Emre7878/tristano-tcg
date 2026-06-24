// src/SocketContext.js

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { io } from "socket.io-client";

export const SocketContext =
  createContext(null);

export const SocketProvider = ({
  children,
}) => {

  const [socket, setSocket] =
    useState(null);

  useEffect(() => {

    const newSocket = io(
      "https://tristano-tcg.onrender.com",
      {
        transports: ["websocket"],
      }
    );

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };

  }, []);

  return (
    <SocketContext.Provider
      value={socket}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () =>
  useContext(SocketContext);