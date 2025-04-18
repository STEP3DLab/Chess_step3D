import React, { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import io from "socket.io-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const socket = io("https://your-server-url.com");

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const gameRef = useRef(game);
  const [playerColor, setPlayerColor] = useState(null);
  const [isSpectator, setIsSpectator] = useState(false);
  const roomId = window.location.pathname.split("/g/")[1];

  useEffect(() => {
    socket.on("connect", () => socket.emit("join-game", { roomId }));

    socket.on("init", ({ fen, color, spectator }) => {
      setPlayerColor(color);
      setIsSpectator(spectator);
      const g = new Chess(fen);
      gameRef.current = g;
      setGame(g);
    });

    socket.on("move", ({ fen }) => {
      const g = new Chess(fen);
      gameRef.current = g;
      setGame(g);
    });

    socket.on("rematch", ({ fen }) => {
      const g = new Chess(fen);
      gameRef.current = g;
      setGame(g);
    });

    return () => {
      socket.off("connect");
      socket.off("init");
      socket.off("move");
      socket.off("rematch");
    };
  }, [roomId]);

  function onPieceDrop(src, tgt) {
    if (
      isSpectator ||
      gameRef.current.game_over() ||
      gameRef.current.turn() !== playerColor?.[0]
    ) return false;

    const move = { from: src, to: tgt, promotion: "q" };
    const g = new Chess(gameRef.current.fen());
    if (g.move(move)) {
      gameRef.current = g;
      setGame(g);
      socket.emit("move", { roomId, move });
      return true;
    }
    return false;
  }

  function handleRestart() {
    socket.emit("rematch", { roomId });
  }

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardContent className="flex flex-col items-center">
        <h2 className="mb-4 text-lg font-medium">
          {isSpectator
            ? "Spectating Game"
            : game.game_over()
            ? "Game Over"
            : `Playing as ${playerColor}`}
        </h2>

        <Chessboard
          position={game.fen()}
          onPieceDrop={onPieceDrop}
          boardOrientation={playerColor || "white"}
          arePiecesDraggable={!isSpectator}
          customBoardStyle={{ borderRadius: "4px" }}
          customDarkSquareStyle={{ backgroundColor: "#769656" }}
          customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
        />

        {game.game_over() && !isSpectator && (
          <Button className="mt-4" onClick={handleRestart}>
            Restart
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
