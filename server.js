// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const games = {};

io.on('connection', socket => {
  socket.on('join', ({ roomId }) => {
    socket.join(roomId);
    if (!games[roomId]) {
      // new game
      games[roomId] = {
        chess: new Chess(),
        clocks: { w: 300000, b: 300000 },
        turn: 'w',
        players: [],
      };
    }
    const game = games[roomId];
    // assign role
    if (game.players.length < 2) {
      const role = game.players.length === 0 ? 'white' : 'black';
      game.players.push({ id: socket.id, role });
      socket.data.role = role;
    } else {
      socket.data.role = 'spectator';
    }

    socket.data.roomId = roomId;

    // send init
    io.to(socket.id).emit('init', {
      fen: game.chess.fen(),
      clocks: game.clocks,
      turn: game.turn,
      role: socket.data.role,
    });
  });

  socket.on('move', ({ roomId, move }) => {
    const game = games[roomId];
    if (!game) return;

    const result = game.chess.move(move);
    if (!result) return;

    // switch turn
    game.turn = game.chess.turn();
    // Note: clocks adjustment happens on client side

    // broadcast
    io.in(roomId).emit('move', {
      fen: game.chess.fen(),
      clocks: game.clocks,
      turn: game.turn,
      gameOver: game.chess.game_over(),
      outcome: game.chess.in_checkmate()
        ? `${game.chess.turn() === 'w' ? 'Black' : 'White'} wins`
        : null,
    });
  });

  socket.on('rematch', ({ roomId }) => {
    const game = games[roomId];
    if (!game) return;
    game.chess.reset();
    game.clocks = { w: 300000, b: 300000 };
    game.turn = 'w';
    io.in(roomId).emit('rematch', {
      fen: game.chess.fen(),
      clocks: game.clocks,
      turn: game.turn,
    });
  });

  socket.on('disconnect', () => {
    // optional: handle reconnection or cleanup
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Quick Chess running on http://localhost:${PORT}`);
});
