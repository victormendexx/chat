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
    const users = new Map<string, string>();

    this.io.on("connection", (socket) => {
      socket.on("newUser", (username: string) => {
        users.set(socket.id, username);
        socket.join("Geral");

        const userList = Array.from(users.entries());

        this.io.emit("onlineUsers", Array.from(users.values()));

        for (const [otherId, otherUsername] of userList) {
          if (otherId === socket.id) continue;

          // ✅ Nome determinístico da sala
          const roomName = `privado:${[username, otherUsername]
            .sort()
            .join("-")}`;

          const otherSocket = this.io.sockets.sockets.get(otherId);
          if (otherSocket) {
            otherSocket.emit("new-private-room", roomName);
          }

          // Também envia para o usuário atual
          socket.emit("new-private-room", roomName);
        }
      });

      socket.on("join-room", (roomName) => {
        // Remove socket de todas as salas, exceto da sala default do socket
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
        users.delete(socket.id);
        this.io.emit("onlineUsers", Array.from(users.values()));
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
