document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("goalsContainer");
  const input = document.getElementById("newGoalInput");
  const addBtn = document.getElementById("addGoalBtn");
  const today = new Date().toLocaleDateString();

  chrome.storage.local.get(["goals", "dailyChecks", "lastCheckIn"], (data) => {
    const goals = data.goals || [];
    let checks = data.dailyChecks || {};

    if (data.lastCheckIn !== today) {
      checks = {};
      chrome.storage.local.set({ dailyChecks: {}, lastCheckIn: today });
    }

    goals.forEach(goal => renderGoal(goal, checks[goal]));
  });

  addBtn.addEventListener("click", () => {
    const newGoal = input.value.trim();
    if (!newGoal) return;

    chrome.storage.local.get("goals", (data) => {
      const goals = data.goals || [];
      if (!goals.includes(newGoal)) {
        goals.push(newGoal);
        chrome.storage.local.set({ goals });
        renderGoal(newGoal, false);
        input.value = "";
      }
    });
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      addBtn.click();
    }
  });

  document.getElementById("toggleHistoryBtn").addEventListener("click", () => {
    const panel = document.getElementById("historyPanel");
    if (panel.style.display === "none") {
      panel.style.display = "block";
      loadHistory();
    } else {
      panel.style.display = "none";
    }
  });

  function renderGoal(goal, checked) {
    const label = document.createElement("label");
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.justifyContent = "space-between";
    label.style.background = "#f9f9f9";
    label.style.padding = "6px 10px";
    label.style.marginBottom = "8px";
    label.style.borderRadius = "6px";
    label.style.fontSize = "14px";

    const goalText = document.createElement("span");
    goalText.textContent = goal;
    goalText.style.flex = "1";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!checked;
    checkbox.style.marginRight = "8px";
    checkbox.dataset.goal = goal;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "❌";
    removeBtn.className = "remove-btn";
    removeBtn.dataset.goal = goal;
    removeBtn.style.fontSize = "16px";
    removeBtn.style.marginRight = "8px";

    const streakSpan = document.createElement("span");
    streakSpan.className = "streak";
    streakSpan.textContent = "🔥 0";

    chrome.storage.local.get("goalHistory", (data) => {
      const history = data.goalHistory || {};
      const streak = calculateStreak(history[goal] || []);
      streakSpan.textContent = `🔥 ${streak}`;
    });

    const rightSide = document.createElement("div");
    rightSide.style.display = "flex";
    rightSide.style.alignItems = "center";
    rightSide.appendChild(checkbox);
    rightSide.appendChild(removeBtn);
    rightSide.appendChild(streakSpan);

    label.appendChild(goalText);
    label.appendChild(rightSide);
    container.appendChild(label);

    checkbox.addEventListener("change", () => {
      chrome.storage.local.get(["dailyChecks", "goalHistory"], (data) => {
        const checks = data.dailyChecks || {};
        const history = data.goalHistory || {};
        const today = new Date().toLocaleDateString();

        checks[goal] = checkbox.checked;

        if (checkbox.checked) {
          history[goal] = history[goal] || [];
          if (!history[goal].includes(today)) {
            history[goal].push(today);
          }
        } else {
          if (history[goal]) {
            history[goal] = history[goal].filter(d => d !== today);
          }
        }

        chrome.storage.local.set({ dailyChecks: checks, goalHistory: history }, () => {
          const streak = calculateStreak(history[goal] || []);
          streakSpan.textContent = `🔥 ${streak}`;
        });
      });
    });

    removeBtn.addEventListener("click", () => {
      chrome.storage.local.get(["goals", "dailyChecks", "goalHistory"], (data) => {
        const newGoals = (data.goals || []).filter(g => g !== goal);
        const newChecks = data.dailyChecks || {};
        const newHistory = data.goalHistory || {};
        delete newChecks[goal];
        delete newHistory[goal];

        chrome.storage.local.set({
          goals: newGoals,
          dailyChecks: newChecks,
          goalHistory: newHistory
        }, () => {
          label.remove();
        });
      });
    });
  }

  function calculateStreak(datesArray) {
    if (!datesArray || datesArray.length === 0) return 0;

    const sorted = datesArray.map(d => new Date(d)).sort((a, b) => b - a);
    let streak = 0;
    let today = new Date();

    for (let i = 0; i < sorted.length; i++) {
      const date = sorted[i];
      const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));
      if (diffDays === 0 || diffDays === streak) {
        streak++;
        today.setDate(today.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  function loadHistory() {
  const panel = document.getElementById("historyPanel");
  panel.innerHTML = "<strong>History</strong><br/><br/>";

  chrome.storage.local.get(["goalHistory", "goals"], (data) => {
    const history = data.goalHistory || {};
    const allGoals = data.goals || [];
    const dateMap = {};

    // Build date-to-goals map
    for (const goal in history) {
      history[goal].forEach(date => {
        if (!dateMap[date]) dateMap[date] = {};
        dateMap[date][goal] = true;
      });
    }

    // Sort dates descending
    const sortedDates = Object.keys(dateMap).sort((a, b) => new Date(b) - new Date(a));

    // Render history by date
    sortedDates.forEach(date => {
      panel.innerHTML += `<strong>${date}</strong><ul>`;
      allGoals.forEach(goal => {
        const isChecked = dateMap[date][goal];
        panel.innerHTML += `<li>${isChecked ? "✅" : "❌"} ${goal}</li>`;
      });
      panel.innerHTML += `</ul>`;
    });
  });
}
});
