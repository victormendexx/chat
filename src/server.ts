import express, { Application } from "express";
import http from "http";
import { Server } from "socket.io";
import { getGeralMessages, sendMessage } from "./dynamo";
import { MessageDTO } from "./message";

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
    const createdRooms = new Set<string>();

    this.io.on("connection", (socket) => {
      socket.on("newUser", async (username: string) => {
        const usernameAlreadyExists = Array.from(users.values()).includes(
          username
        );

        const messagesGeral = await getGeralMessages();
        socket.emit("load-geral-messages", messagesGeral);

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

      socket.on("message", async ({ room, message, username }) => {
        let responseCode = await sendMessage({room, text: message, sender: username});
        if (responseCode === 200){
          socket.to(room).emit("message", { message, username });
        }
      });

      socket.on("init-private-room", ({ user1, user2 }) => {
        const roomName = `privado:${[user1, user2].sort().join("-")}`;

        if (!createdRooms.has(roomName)) {
          createdRooms.add(roomName);
          console.log(`🔧 Criando nova sala: ${roomName}`);
        }

        socket.join(roomName);
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
