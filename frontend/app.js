const socket = io("/"); // su Railway o Render URL verrà automaticamente

let username = "";
let isAdmin = false;

function register() {
  username = document.getElementById("username").value.trim();
  const credits = parseInt(document.getElementById("credits").value) || 500;
  isAdmin = document.getElementById("isAdmin").checked;
  if (!username) return alert("Inserisci un nome utente");
  socket.emit("registerUser", { username, credits, admin: isAdmin });
  document.getElementById("registerScreen").style.display = "none";
  document.getElementById("mainScreen").style.display = "block";
  document.getElementById("welcome").textContent = "Benvenuto, " + username;
  if (isAdmin) document.getElementById("adminPanel").style.display = "block";
  else document.getElementById("bidBtn").style.display = "inline-block";
}

function startAuction() {
  const player = document.getElementById("newPlayer").value.trim();
  if (!player) return;
  socket.emit("startAuction", { user: username, player });
  document.getElementById("newPlayer").value = "";
}

function makeBid() { socket.emit("makeBid", { user: username }); }

socket.on("usersUpdate", (users) => {
  const ul = document.getElementById("usersList"); ul.innerHTML = "";
  Object.entries(users).forEach(([name,data])=>{
    const li = document.createElement("li");
    li.textContent = `${name}${data.admin?" (Admin)":""}: ${data.credits}`;
    if(name===username) li.style.color="lightgreen";
    ul.appendChild(li);
  });
});

socket.on("auctionStarted", ({ player, currentBid }) => {
  document.getElementById("playerName").textContent = player;
  document.getElementById("currentBid").textContent = "Offerta: " + currentBid;
  document.getElementById("highestBidder").textContent = "Ultimo offerente: Nessuno";
  document.getElementById("error").textContent = "";
});

socket.on("bidUpdate", ({ currentBid, highestBidder }) => {
  document.getElementById("currentBid").textContent = "Offerta: " + currentBid;
  document.getElementById("highestBidder").textContent = "Ultimo offerente: " + highestBidder;
  document.getElementById("error").textContent = "";
});

socket.on("countdownUpdate", t => document.getElementById("timeLeft").textContent = "Tempo: "+t+"s");
socket.on("bidRejected", ({reason}) => document.getElementById("error").textContent = reason);
socket.on("auctionEnded", ({player,winner,price})=>{
  alert(`${player} assegnato a ${winner||"nessuno"} per ${price} crediti`);
  document.getElementById("playerName").textContent="Nessuna asta in corso";
  document.getElementById("currentBid").textContent="Offerta: 0";
  document.getElementById("highestBidder").textContent="Ultimo offerente: Nessuno";
  document.getElementById("timeLeft").textContent="Tempo: 0s";
});
