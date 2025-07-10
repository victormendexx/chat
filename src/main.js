const socket = io();
const messagesUl = document.getElementById("messages");
const input = document.getElementById("input");
const form = document.getElementById("form");

let username = "";
let currentRoom = "Geral";
const roomSelect = document.getElementById("room-select");
const roomName = document.getElementById("room-name");
const roomStatus = document.getElementById("room-status");

const onlineUsers = new Set(); // Para verificar se um usuário está online
const privateRooms = new Map(); // roomName => otherUser

// Prompt de login
while (!username.trim()) {
  username = prompt("Digite seu nome de usuário:");
}
username = username.trim().toLowerCase();
socket.emit("newUser", username);

socket.on("username-taken", () => {
  alert("⚠️ Nome de usuário já está em uso. Escolha outro.");
  location.reload();
});

socket.emit("load-room-messages", currentRoom);

// Atualiza a lista de usuários online
socket.on("onlineUsers", (userList) => {
  onlineUsers.clear();
  userList.forEach((user) => {
    onlineUsers.add(user.trim().toLowerCase()); // 🔧 NORMALIZA
  });

  updateRoomStatus();

  Array.from(roomSelect.options).forEach((option) => {
    const room = option.value;

    if (room === "Geral") {
      option.textContent = "⚪️ Geral"; // ❌ Sem emoji
      return;
    }

    const otherUser = getOtherUserFromRoom(room);
    if (!otherUser) return;

    const isOnline = onlineUsers.has(otherUser);
    const statusEmoji = isOnline ? "🟢" : "🔴";
    option.textContent = `${statusEmoji} ${otherUser}`;
  });
});

// Recebe mensagem em tempo real
socket.on("message", (data) => {
  addMessage(data, false);
});

// Mensagens da sala Geral
socket.on("load-geral-messages", (mensagens) => {
  if (currentRoom !== "Geral") return;

  messagesUl.innerHTML = "";
  mensagens.forEach((msg) => {
    addMessage(
      {
        username: msg.sender,
        message: msg.msg,
        timestamp: msg.timestamp * 1000,
      },
      msg.sender === username
    );
  });
});

// Mensagens de qualquer sala
socket.on("load-room-messages", ({ room, messages }) => {
  if (room !== currentRoom) return;

  messagesUl.innerHTML = "";
  messages.forEach((msg) => {
    addMessage(
      {
        username: msg.sender,
        message: msg.msg,
        timestamp: msg.timestamp * 1000,
      },
      msg.sender === username
    );
  });
});

// Nova sala privada detectada
socket.on("new-private-room", (roomName) => {
  const otherUser = getOtherUserFromRoom(roomName);

  if (otherUser && !privateRooms.has(roomName)) {
    privateRooms.set(roomName, otherUser);
    addRoomToSelect(roomName, otherUser);

    if (currentRoom === roomName) {
      updateRoomStatus();
    }
  }
});

// Formulário de envio
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value.trim()) {
    socket.emit("message", {
      username,
      message: input.value.trim(),
      room: currentRoom,
      timeStamp: new Date().toISOString(),
    });
    addMessage({ username, message: input.value.trim() }, true);
    input.value = "";
  }
});

// Troca de sala
roomSelect.addEventListener("change", () => {
  const roomNameSelected = roomSelect.value;
  if (!roomNameSelected || roomNameSelected === currentRoom) return;

  currentRoom = roomNameSelected;
  socket.emit("join-room", currentRoom);

  const label = getRoomLabel(currentRoom);
  roomName.textContent = label;

  updateRoomStatus();

  messagesUl.innerHTML = "";
  roomSelect.selectedIndex = 0;

  // 👉 Busca mensagens da nova sala
  socket.emit("load-room-messages", currentRoom);
});

// Inicializa dropdown com sala Geral
addRoomToSelect("Geral", "Geral");

function addRoomToSelect(roomName, displayLabel) {
  if (roomSelect.querySelector(`option[value="${roomName}"]`)) return;

  let label = displayLabel;

  if (roomName !== "Geral") {
    const isOnline = onlineUsers.has(displayLabel.trim().toLowerCase());
    const statusEmoji = isOnline ? "🟢" : "🔴";
    label = `${statusEmoji} ${displayLabel}`;
  } else {
    const statusEmoji = "⚪️";
    label = `${statusEmoji} ${displayLabel}`;
  }

  const option = document.createElement("option");
  option.value = roomName;
  option.textContent = label;
  roomSelect.appendChild(option);
}

function addMessage(data, isMine) {
  const li = document.createElement("li");

  const name = document.createElement("span");
  name.textContent = isMine ? "Você" : data.username || "Desconhecido";
  name.style.fontSize = "0.75rem";
  name.style.fontWeight = "bold";
  name.style.opacity = "0.7";
  name.style.display = "block";
  name.style.marginBottom = "2px";

  const msg = document.createElement("div");
  msg.textContent = data.message;

  const time = document.createElement("div");
  time.style.fontSize = "0.7rem";
  time.style.opacity = "0.6";
  time.style.marginTop = "4px";
  time.textContent = formatTime(data.timestamp || new Date().toISOString());
  time.style.textAlign = "right";

  li.appendChild(name);
  li.appendChild(msg);
  li.appendChild(time);

  if (isMine) li.classList.add("my-message");
  messagesUl.appendChild(li);

  messagesUl.scrollTop = messagesUl.scrollHeight;
}

function formatTime(timestamp) {
  const date =
    typeof timestamp === "number" ? new Date(timestamp) : new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function getOtherUserFromRoom(roomName) {
  if (!roomName.startsWith("privado:")) return null;

  const users = roomName
    .replace("privado:", "")
    .split("-")
    .map((u) => u.trim().toLowerCase());

  return users.find((u) => u !== username);
}

function getRoomLabel(roomName) {
  if (roomName === "Geral") return "Geral";
  const otherUser =
    privateRooms.get(roomName) || getOtherUserFromRoom(roomName);
  return otherUser || roomName;
}

function updateRoomStatus() {
  if (currentRoom === "Geral") {
    roomStatus.textContent = "";
    return;
  }

  const otherUser =
    privateRooms.get(currentRoom) || getOtherUserFromRoom(currentRoom);

  if (!otherUser) {
    roomStatus.textContent = "";
    return;
  }

  const isOnline = onlineUsers.has(otherUser);
  roomStatus.textContent = isOnline ? "🟢" : "🔴";
  roomStatus.style.color = isOnline ? "green" : "gray";
}
