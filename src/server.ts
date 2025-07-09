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
    this.http.listen(3000, () =>
      console.log("server is running at: http://localhost:3000")
    );
  }

  listenSocket() {
    const users = new Map<string, string>();

    this.io.on("connection", (socket) => {
      socket.on("newUser", (username: string) => {
        const usernameAlreadyExists = Array.from(users.values()).includes(
          username
        );

        if (usernameAlreadyExists) {
          socket.emit("username-taken");
          return;
        }

        users.set(socket.id, username);
        socket.join("Geral");

        const userList = Array.from(users.entries());

        this.io.emit("onlineUsers", Array.from(users.values()));

        for (const [otherId, otherUsername] of userList) {
          if (otherId === socket.id) continue;

          const roomName = `privado:${[username, otherUsername]
            .sort()
            .join("-")}`;

          const otherSocket = this.io.sockets.sockets.get(otherId);
          if (otherSocket) {
            otherSocket.emit("new-private-room", roomName);
          }

          socket.emit("new-private-room", roomName);
        }
      });

      socket.on("join-room", (roomName) => {
        for (const room of socket.rooms) {
          if (room !== socket.id) {
            socket.leave(room);
          }
        }

        socket.join(roomName);
      });

      socket.on("message", ({ room, message, username }) => {
        socket.to(room).emit("message", { message, username });
      });

      socket.on("disconnect", () => {
        const disconnectedUsername = users.get(socket.id);
        users.delete(socket.id);

        // Atualiza a lista de usuários online
        this.io.emit("onlineUsers", Array.from(users.values()));

        if (!disconnectedUsername) return;

        // Gera nomes das salas privadas que envolvem o usuário desconectado
        const roomsToRemove = Array.from(users.values()).map(
          (otherUsername) =>
            `privado:${[disconnectedUsername, otherUsername].sort().join("-")}`
        );

        // Para cada usuário restante
        for (const [otherId, otherUsername] of users.entries()) {
          const otherSocket = this.io.sockets.sockets.get(otherId);

          if (otherSocket) {
            // Envia para remover as salas da UI do outro usuário
            otherSocket.emit("remove-private-rooms", roomsToRemove);

            // Força saída das salas afetadas
            for (const roomName of roomsToRemove) {
              if (otherSocket.rooms.has(roomName)) {
                otherSocket.leave(roomName);
                otherSocket.join("Geral");
                otherSocket.emit("force-join-geral");
              }
            }
          }
        }
      });
    });
  }

  setupRoutes() {
    this.app.use(express.static(__dirname));
    this.app.get("/", (req, res) => {
      res.sendFile(__dirname + "/index.html");
    });
  }
}

const app = new App();
app.listenServer();
