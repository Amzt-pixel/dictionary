let csvData = [];
let selectedCSVUrl = "";
let selectedMode = "Alphabetic";
let studyList = [];
let rootWordList = [];
let seenRootWord = [];
let currentIndex = 0;
let wordsSeen = 0;
let viewWordsMode = 1; //Default All words
let startTime = null;
let timerInterval;
let isSearchActive = false;
let stepNumber = 1;
let resultsVisible = false;
let prevHoldTimer = null;
let nextHoldTimer = null;
let csvName = null;
let wordSetsCount = 123;
const csvColumnLimit = 5; //CSV column limit
const HOLD_DURATION = 1000; // 1 second

// Initialize app
window.onload = async () => {
  await loadCSVList();
  checkInputs();// Enable Start button if defaults are valid
  initSearch ();
  initStepSelector();
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
document.getElementById("goHomeBtn").addEventListener("click", () => {
  location.reload();
});
document.getElementById("wordSearch").addEventListener("input", handleSearch);
const searchInput = document.getElementById("wordSearch");
const searchButton = document.querySelector(".searchBar-button");
document.getElementById("infoButton").addEventListener("click", showMetadata);
document.getElementById("viewMode").addEventListener("change", (e) => {
    viewWordsMode = parseInt(e.target.value);
});

//Popup Form
document.getElementById("openFormBtn").addEventListener("click", () => {
  document.getElementById("formPopup").style.display = "block";
  document.getElementById("overlay").style.display = "block";
});

document.getElementById("closeFormBtn").addEventListener("click", () => {
  document.getElementById("formPopup").style.display = "none";
  document.getElementById("overlay").style.display = "none";
});

document.getElementById("prevBtn").addEventListener("mousedown", startPrevHold);
document.getElementById("prevBtn").addEventListener("mouseup", clearPrevHold);
document.getElementById("prevBtn").addEventListener("mouseleave", clearPrevHold);
document.getElementById("prevBtn").addEventListener("touchstart", startPrevHold);
document.getElementById("prevBtn").addEventListener("touchend", clearPrevHold);
document.getElementById("prevBtn").addEventListener("touchcancel", clearPrevHold);

document.getElementById("nextBtn").addEventListener("mousedown", startNextHold);
document.getElementById("nextBtn").addEventListener("mouseup", clearNextHold);
document.getElementById("nextBtn").addEventListener("mouseleave", clearNextHold);
document.getElementById("nextBtn").addEventListener("touchstart", startNextHold);
document.getElementById("nextBtn").addEventListener("touchend", clearNextHold);
document.getElementById("nextBtn").addEventListener("touchcancel", clearNextHold);

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
      option.dataset.name = item.name; // Store the name as data attribute
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
/*
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
*/
async function loadCSV(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

    const text = await response.text();
    const rows = text.trim().split("\n").slice(1); // Skip header row

    // Parse and store in csvData
    csvData = rows.map((row, index) => {
      const columns = row.split(",").map(item => item.trim());
      
    /*  // Validate columns
      if (columns.length < 2) 
        throw new Error(`Row ${index + 1}: Must have at least 2 columns (word and id)`);
      if (columns.length > csvColumnLimit)
        throw new Error(`Row ${index + 1}: Exceeds maximum ${csvColumnLimit} columns`);
    */
      // Parse required fields
      const id = parseInt(columns[1]);
    /*  if (id !== null && isNaN(id)) {
        throw new Error(`Row ${index + 1}: "id" must be an integer or null`);
      }*/
      // Build the object
      const rowData = {
        word: columns[0],
        id: id,
      };

      // Add optional columns (3rd to 5th)
      for (let i = 2; i < columns.length; i++) {
        if (columns[i]) {  // Only add if non-empty
          rowData[`extra${i - 1}`] = columns[i];  // e.g., extra1, extra2, etc.
        }
      }

      return rowData;
    });

    if (csvData.length === 0) throw new Error("CSV is empty");
    console.log("CSV loaded successfully. Data:", csvData);
  } catch (err) {
    console.error("CSV load error:", err);
    csvData = [];  // Reset on error
    alert(`Error: ${err.message}`);
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
  if (mode === "Alphabetic") {
    return validWords.sort();
  } else if (mode === "Reverse") {
    return validWords.sort().reverse();
  } else {
    return shuffleArray(validWords);
  }
}

function startSession() {
  studyList = filterAndSortWords(selectedMode);
  currentIndex = 0;
  wordsSeen = 1;
  startTime = new Date();

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(updateClock, 1000);

  // Get the selected CSV name
  const csvSelector = document.getElementById("csvSelector");
  const selectedOption = csvSelector.options[csvSelector.selectedIndex];
  csvName = selectedOption.dataset.name || "Current List";

  // Calculate word sets
  wordSetsCount = calculateWordSets();
  rootWordList = getRootWords(studyList);
  showScreen("study");
  displayWord();
}

function getRootWords(list) {
  // 1. Initialize with default value (will be removed later)
  rootWordList = [
    { word: "January", numId: 0 }
  ];

  // 2. Process each word in studyList
  list.forEach(word => {
    // 3. Find matching word in csvData (using 'Word' and 'NumId')
    const wordData = csvData.find(item => item.word === word);
    if (!wordData) return; // Skip if word not found in CSV

    const currentNumId = wordData.id; 

    // 4. Check if equal/opposite numId exists
    const isDuplicate = rootWordList.some(item => 
      Math.abs(item.numId) === Math.abs(currentNumId)
    );

    // 5. Add if unique
    if (!isDuplicate) {
      rootWordList.push({
        word: word,       // Preserve original studyList word
        numId: currentNumId // From CSV's NumId
      });
    }
  });

  // 6. Remove default "January" entry
  rootWordList.shift();

  // 7. Return the filtered objects
  return rootWordList;
}
function calculateWordSets() {
  const uniqueIds = new Set();
  csvData.forEach(item => {
    uniqueIds.add(Math.abs(item.id)); // Use absolute value of IDs
  });
  return uniqueIds.size;
}

function prevWord() {
  if (viewWordsMode === 0) {
            // 1. Get current word (string from studyList)
    const currentWordStr = studyList[currentIndex];

    // 2. Find its NumId in csvData
    const currentWordData = csvData.find(item => item.word === currentWordStr);
    if (!currentWordData) {
      alert("Current word not found in CSV data!");
      return;
    }
    const currentNumId = currentWordData.id;

    // 3. Find matching root word (object with equal/opposite NumId)
    const currentRootIndex = rootWordList.findIndex(rootObj =>
      Math.abs(rootObj.numId) === Math.abs(currentNumId)
    );

    if (currentRootIndex === -1) {
      alert("Current word has no root word!");
      return;
    }

    // 4. Get the PREVIOUS root word's NumId (matchId)
    if (currentRootIndex === 0) {
      alert("At beginning of root words!");
      return;
    }
    const matchId = rootWordList[currentRootIndex - 1].numId;

    // 5. Find previous matching word in studyList
    let foundIndex = -1;
    for (let i = currentIndex - 1; i >= 0; i--) {
      const prevWordStr = studyList[i];
      const prevWordData = csvData.find(item => item.word === prevWordStr);
      if (!prevWordData) continue;

      if (Math.abs(prevWordData.id) === Math.abs(matchId)) {
        foundIndex = i;
        break;
      }
    }

    // 6. Handle result
    if (foundIndex === -1) {
      alert("No previous word in studyList matching with matchId!");
    } else {
      currentIndex = foundIndex;
      wordsSeen++;
      displayWord();
    }
  }
  else{
  if (currentIndex === 0) return;
  else if(currentIndex + 1 > stepNumber) {
    currentIndex=currentIndex - stepNumber;
  }
  else {
    alert("Reduce step");
    return;
  }
  wordsSeen++;
  displayWord();
  }
}

function nextWord() {
  if (viewWordsMode === 0) {
    // 1. Get current word (string from studyList)
    const currentWordStr = studyList[currentIndex];

    // 2. Find its NumId in csvData
    const currentWordData = csvData.find(item => item.word === currentWordStr);
    if (!currentWordData) {
      alert("Current word not found in CSV data!");
      return;
    }
    const currentNumId = currentWordData.id;

    // 3. Find matching root word (object with equal/opposite NumId)
    const currentRootIndex = rootWordList.findIndex(rootObj => 
      Math.abs(rootObj.numId) === Math.abs(currentNumId)
    );

    if (currentRootIndex === -1) {
      alert("Current word has no root word!");
      return;
    }

    // 4. Get next root word's NumId (matchId)
    if (currentRootIndex + 1 >= rootWordList.length) {
      alert("Reached end of root words!");
      return;
    }
    const matchId = rootWordList[currentRootIndex + 1].numId;

    // 5. Find next matching word in studyList
    let foundIndex = -1;
    for (let i = currentIndex + 1; i < studyList.length; i++) {
      const nextWordStr = studyList[i];
      const nextWordData = csvData.find(item => item.word === nextWordStr);
      if (!nextWordData) continue;

      if (Math.abs(nextWordData.id) === Math.abs(matchId)) {
        foundIndex = i;
        break;
      }
    }

    // 6. Handle result
    if (foundIndex === -1) {
      alert("No word in studyList matching with matchId!");
    } else {
      currentIndex = foundIndex;
      wordsSeen++;
      displayWord();
    }

  } else {
    // Original stepNumber logic
    if (currentIndex >= studyList.length - 1) {
      alert("All words studied!");
      return;
    }
    if (currentIndex + stepNumber > studyList.length - 1) {
      alert("Reduce step!");
      return;
    }
    currentIndex += stepNumber;
    wordsSeen++;
    displayWord();
  }
}

function completeSession() {
  const confirmQuit = confirm("Are you sure you want to quit?");
  if (!confirmQuit) return; // Exit if user cancels

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

function initStepSelector() {
  const stepSelector = document.getElementById("stepSelector");
  stepSelector.addEventListener("change", (e) => {
    stepNumber = parseInt(e.target.value);
    console.log("Step size changed to:", stepNumber); // For debugging
  });
}

function initSearch() {
  let holdTimer = null;
  const holdDuration = 1000; // 1 second

  const toggleSearch = () => {
    if (!resultsVisible) {
      const term = searchInput.value.trim();
      if (term.length < 3) {
        alert("Search Inactive!\n" +
          "Press and Hold for Help");
        return;
      }

      isSearchActive = true;
      handleSearch({ target: { value: term }, type: "manual" });

      searchInput.addEventListener("input", handleSearch);
      searchButton.textContent = "×";
      resultsVisible = true;
    } else {
      clearSearch();
      searchInput.removeEventListener("input", handleSearch);
      searchButton.textContent = "⌕";
      resultsVisible = false;
    }
  };

  const startHold = () => {
    if (holdTimer === null) {
      searchButton.classList.add("search-button-hold");
      holdTimer = setTimeout(() => {
        alert(
  "1. You must enter minimum 3 characters to initiate search.\n" +
  "2. Search by {ID} to view Word at ID-th position.\n" +
  "3. Search by {LETTER} to view Words starting with LETTER.\n" +
  "4. Adjust step value for Previous and Next from Step field (Default : 1).\n" +
  "5. Click on the Words to view them.\n" +
  "6. Click the Meta button to view Meta info of session."
);
        holdTimer = null;
        searchButton.classList.remove("search-button-hold");
      }, holdDuration);
    }
  };

  const cancelHold = () => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    searchButton.classList.remove("search-button-hold");
  };

  // Mouse events
  searchButton.addEventListener('mousedown', startHold);
  searchButton.addEventListener('mouseup', cancelHold);
  searchButton.addEventListener('mouseleave', cancelHold);

  // Touch events — DO NOT call preventDefault
  searchButton.addEventListener('touchstart', startHold);
  searchButton.addEventListener('touchend', cancelHold);
  searchButton.addEventListener('touchcancel', cancelHold);

  // Click handler (remains functional now)
  searchButton.addEventListener("click", toggleSearch);

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      toggleSearch();
    }
  });

  document.addEventListener("click", (e) => {
    if (
      resultsVisible &&
      searchInput.value.trim() === "" &&
      e.target !== searchInput &&
      !searchInput.contains(e.target)
    ) {
      toggleSearch();
    }
  });
}

function handleSearch(e) {
  if (!isSearchActive && e.type !== 'manual') return;

  if (!studyList || studyList.length === 0) {
    console.error("Study list not loaded!");
    return;
  }

  const term = e.target.value.trim().toLowerCase();
  if (!term) {
    clearSearch();
    return;
  }

  if (term.length < 3) {
        return;
  }

  const exactMatch = studyList.find(word => word.toLowerCase() === term);
  const closeMatches = studyList
    .filter(word => word.toLowerCase().includes(term) && word.toLowerCase() !== term)
    .sort();

  const exactMatchSection = document.getElementById("exactMatchSection");
  const closeMatchesSection = document.getElementById("closeMatchesSection");
  const exactMatchDiv = document.getElementById("exactMatch");
  const closeMatchesDiv = document.getElementById("closeMatches");
  const searchResults = document.getElementById("searchResults");
  const noResultsMessage = document.getElementById("noResultsMessage");

  noResultsMessage.classList.add("hidden");
  resetSearchSections();

  exactMatchSection.classList.toggle("hidden", !exactMatch);
  closeMatchesSection.classList.toggle("hidden", closeMatches.length === 0);


  const idMatch = term.match(/^\{(\d+)\}$/);
  const letterMatch = term.match(/^\{([a-z])\}$/i);
  //Id Match
  if (idMatch) {
    const idNum = parseInt(idMatch[1]);
    if (idNum > 0 && idNum <= studyList.length) {
      const word = studyList[idNum - 1];
      document.getElementById("wordsLocated").innerHTML =
        `<div class="search-result-item">${word}(#${idNum})</div>`;
      document.getElementById("wordsLocatedSection").classList.remove("hidden");
      searchResults.classList.remove("hidden");
      document.getElementById("clearSearch").classList.remove("hidden");
    }
    else {
      noResultsMessage.classList.remove("hidden");
    }
    searchResultClick();
    return;
  }
  // First letter search
  if (letterMatch) {
    const searchLetter = letterMatch[1].toUpperCase();
    const matchingWords = studyList
      .filter(word => word.charAt(0).toUpperCase() === searchLetter)
      .sort((a, b) => a.localeCompare(b));

    if (matchingWords.length > 0) {
      document.getElementById("wordsFound").innerHTML = matchingWords
        .map(word => `<div class="search-result-item">${word}</div>`)
        .join("");
      document.getElementById("wordsFoundSection").classList.remove("hidden");
      searchResults.classList.remove("hidden");
      document.getElementById("clearSearch").classList.remove("hidden");
    }
    else {
      noResultsMessage.classList.remove("hidden");
    }
    searchResultClick();
    return;
  }

  if (exactMatch) {
    exactMatchDiv.innerHTML = `<div class="search-result-item">${exactMatch}</div>`;
  }

  if (closeMatches.length > 0) {
    closeMatchesDiv.innerHTML = closeMatches
      .map(word => `<div class="search-result-item">${word}</div>`)
      .join("");
  } else if (!exactMatch && !idMatch && !letterMatch) {
    noResultsMessage.classList.remove("hidden");
  }
 //PREVENTS OLD CLOSE BUTTON FROM POPPING UP. 
   searchResults.classList.remove("hidden");
   document.getElementById("clearSearch").classList.remove("hidden");

  if (e.type === 'manual') isSearchActive = true;

  searchResultClick();
}


function searchResultClick() {
  document.querySelectorAll(".search-result-item").forEach(item => {
    item.addEventListener("click", () => {
       const selectedWord = item.textContent.replace(/\(#\d+\)/g, "").trim();// trim helps prevent whitespace bugs
      if (!studyList.includes(selectedWord)) {
        alert("Word not available in current session.");
        return;
      }
      currentIndex = studyList.indexOf(selectedWord);
      alert("Opened Searched Word!!");
      wordsSeen++;
      clearSearch();
      searchButton.textContent = "⌕";
      resultsVisible = false;
      isSearchActive = false;
      displayWord();
    });
  });
}

function resetSearchSections() {
  document.getElementById("wordsFoundSection").classList.add("hidden");
  document.getElementById("wordsLocatedSection").classList.add("hidden");
  document.getElementById("exactMatchSection").classList.add("hidden");
  document.getElementById("closeMatchesSection").classList.add("hidden");

  document.getElementById("exactMatch").innerHTML = "";
  document.getElementById("closeMatches").innerHTML = "";
  document.getElementById("wordsFound").innerHTML = "";
  document.getElementById("wordsLocated").innerHTML = "";
}

function clearSearch() {
  document.getElementById("wordSearch").value = "";
  document.getElementById("searchResults").classList.add("hidden");
  document.getElementById("noResultsMessage").classList.add("hidden");
  document.getElementById("exactMatch").innerHTML = "";
  document.getElementById("closeMatches").innerHTML = "";
  document.getElementById("wordsFound").innerHTML = "";
  document.getElementById("wordsLocated").innerHTML = "";
  document.getElementById("exactMatchSection").classList.add("hidden");
  document.getElementById("closeMatchesSection").classList.add("hidden");
  document.getElementById("wordsFoundSection").classList.add("hidden");
  document.getElementById("wordsLocatedSection").classList.add("hidden");
}

function countRootVisit(index) {
    const word = studyList[index];
    const entry = csvdata.find(e => e.word === word);
    if (!entry) return;

    const absId = Math.abs(entry.id);
    if (!seenRootWord.includes(absId)) {
        seenRootWord.push(absId);
    }
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
  //record Root Word Visit 
  // Track root word visit
  (function() {
    const entry = csvData.find(e => e.word === word);
    if (entry && typeof entry.id === "number") {
      const absId = Math.abs(entry.id);
      if (!seenRootWord.includes(absId)) {
        seenRootWord.push(absId);
      }
    }
  })();

  // Display word info
  document.getElementById("wordOrderDisplay").textContent = 
    `Word ${currentIndex + 1}:`;
  const wordDisplay = document.getElementById("wordDisplay");
  wordDisplay.innerHTML = `<span class="root-word">${word}</span>`;

  // Create styled synonym buttons
  document.getElementById("synLabel").textContent = 
    `Synonyms (${synonyms.size}) :`;
  const synDisplay = document.getElementById("synDisplay");
  synDisplay.innerHTML = synonyms.size > 0 
    ? [...synonyms].map(syn => 
        `<button class="word-button synonym">${syn}</button>`
      ).join(" ") 
    : '<span class="no-words">None</span>';

  // Create styled antonym buttons
  document.getElementById("antLabel").textContent = 
    `Antonyms (${antonyms.size}) :`;
  const antDisplay = document.getElementById("antDisplay");
  antDisplay.innerHTML = antonyms.size > 0 
    ? [...antonyms].map(ant => 
        `<button class="word-button antonym">${ant}</button>`
      ).join(" ") 
    : '<span class="no-words">None</span>';

  // Remove click handlers and add touch-and-hold (long-press) detection
  document.querySelectorAll('.word-button').forEach(button => {
    let pressTimer;

    // Start timer on touchstart
    button.addEventListener('touchstart', (e) => {
      const clickedWord = e.target.textContent;
      pressTimer = setTimeout(() => {
        if (studyList.includes(clickedWord)) {
          currentIndex = studyList.indexOf(clickedWord);
          wordsSeen++;
          displayWord();
        } else {
          alert("No word was found!");
        }
      }, 1000); // 1000ms = 1 second hold
    });

    // Cancel timer if touch ends early
    button.addEventListener('touchend', () => {
      clearTimeout(pressTimer);
    });

    // Also cancel if touch moves away (optional)
    button.addEventListener('touchmove', () => {
      clearTimeout(pressTimer);
    });
  });
}

function showMetadata() {
  const rootStatus = rootWordList.length === 0 ? "Empty" : "Loaded";
  alert(`Word Set: ${csvName} 
Mode: ${selectedMode} 
Root Words: ${wordSetsCount} 
Total Words: ${studyList.length} 
Words Seen: ${wordsSeen}
Root Word List: ${rootStatus}
Rootwords Seen: ${seenRootWord.length}`);
}

// Previous Button Hold Functions
function startPrevHold() {
  document.getElementById("prevBtn").classList.add("holding"); // Visual feedback
  prevHoldTimer = setTimeout(() => {
    const confirmFirst = confirm("Go to first question?");
    document.getElementById("prevBtn").classList.remove("holding"); // Reset
    if (confirmFirst) {
      currentIndex = 0;
      wordsSeen++;
      displayWord();
    }
  }, HOLD_DURATION);
}

function clearPrevHold() {
  document.getElementById("prevBtn").classList.remove("holding"); // Reset if released early
  if (prevHoldTimer) {
    clearTimeout(prevHoldTimer);
    prevHoldTimer = null;
  }
}

// Next Button Hold Functions
function startNextHold() {
  document.getElementById("nextBtn").classList.add("holding"); // Visual feedback
  nextHoldTimer = setTimeout(() => {
   // const confirmFinish = confirm("Are you sure you want to finish?");
    document.getElementById("nextBtn").classList.remove("holding"); // Reset
  //  if (confirmFinish) {
      completeSession();
  //  }
  }, HOLD_DURATION);
}

function clearNextHold() {
  document.getElementById("nextBtn").classList.remove("holding"); // Reset if released early
  if (nextHoldTimer) {
    clearTimeout(nextHoldTimer);
    nextHoldTimer = null;
  }
}
