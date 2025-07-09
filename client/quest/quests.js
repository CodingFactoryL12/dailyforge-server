document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("forgeToken");

  fetch("https://dailyforge-server.onrender.com/generate-quests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token })
  })
    .then(res => res.json())
    .then((quests) => {
      const list = document.getElementById("activeQuests");
      list.innerHTML = "";

      quests.forEach((q) => {
        const li = document.createElement("li");
        li.className = "quest-item";

        li.innerHTML = `
          <div class="quest-header">
            <span class="quest-title">${q.title}</span>
            <span class="quest-meta">
              <span class="xp-tag">+${q.xp} XP</span>
              <span class="time-tag">${q.duration}</span>
            </span>
          </div>
          <div class="quest-body">
            <p>${q.description}</p>
          </div>
        `;
        list.appendChild(li);
      });
    })
    .catch((err) => {
      console.error("Fehler beim Laden der Quests:", err);
    });
});
