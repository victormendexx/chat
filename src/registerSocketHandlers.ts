import { Socket, Server } from "socket.io";
import { getGeralMessages, sendMessage } from "./dynamo";

const users = new Map<string, string>(); // socket.id => username
const createdRooms = new Set<string>(); // nomes únicos das salas privadas

export function registerSocketHandlers(io: Server, socket: Socket) {
  socket.on("newUser", async (usernameRaw: string) => {
    const username = usernameRaw.trim().toLowerCase();

    const usernameAlreadyExists = Array.from(users.values()).includes(username);
    if (usernameAlreadyExists) {
      socket.emit("username-taken");
      return;
    }

    const messagesGeral = await getGeralMessages();
    socket.emit("load-geral-messages", messagesGeral);

    users.set(socket.id, username);
    socket.join("Geral");

    console.log(`🟢 Usuário conectado: ${username} (${socket.id})`);

    // Atualiza todos com os usuários online
    io.emit("onlineUsers", Array.from(users.values()));

    // Envia todas as salas privadas possíveis (sem entrar nelas)
    for (const [otherId, otherUsername] of users.entries()) {
      if (otherId === socket.id) continue;

      const roomName = `privado:${[username, otherUsername].sort().join("-")}`;

      const otherSocket = io.sockets.sockets.get(otherId);
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
    console.log(`💬 ${username} → [${room}]: ${message}`);

    const responseCode = await sendMessage({
      room,
      text: message,
      sender: username,
    });

    if (responseCode === 200) {
      socket.to(room).emit("message", { message, username });
    } else {
      console.error("❌ Falha ao salvar mensagem no DynamoDB");
    }
  });

  socket.on("init-private-room", ({ user1, user2 }) => {
    const normalized1 = user1.trim().toLowerCase();
    const normalized2 = user2.trim().toLowerCase();

    const roomName = `privado:${[normalized1, normalized2].sort().join("-")}`;

    if (!createdRooms.has(roomName)) {
      createdRooms.add(roomName);
      console.log(`🛠️ Sala privada criada: ${roomName}`);
    }

    socket.join(roomName);
  });

  socket.on("disconnect", () => {
    const disconnectedUsername = users.get(socket.id);
    console.log(`🔴 Usuário desconectado: ${disconnectedUsername}`);
    users.delete(socket.id);
    io.emit("onlineUsers", Array.from(users.values()));
  });
}
