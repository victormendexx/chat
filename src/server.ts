import express, { Application } from "express";
import http from "http";
import { Server } from "socket.io";

class App {
  private app: Application;
  private http: http.Server;
  private io: Server;

  constructor() {
    this.app = express();
    this.http = http.createServer(this.app);
    this.io = new Server(this.http);
    this.listenSocket();
    this.setupRoutes();
  }

  listenServer() {
    this.http.listen(3000, () => console.log("server is running"));
  }

  listenSocket() {
    const users: Record<string, { username: string; socketId: string }> = {};

    this.io.on("connection", (socket) => {
      console.log("user connected =>", socket.id);

      socket.on("register", (username: string) => {
        users[socket.id] = { username, socketId: socket.id };
        socket.join("Geral");

        const currentUser = users[socket.id];
        const otherUsers = Object.values(users).filter(
          (u) => u.socketId !== socket.id
        );

        // O novo usuário conhece as salas privadas com os outros
        otherUsers.forEach((other) => {
          const roomName = generatePrivateRoom(
            currentUser.username,
            other.username
          );
          socket.emit("new-private-room", roomName);

          // O outro usuário (já conectado) também precisa ser avisado da nova sala
          const otherSocket = this.io.sockets.sockets.get(other.socketId);
          if (otherSocket) {
            otherSocket.emit("new-private-room", roomName);
          }
        });

        // Envia lista inicial para o novo usuário
        const roomList = [
          "Geral",
          ...otherUsers.map((other) =>
            generatePrivateRoom(currentUser.username, other.username)
          ),
        ];
        socket.emit("room-list", roomList);

        socket.broadcast.emit("user-connected", currentUser.username);
      });

      socket.on("join-room", (roomName: string) => {
        socket.join(roomName);
        console.log(`Socket ${socket.id} joined ${roomName}`);
      });

      socket.on("message", ({ room, message, username }) => {
        const data = { message, username };
        socket.to(room).emit("message", data);
      });

      socket.on("disconnect", () => {
        console.log("user disconnected:", socket.id);
        delete users[socket.id];
      });

      function generatePrivateRoom(u1: string, u2: string): string {
        return `private:${[u1, u2].sort().join("-")}`;
      }
    });
  }

  setupRoutes() {
    this.app.get("/", (req, res) => {
      res.sendFile(__dirname + "/index.html");
    });
  }
}

const app = new App();
app.listenServer();
