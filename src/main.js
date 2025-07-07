const socket = io();
const message = document.getElementById("messages");
const input = document.getElementById("input");

let username = "";

while (!username.trim()) {
  username = prompt("Digite seu nome de usuário:");
}

socket.emit("newUser", username);

socket.on("onlineUsers", (userList) => {
  const container = document.getElementById("online-users");
  container.innerHTML = "";
  userList.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = user;
    container.appendChild(li);
  });
});

// a partir do momento que ele recebe acesso ao username ele carrega no banco as mensagens antigas com o username conectado
// lista todas as mensagens antigas

// Envia mensagem com o username
document.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value.trim()) {
    socket.emit("message", {
      username: username,
      message: input.value.trim(),
      timeStamp: new Date().toISOString(),
    });
    addMessage({ username, message: input.value.trim() }, true);
    input.value = "";
  }
});

// Recebe mensagens de outros usuários
socket.on("message", (data) => {
  addMessage(data, false);
});

// Renderiza mensagem no chat
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
  message.appendChild(li);

  //bagulho do scroll
  messages.scrollTop = messages.scrollHeight;
}

function formatTime(isoString) {
  const date = new Date(isoString);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}
