import express, { Application } from "express";
import http from "http";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./registerSocketHandlers";

class App {
  private app: Application;
  private http: http.Server;
  private io: Server;

  constructor() {
    this.app = express();
    this.http = http.createServer(this.app);
    this.io = new Server(this.http);
    this.setupSocket();
    this.setupRoutes();
  }

  listenServer() {
    this.http.listen(3000, () =>
      console.log("✅ Server running at: http://localhost:3000")
    );
  }

  setupSocket() {
    this.io.on("connection", (socket) => {
      registerSocketHandlers(this.io, socket);
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
