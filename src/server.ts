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
      console.log("user connected =>", socket.id);

      socket.on("newUser", (username: string) => {
        users.set(socket.id, username);
        this.io.emit("onlineUsers", Array.from(users.values()));
      });

      socket.on("message", (msg) => {
        console.log("chegou mensagem:", msg);
        socket.broadcast.emit("message", msg);
      });

      socket.on("disconnect", () => {
        users.delete(socket.id);
        this.io.emit("onlineUsers", Array.from(users.values()));
      });
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
