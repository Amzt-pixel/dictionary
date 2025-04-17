let csvData = [];
let selectedCSVUrl = "";
let selectedMode = "alphabetic";
let studyList = [];
let currentIndex = 0;
let wordsSeen = 0;
let startTime = null;
let timerInterval;
// Save the original startSession before modifying it
const originalStartSession = startSession;
// Initialize app
window.onload = async () => {
  await loadCSVList();
  checkInputs(); // Enable Start button if defaults are valid
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
document.getElementById("clearSearchBtn").addEventListener("click", () => {
  document.getElementById("mainSearchBar").value = "";
  document.getElementById("mainSearchResults").classList.add("hidden");
});


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
document.getElementById("mainSearchBar").addEventListener("input", searchWords);
  showScreen("study");
  displayWord();
}

// Override startSession (now with access to the original)
startSession = function () {
  originalStartSession(); // ✅ Now works!
  generateNavigationMenu();
  document.getElementById("mainSearchBar").addEventListener("input", searchWords);
  document.getElementById("closeBtn").addEventListener("click", toggleMenu);
  document.getElementById("menuContainer").classList.add("hidden");
};

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

// =============================
// Navigation + Search Features
// =============================

function gotoWord(index) {
  currentIndex = index;
  wordsSeen++;
  displayWord();
}

// Group words in studyList by starting letter
function groupWordsByLetter(list) {
  const groups = {};
  list.forEach((word, index) => {
    const firstLetter = word[0].toUpperCase();
    if (!groups[firstLetter]) groups[firstLetter] = [];
    groups[firstLetter].push({ word, index });
  });
  return groups;
}

function generateNavigationMenu() {
  const navContainer = document.getElementById("navMenu");
  navContainer.innerHTML = "";

  const grouped = groupWordsByLetter(studyList);
  const sortedLetters = Object.keys(grouped).sort();

  sortedLetters.forEach(letter => {
    const letterItem = document.createElement("div");
    letterItem.className = "navLetter";
    letterItem.textContent = letter;

    const submenu = document.createElement("div");
    submenu.className = "submenu";

    grouped[letter].forEach(({ word, index }) => {
      const wordItem = document.createElement("div");
      wordItem.className = "navWord";
      wordItem.textContent = word;
      wordItem.onclick = () => gotoWord(index);
      submenu.appendChild(wordItem);
    });

    letterItem.onclick = () => {
      submenu.classList.toggle("visible");
    };

    letterItem.appendChild(submenu);
    navContainer.appendChild(letterItem);
  });
}

function searchWords() {
  //const input = document.getElementById("searchBar").value.toLowerCase();
  const input = document.getElementById("mainSearchBar").value.toLowerCase(); // Use mainSearchBar
  const resultDiv = document.getElementById("mainSearchResults"); // Use mainSearchResults
  const exactMatches = [];
  const containingMatches = [];

  studyList.forEach((word, index) => {
    const lowerWord = word.toLowerCase();
    if (lowerWord === input) {
      exactMatches.push({ word, index });
    } else if (lowerWord.includes(input)) {
      containingMatches.push({ word, index });
    }
  });

  exactMatches.sort((a, b) => a.word.localeCompare(b.word));
  containingMatches.sort((a, b) => a.word.localeCompare(b.word));

  displaySearchResults(exactMatches, containingMatches);
}

function displaySearchResults(exact, contains) {
  const resultDiv = document.getElementById("mainSearchResults");
  resultDiv.innerHTML = "";

  // Show/hide based on results
  if (exact.length + contains.length > 0) {
    resultDiv.classList.remove("hidden");
  } else {
    resultDiv.classList.add("hidden");
  }
  // ... rest of your code ...
  const section = (title, items) => {
    if (items.length === 0) return;
    const group = document.createElement("div");
    group.innerHTML = `<strong>${title}</strong>`;
    items.forEach(({ word, index }) => {
      const item = document.createElement("div");
      item.className = "searchItem";
      item.textContent = word;
      item.onclick = () => gotoWord(index);
      group.appendChild(item);
    });
    resultDiv.appendChild(group);
  };

  section("Exact Matches", exact);
  section("Containing Matches", contains);
}

function toggleMenu() {
  const menu = document.getElementById("menuContainer");
  menu.classList.toggle("hidden");
}

// Hook into your startSession function
const originalStartSession = startSession;
startSession = function () {
  originalStartSession(); // preserve existing logic
  generateNavigationMenu();
  document.getElementById("searchBar").addEventListener("input", searchWords);
  document.getElementById("closeBtn").addEventListener("click", toggleMenu);
  document.getElementById("menuContainer").classList.remove("hidden");
};
