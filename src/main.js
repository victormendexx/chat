const socket = io();
const messagesUl = document.getElementById("messages");
const input = document.getElementById("input");
const roomListUl = document.getElementById("room-list");

let currentRoom = "Geral";
let username = "";

while (!username.trim()) {
  username = prompt("Digite seu nome de usuário:");
}
socket.emit("newUser", username);

// Adiciona sala Geral logo de início
addRoomToList("Geral");
socket.emit("join-room", "Geral");

// Remove salas privadas da listagem e troca pra Geral se necessário
socket.on("remove-private-rooms", (roomsToRemove) => {
  roomsToRemove.forEach((roomName) => {
    const li = document.querySelector(`li[data-room="${roomName}"]`);
    if (li) li.remove();

    // Se estiver na sala que foi removida, volta para Geral
    if (currentRoom === roomName) {
      currentRoom = "Geral";
      document
        .querySelectorAll("#room-list li")
        .forEach((li) => li.classList.remove("active"));

      const geralLi = document.querySelector('li[data-room="Geral"]');
      if (geralLi) geralLi.classList.add("active");

      messagesUl.innerHTML = "";
    }
  });
});

// Força troca de sala para Geral (sem duplicar lógica)
socket.on("force-join-geral", () => {
  socket.emit("join-room", "Geral");
});

socket.on("onlineUsers", (userList) => {
  const container = document.getElementById("online-users");
  container.innerHTML = "";
  userList.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = user;
    container.appendChild(li);
  });
});

document.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value.trim()) {
    socket.emit("message", {
      room: currentRoom,
      username: username,
      message: input.value.trim(),
      timestamp: new Date().toISOString(),
    });
    addMessage(
      {
        username,
        message: input.value.trim(),
        timestamp: new Date().toISOString(),
      },
      true
    );
    input.value = "";
  }
});

socket.on("message", (data) => {
  addMessage(data, false);
});

socket.on("new-private-room", (roomName) => {
  addRoomToList(roomName);
});

socket.on("username-taken", () => {
  alert("Este nome de usuário já está em uso. Escolha outro.");
  promptUsername();
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

function addRoomToList(roomName) {
  if (document.querySelector(`li[data-room="${roomName}"]`)) return;

  const li = document.createElement("li");
  li.textContent = roomName;
  li.dataset.room = roomName;

  if (roomName === currentRoom) li.classList.add("active");

  li.onclick = () => {
    if (roomName === currentRoom) return;

    currentRoom = roomName;
    document
      .querySelectorAll("#room-list li")
      .forEach((li) => li.classList.remove("active"));
    li.classList.add("active");

    socket.emit("join-room", roomName);
    messagesUl.innerHTML = "";
  };

  document.getElementById("room-list").appendChild(li);
}

function promptUsername() {
  username = prompt("Digite seu nome de usuário:");
  if (!username || !username.trim()) {
    promptUsername(); // força preenchimento
    return;
  }
  socket.emit("newUser", username.trim());
}
