const socket = io();
const messagesUl = document.getElementById("messages");
const input = document.getElementById("input");
const roomSelect = document.getElementById("room-select");

let currentRoom = "Geral";
let username = "";
let onlineUsers = [];

promptUsername();

function promptUsername() {
  while (!username.trim()) {
    username = prompt("Digite seu nome de usuário:");
  }
  socket.emit("newUser", username.trim());
}

// Inicialmente adiciona sala Geral e entra
addRoomToDropdown("Geral");
socket.emit("join-room", "Geral");
updateRoomHeader("Geral");

socket.on("onlineUsers", (userList) => {
  onlineUsers = userList;
  const container = document.getElementById("online-users");
  container.innerHTML = "";
  userList.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = user;
    container.appendChild(li);
  });

  updateRoomHeader(currentRoom);
});

document.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value.trim()) {
    const msg = {
      room: currentRoom,
      username: username,
      message: input.value.trim(),
      timestamp: new Date().toISOString(),
    };
    socket.emit("message", msg);
    addMessage(msg, true);
    input.value = "";
  }
});

socket.on("message", (data) => {
  addMessage(data, false);
});

socket.on("new-private-room", (roomName) => {
  addRoomToDropdown(roomName);
});

socket.on("username-taken", () => {
  alert("Este nome de usuário já está em uso. Escolha outro.");
  username = "";
  promptUsername();
});

// Quando troca de sala via dropdown
roomSelect.addEventListener("change", () => {
  const selectedRoom = roomSelect.value;
  if (selectedRoom === currentRoom) return;

  currentRoom = selectedRoom;
  socket.emit("join-room", selectedRoom);
  messagesUl.innerHTML = "";
  updateRoomHeader(selectedRoom);
});

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

function formatTime(isoString) {
  const date = new Date(isoString);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function addRoomToDropdown(roomName) {
  if (roomSelect.querySelector(`option[value="${roomName}"]`)) return;

  let displayName = roomName;
  if (roomName.startsWith("privado:")) {
    const [, userA, userB] = roomName.split(/[:\-]/);
    displayName = userA === username ? userB : userA;
  }

  const option = document.createElement("option");
  option.value = roomName;
  option.textContent = displayName;
  roomSelect.appendChild(option);
}

function updateRoomHeader(roomName) {
  const roomNameElement = document.getElementById("room-name");
  const roomStatusElement = document.getElementById("room-status");

  roomSelect.value = roomName;

  let displayName = roomName;
  if (roomName.startsWith("privado:")) {
    const [, userA, userB] = roomName.split(/[:\-]/);
    displayName = userA === username ? userB : userA;

    const isOnline = onlineUsers.includes(displayName);
    roomStatusElement.textContent = isOnline ? "🟢" : "🔴";
    roomStatusElement.className = isOnline ? "online" : "offline";
  } else {
    roomStatusElement.textContent = "";
    roomStatusElement.className = "";
  }

  roomNameElement.textContent = displayName;
}
