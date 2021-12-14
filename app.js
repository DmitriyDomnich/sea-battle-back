import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: `*`,
        methods: ['GET', 'POST']
    }
});

let port = process.env.PORT;
if (port == null || port == "") {
    port = 3000;
}

io.on('connection', socket => {
    console.log(`${socket.id} connected`);
    socket.on('room-exists', (roomId) => {
        if (!io.of('/').adapter.rooms.has(roomId)) {
            socket.emit('joinError', "Game doesn't exist. Create a new one.");
        } else if (io.of('/').adapter.rooms.get(roomId).size === 2 && !io.of('/').adapter.rooms.get(roomId).has(socket.id)) {
            socket.emit('joinError', "The room is full.");
        } else {
            if (!io.of('/').adapter.rooms.get(roomId).has(socket.id)) {
                socket.join(roomId);
            }
            socket.emit('roomConnected');
        }
    })
    socket.on('create-room', (roomId) => {
        socket.join(roomId);
    });
    socket.on('join-room', (roomId) => {
        if (!io.of('/').adapter.rooms.has(roomId)) {
            socket.emit('joinError', "Game doesn't exist. Create a new one.");
        } else if (io.of('/').adapter.rooms.get(roomId).size === 2) {
            socket.emit('joinError', "The room is full.");
        } else {
            socket.join(roomId);
            socket.emit('roomConnected');
        }
    });
    socket.on('shot-nothing', (roomId, index) => {
        socket.to(roomId).emit('player-nothing-shot', index);
    })
    socket.on('shot-ship', (roomId, index) => {
        socket.to(roomId).emit('player-ship-shot', index);
    });
    socket.on('leave-room', (roomId, leaveSetup) => {
        if (leaveSetup) {
            socket.to(roomId).emit('enemyLeftSetup');
        }
        socket.to(roomId).emit('enemyLeftGame');
        socket.leave(roomId);
    });
    socket.on('requestEnemyData', (roomId) => {
        if (io.of('/').adapter.rooms.has(roomId)) {
            socket.to(roomId).emit('enemyRequestsData');
        } else {
            socket.emit('no-such-room');
        }
    });
    socket.on('askForFieldsInRunningGame', (roomId) => {
        socket.to(roomId).emit('enemyJoinedRunningGame');
    });
    socket.on('sendFieldsInRunningGame', (roomId, fields, isYourTurn) => {
        fields.isYourTurn = isYourTurn;
        socket.to(roomId).emit('sendRunningGameFields', fields);
    });
    socket.on('sendFieldConfiguration', (oneFieldConfig, roomId) => {
        socket.to(roomId).emit('someoneReady', oneFieldConfig);
    });
    socket.on('sendTwoFieldConfiguration', (fieldConfigurations, roomId) => {
        socket.to(roomId).emit('gameIsGoing', fieldConfigurations);
    });
    io.of("/").adapter.on("join-room", (room, id) => {
        console.log(io.of("/").adapter.rooms);
    });
    io.of('/').adapter.on('leave-room', (room, id) => {
        console.log(`${id} left ${room}`);
        socket.to(room).emit('enemyLeftGame');
    });
});

httpServer.listen(port, () => { });