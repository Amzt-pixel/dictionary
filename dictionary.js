let csvData = [];
let selectedCSVUrl = "";
let selectedMode = "alphabetic";
let studyList = [];
let currentIndex = 0;
let wordsSeen = 0;
let startTime = null;
let timerInterval;
let isSearchActive = false; // Track if search is in dynamic mode

// Initialize app
window.onload = async () => {
  await loadCSVList();
  checkInputs(); // Enable Start button if defaults are valid
  initSearch ();
};

// Event Listeners
document.getElementById("csvSelector").addEventListener("change", async (e) => {
  selectedCSVUrl = e.target.value;
  if (selectedCSVUrl) await loadCSV(selectedCSVUrl);
  checkInputs();
});

document.getElementById("topicSelector").addEventListener("change", (e) => {
  selectedMode = e.target.value;
  checkInputs();
});

document.getElementById("startBtn").addEventListener("click", startSession);
document.getElementById("nextBtn").addEventListener("click", nextWord);
document.getElementById("prevBtn").addEventListener("click", prevWord);
document.getElementById("completeBtn").addEventListener("click", completeSession);
document.getElementById("restartBtn").addEventListener("click", () => showScreen("study"));
document.getElementById("goHomeBtn").addEventListener("click", () => showScreen("setup"));
document.getElementById("wordSearch").addEventListener("input", handleSearch);
document.getElementById("clearSearch").addEventListener("click", clearSearch);

function checkInputs() {
  const csv = document.getElementById("csvSelector").value;
  const mode = document.getElementById("topicSelector").value;
  const startBtn = document.getElementById("startBtn");

  startBtn.disabled = !(csv && mode);
}


async function loadCSVList() {
  try {
    const response = await fetch("https://raw.githubusercontent.com/amzt-pixel/Vocabulary/main/csv-list.json");
    if (!response.ok) throw new Error("Failed to fetch CSV list");
    
    const list = await response.json();
    const select = document.getElementById("csvSelector");
    select.innerHTML = ""; // Clear existing options

    list.forEach((item) => {
      const option = new Option(item.name, item.url);
      select.add(option);
    });

    // Auto-select the first CSV and load it
    if (list.length > 0) {
      selectedCSVUrl = list[0].url;
      select.value = selectedCSVUrl;
      await loadCSV(selectedCSVUrl);
    }
  } catch (err) {
    console.error("CSV list load error:", err);
    alert("Error loading CSV list. Check console for details.");
  }
}

// Load and parse CSV data
async function loadCSV(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

    const text = await response.text();
    const rows = text.trim().split("\n").slice(1); // Skip header row

    csvData = rows.map((row) => {
      const [word, id] = row.split(",").map(item => item.trim());
      return { word, id: parseInt(id) };
    });

    if (csvData.length === 0) throw new Error("CSV is empty");
    console.log("CSV loaded successfully:", csvData.length, "words");
  } catch (err) {
    console.error("CSV load error:", err);
    csvData = []; // Reset to avoid stale data
    alert("Error loading CSV. Please try another file.");
  }
}

function filterAndSortWords(mode) {
  const wordMap = new Map();

  // Group words by IDs
  csvData.forEach(({ word, id }) => {
    if (!wordMap.has(word)) wordMap.set(word, []);
    wordMap.get(word).push(id);
  });

  // Filter valid words that have at least one synonym or antonym
  const validWords = [...wordMap.keys()].filter((word) => {
    const ids = wordMap.get(word);
    const synonyms = new Set();
    const antonyms = new Set();

    ids.forEach((id1) => {
      csvData.forEach(({ word: w2, id: id2 }) => {
        if (id1 === id2 && w2 !== word) synonyms.add(w2);
        if (id1 === -id2) antonyms.add(w2);
      });
    });

    return synonyms.size > 0 || antonyms.size > 0;
  });

  // Sort based on selected mode
  if (mode === "alphabetic") {
    return validWords.sort();
  } else if (mode === "reverse") {
    return validWords.sort().reverse();
  } else {
    return shuffleArray(validWords);
  }
}

function startSession() {
  studyList=filterAndSortWords(selectedMode); // create the studyList based on mode
  currentIndex = 0;
  wordsSeen = 1;
  startTime = new Date();

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(updateClock, 1000);

  showScreen("study");
  displayWord();
}

function displayWord() {
  const word = studyList[currentIndex];
  const ids = csvData.filter(item => item.word === word).map(item => item.id);

  const synonyms = new Set();
  const antonyms = new Set();

  ids.forEach(id1 => {
    csvData.forEach(({ word: w2, id: id2 }) => {
      if (id1 === id2 && w2 !== word) synonyms.add(w2);
      if (id1 === -id2) antonyms.add(w2);
    });
  });

  document.getElementById("wordDisplay").textContent = `Word ${currentIndex + 1}: ${word}`;
  document.getElementById("synDisplay").textContent = [...synonyms].join(", ") || "None";
  document.getElementById("antDisplay").textContent = [...antonyms].join(", ") || "None";

  document.getElementById("wordOrder").textContent = `Word ${currentIndex + 1}`;
  document.getElementById("wordTotal").textContent = `Total Words: ${studyList.length}`;
  document.getElementById("modeDisplay").textContent = `Mode: ${selectedMode}`;
  document.getElementById("questionCount").textContent = `Words Seen: ${wordsSeen}`;

  document.getElementById("prevBtn").disabled = currentIndex === 0;

  // Reset Next button if changed earlier
  document.getElementById("nextBtn").textContent = "Next";
  }


function prevWord() {
  if (currentIndex === 0) return;

  currentIndex--;
  wordsSeen++;
  displayWord();
}


function nextWord() {
  if (currentIndex === studyList.length - 1) {
    alert("All words studied!");
    document.getElementById("nextBtn").textContent = "Restart";
    document.getElementById("nextBtn").onclick = () => startSession();
    return;
  }

  currentIndex++;
  wordsSeen++;
  displayWord();
}

function completeSession() {
  clearInterval(timerInterval);
  const elapsed = Math.floor((new Date() - startTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  
  document.getElementById("sessionStats").textContent = 
    `You studied ${wordsSeen} words in ${mins}m ${secs}s.`;
  showScreen("complete");
}

function showScreen(screen) {
  document.querySelectorAll(".screen").forEach(el => el.classList.remove("visible"));
  document.getElementById(`${screen}Screen`).classList.add("visible");
}

function updateClock() {
  const elapsed = Math.floor((new Date() - startTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  document.getElementById("clock").textContent = `Time: ${mins}m ${secs}s`;
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
function initSearch() {
  const searchInput = document.getElementById("wordSearch");
  const searchButton = document.querySelector(".searchBar-button");
  const clearButton = document.getElementById("clearSearch");

  // Default state - button-triggered search
  searchButton.addEventListener("click", () => {
    const term = searchInput.value.trim();
    if (term.length < 3) {
      return; // Exit if too short
    }
    if (term) {
      isSearchActive = true;
      handleSearch({ target: { value: term } });
      // Switch to dynamic search after first trigger
      searchInput.addEventListener("input", handleSearch);
    }
  });

  // Clear button returns to default state
  clearButton.addEventListener("click", () => {
    clearSearch();
    isSearchActive = false;
    searchInput.removeEventListener("input", handleSearch);
  });

  // Optional: Enter key support
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchButton.click();
    }
  });
}
function handleSearch(e) {
  // Only proceed if in dynamic mode OR this is a manual trigger (added line)
  if (!isSearchActive && e.type !== 'manual') return;

  // Safeguard 1: Validate studyList (keep existing)
  if (!studyList || studyList.length === 0) {
    console.error("Study list not loaded!");
    return;
  }

  // Safeguard 2: Sanitize input (keep existing)
  const term = e.target.value.trim().toLowerCase();
  if (!term) {
    clearSearch();
    return;
  }

  // Safeguard 3: Minimum search length (keep existing)
  if (term.length < 3) {
    //alert("Please enter at least 3 characters.");
    return;
  }

  // Find matches (keep existing)
  const exactMatch = studyList.find(word => word.toLowerCase() === term);
  const closeMatches = studyList
    .filter(word => word.toLowerCase().includes(term) && word.toLowerCase() !== term)
    .sort();

  // Safeguard 4: Defensive UI updates (keep existing)
  const exactMatchSection = document.getElementById("exactMatchSection");
  const closeMatchesSection = document.getElementById("closeMatchesSection");
  const exactMatchDiv = document.getElementById("exactMatch");
  const closeMatchesDiv = document.getElementById("closeMatches");

  exactMatchDiv.innerHTML = "";
  closeMatchesDiv.innerHTML = "";

  exactMatchSection.classList.toggle("hidden", !exactMatch);
  closeMatchesSection.classList.toggle("hidden", closeMatches.length === 0);

  if (exactMatch) {
    exactMatchDiv.innerHTML = `<div class="search-result-item">${exactMatch}</div>`;
  }

  if (closeMatches.length > 0) {
    closeMatchesDiv.innerHTML = closeMatches
      .map(word => `<div class="search-result-item">${word}</div>`)
      .join("");
  }

  // Show results (keep existing)
  document.getElementById("searchResults").classList.remove("hidden");
  document.getElementById("clearSearch").classList.remove("hidden");

  // Activate dynamic mode after manual trigger (added line)
  if (e.type === 'manual') isSearchActive = true;

  // Safeguard 5: Secure click-jump (keep existing)
  document.querySelectorAll(".search-result-item").forEach(item => {
    item.addEventListener("click", () => {
      const selectedWord = item.textContent;
      if (!studyList.includes(selectedWord)) {
        alert("Word not available in current session.");
        return;
      }
      currentIndex = studyList.indexOf(selectedWord);
      displayWord();
      clearSearch();
    });
  });
}
function clearSearch() {
  document.getElementById("wordSearch").value = "";
  document.getElementById("searchResults").classList.add("hidden");
  document.getElementById("clearSearch").classList.add("hidden");
}
