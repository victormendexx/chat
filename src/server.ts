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
      console.log("✅ Server running at: http://localhost:3000")
    );
  }

  listenSocket() {
    const users = new Map<string, string>(); // socket.id => username
    const createdRooms = new Set<string>(); // nomes únicos das salas privadas

    this.io.on("connection", (socket) => {
      socket.on("newUser", async (usernameRaw: string) => {
        const username = usernameRaw.trim().toLowerCase();

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

        console.log(`🟢 Usuário conectado: ${username} (${socket.id})`);

        // Atualiza todos com os usuários online
        this.io.emit("onlineUsers", Array.from(users.values()));

        // Envia todas as salas privadas possíveis (mas ainda não conectadas)
        const userList = Array.from(users.entries());
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
        const normalized1 = user1.trim().toLowerCase();
        const normalized2 = user2.trim().toLowerCase();

        const roomName = `privado:${[normalized1, normalized2]
          .sort()
          .join("-")}`;

        if (!createdRooms.has(roomName)) {
          createdRooms.add(roomName);
          console.log(`🛠️ Sala privada criada: ${roomName}`);
        }

        socket.join(roomName);
      });

      socket.on("message", ({ room, message, username }) => {
        console.log(`💬 ${username} → [${room}]: ${message}`);
        socket.to(room).emit("message", { message, username });
      });

      socket.on("disconnect", () => {
        const disconnectedUsername = users.get(socket.id);
        console.log(`🔴 Usuário desconectado: ${disconnectedUsername}`);
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
