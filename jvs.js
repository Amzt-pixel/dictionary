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
let loopMode = 0;
let isSearchActive = false;
let stepNumber = 1;
let resultsVisible = false;
let prevHoldTimer = null;
let nextHoldTimer = null;
let csvName = null;
let wordSetsCount = 123;
const csvColumnLimit = 5; //CSV column limit
const HOLD_DURATION = 1000; // 1 second
// Add this near your other constants (around line 11)
// Add these with your other variables
const STEP_OPTIONS = {
  '1': [1, 3, 10, 25, 100, 500],
  '0': [1, 3, 10, 25]
};
let pendingViewMode = null;  // Temporary storage until saved
let pendingStepNumber = null;
let pendingLoopMode = null;
  let wordMeaningMode = 0;
let pendingWordMeaningMode = null;

let clickOnWord = 0;
let pendingClickOnWord = null;

let searchByMeaning = 0;
let pendingSearchByMeaning = null;


// Initialize app
window.onload = async () => {
  await loadCSVList();
  checkInputs();
  initSearch ();
  initStepSelector();// Enable Start button if defaults are valid
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

//document.getElementById("infoButton").addEventListener("click", showMetadata);//

document.getElementById("viewMode").addEventListener("change", (e) => {
    viewWordsMode = parseInt(e.target.value);
});


//Menu Visibility
document.getElementById("showMenuBtn").addEventListener("click", function () {
  document.getElementById("mainScreen").style.display = "none";
  document.getElementById("menuScreen").style.display = "block";
});

document.getElementById("closeMenuBtn").addEventListener("click", function () {
  document.getElementById("menuScreen").style.display = "none";
  document.getElementById("mainScreen").style.display = "block";
});


//Popup Meta

document.getElementById("infoButton").addEventListener("click", () => {
  document.getElementById("infoPopup").style.display = "block";
  document.getElementById("metaOverlay").style.display = "block";
  showMetadata();
});

document.getElementById("closeInfo").addEventListener("click", () => {
  document.getElementById("infoPopup").style.display = "none";
  document.getElementById("metaOverlay").style.display = "none";
});

//Popup Form
document.getElementById("openFormBtn").addEventListener("click", () => {
  document.getElementById("formPopup").style.display = "block";
  document.getElementById("formOverlay").style.display = "block";
});

document.getElementById("closeFormBtn").addEventListener("click", () => {
  document.getElementById("formPopup").style.display = "none";
  document.getElementById("formOverlay").style.display = "none";
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

// Tab button logic
document.getElementById('tab1').addEventListener('click', () => {
  document.querySelectorAll('.tabBtn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('tab1').classList.add('active');
  viewRootWords();
});

document.getElementById('tab2').addEventListener('click', () => {
  document.querySelectorAll('.tabBtn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('tab2').classList.add('active');
  viewWordMeanings();
});

document.getElementById('tab3').addEventListener('click', () => {
  document.querySelectorAll('.tabBtn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('tab3').classList.add('active');
  viewNotedWords();
});

document.getElementById("savePopup").addEventListener("click", () => {
  // Only save if there are pending changes
  if (pendingViewMode !== null) {
    viewWordsMode = pendingViewMode;
    pendingViewMode = null;

    if (pendingStepNumber === null) {
      stepNumber = 1; // Force default to 1
      document.getElementById("stepSelector").value = 1; // Update UI
    }
  }
  
  if (pendingStepNumber !== null) {
    stepNumber = pendingStepNumber;
    pendingStepNumber = null;
  }
  if (pendingLoopMode !== null) {
    loopMode = pendingLoopMode;
    pendingLoopMode = null;
  }

  if (pendingWordMeaningMode !== null) {
    wordMeaningMode = pendingWordMeaningMode;
    pendingWordMeaningMode = null;
  }

  if (pendingClickOnWord !== null) {
    clickOnWord = pendingClickOnWord;
    pendingClickOnWord = null;
  }

  if (pendingSearchByMeaning !== null) {
    searchByMeaning = pendingSearchByMeaning;
    pendingSearchByMeaning = null;
  }
displayWord();
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
  viewRootWords();
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
    const currentWordStr = studyList[currentIndex];
    const currentWordData = csvData.find(item => item.word === currentWordStr);
    if (!currentWordData) {
      alert("Current word not found in CSV data!");
      return;
    }

    const currentRootIndex = rootWordList.findIndex(rootObj =>
      Math.abs(rootObj.numId) === Math.abs(currentWordData.id)
    );
    if (currentRootIndex === -1) {
      alert("Current word has no root word!");
      return;
    }

    let targetRootIndex = currentRootIndex - stepNumber;
    
    // Handle wrap-around or error
    if (targetRootIndex < 0) {
      if (loopMode === 0) {
        alert(`Cannot step back ${stepNumber} root words - reached beginning!`);
        return;
      }
      targetRootIndex = rootWordList.length + (targetRootIndex % rootWordList.length);
    }

    const matchId = rootWordList[targetRootIndex].numId;
    let foundIndex = -1;

    // Search backward from current position (or from end if wrapped)
    const startIndex = targetRootIndex > currentRootIndex ? studyList.length - 1 : currentIndex - 1;
    for (let i = startIndex; i >= 0; i--) {
      const wordData = csvData.find(item => item.word === studyList[i]);
      if (wordData && Math.abs(wordData.id) === Math.abs(matchId)) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex === -1) {
      alert("No matching word found!");
      return;
    }
    currentIndex = foundIndex;
  } 
  else {
    // Simple list navigation
    if (currentIndex - stepNumber < 0) {
      if (loopMode === 0) {
        alert("Reduce step");
        return;
      }
      currentIndex = studyList.length + (currentIndex - stepNumber) % studyList.length;
    } else {
      currentIndex -= stepNumber;
    }
  }

  wordsSeen++;
  displayWord(); // Single call at the end
}

function nextWord() {
  if (viewWordsMode === 0) {
    const currentWordStr = studyList[currentIndex];
    const currentWordData = csvData.find(item => item.word === currentWordStr);
    if (!currentWordData) {
      alert("Current word not found in CSV data!");
      return;
    }

    const currentRootIndex = rootWordList.findIndex(rootObj => 
      Math.abs(rootObj.numId) === Math.abs(currentWordData.id)
    );
    if (currentRootIndex === -1) {
      alert("Current word has no root word!");
      return;
    }

    const targetRootIndex = currentRootIndex + stepNumber;
    
    // Handle wrap-around or error
    if (targetRootIndex >= rootWordList.length) {
      if (loopMode === 0) {
        alert(`Cannot step ${stepNumber} root words - reached end!`);
        return;
      }
      targetRootIndex %= rootWordList.length; // Wrap around
    }

    const matchId = rootWordList[targetRootIndex].numId;
    let foundIndex = -1;

    // Search forward from current position (or from start if wrapped)
    const startIndex = targetRootIndex < currentRootIndex ? 0 : currentIndex + 1;
    for (let i = startIndex; i < studyList.length; i++) {
      const wordData = csvData.find(item => item.word === studyList[i]);
      if (wordData && Math.abs(wordData.id) === Math.abs(matchId)) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex === -1) {
      alert("No matching word found!");
      return;
    }
    currentIndex = foundIndex;
  } 
  else {
    // Simple list navigation
    if (currentIndex + stepNumber >= studyList.length) {
      if (loopMode === 0) {
        alert("Reduce step");
        return;
      }
      currentIndex = (currentIndex + stepNumber) % studyList.length;
    } else {
      currentIndex += stepNumber;
    }
  }

  wordsSeen++;
  displayWord(); // Single call at the end
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
  const viewModeSelect = document.getElementById("viewMode");

  function updateStepOptions(viewMode) {
    const options = STEP_OPTIONS[viewMode];
    stepSelector.innerHTML = options.map(value => 
      `<option value="${value}">${value}</option>`
    ).join('');
  }

  // Initialize with current viewWordsMode (1 by default)
  updateStepOptions(viewWordsMode.toString());
  stepSelector.value = stepNumber; // Set to current stepNumber

  // Handle viewMode changes
  const viewModeToggle = document.getElementById("viewMode");

// Set initial state: unchecked = 1, checked = 0
viewModeToggle.checked = (viewWordsMode === 0);

// Update on toggle
viewModeToggle.addEventListener("change", (e) => {
  pendingViewMode = e.target.checked ? 0 : 1;
  updateStepOptions(pendingViewMode.toString());
});

  // Handle step changes
  stepSelector.addEventListener("change", (e) => {
    pendingStepNumber = parseInt(e.target.value);
  });

const loopModeToggle = document.getElementById("loopMode");
loopModeToggle.checked = (loopMode === 1);

loopModeToggle.addEventListener("change", (e) => {
  pendingLoopMode = e.target.checked ? 1 : 0;
});

// Set initial toggle states
document.getElementById("wordMeaningMode").checked = (wordMeaningMode === 1);
document.getElementById("clickOnWord").checked = (clickOnWord === 1);
document.getElementById("searchByMeaning").checked = (searchByMeaning === 1);

// Event listeners to store pending changes
document.getElementById("wordMeaningMode").addEventListener("change", (e) => {
  pendingWordMeaningMode = e.target.checked ? 1 : 0;
});
document.getElementById("clickOnWord").addEventListener("change", (e) => {
  pendingClickOnWord = e.target.checked ? 1 : 0;
});
document.getElementById("searchByMeaning").addEventListener("change", (e) => {
  pendingSearchByMeaning = e.target.checked ? 1 : 0;
});
}
/*
function initSearch() {
  let holdTimer = null;
  const holdDuration = 1000; // 1 second

  const toggleSearch = () => {
    if (!resultsVisible) {
      const term = searchInput.value.trim();
      if (term.length < 3) {
        alert("Search Inactive!\n" +
      "Press and Hold to see Search Guide\n\n" +
      `Meaning Search: ${searchByMeaning === 1 ? "ON" : "OFF"}`);
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
*/
function initSearch() {
  let holdTimer = null;
  const holdDuration = 1000; // 1 second

  const searchButton = document.getElementById("clearSearch");
  const searchInput = document.getElementById("wordSearch");
  const searchIcon = searchButton.querySelector("svg");

  const setIcon = (mode) => {
    searchIcon.innerHTML = mode === "close"
      ? `<line x1="18" y1="6" x2="6" y2="18"/>
         <line x1="6" y1="6" x2="18" y2="18"/>`
      : `<circle cx="11" cy="11" r="8"/>
         <line x1="21" y1="21" x2="16.65" y2="16.65"/>`;
  };

  const toggleSearch = () => {
    if (!resultsVisible) {
      const term = searchInput.value.trim();
      if (term.length < 3) {
     /*   alert("Search Inactive!\n" +
          "Press and Hold to see Search Guide\n\n" +
          `Meaning Search: ${searchByMeaning === 1 ? "ON" : "OFF"}`); */
        document.getElementById("infoPopup").style.display = "block";
  document.getElementById("metaOverlay").style.display = "block";
        return;
      }

      isSearchActive = true;
      handleSearch({ target: { value: term }, type: "manual" });

      searchInput.addEventListener("input", handleSearch);
      setIcon("close");
      resultsVisible = true;
    } else {
      clearSearch();
      searchInput.removeEventListener("input", handleSearch);
      setIcon("search");
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

  // Touch events
  searchButton.addEventListener('touchstart', startHold);
  searchButton.addEventListener('touchend', cancelHold);
  searchButton.addEventListener('touchcancel', cancelHold);

  // Click handler
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


  const idMatch = term.match(/^\{(\d+)\}$/);
  const letterMatch = term.match(/^\{([a-z])\}$/i);
  //Id Match
  if (idMatch) {
    const idNum = parseInt(idMatch[1]);
    if (idNum > 0 && idNum <= studyList.length) {
      const word = studyList[idNum - 1];
      document.getElementById("wordsLocated").innerHTML =
        `<div class="search-result-item" data-val="${word}">${word}(#${idNum})</div>`;
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
     /* document.getElementById("wordsFound").innerHTML = matchingWords
        .map(word => `<div class="search-result-item">${word}</div>`)
        .join("");*/
      const wordsFoundHeader = document.querySelector("#wordsFoundSection h4");
  wordsFoundHeader.textContent = `Words Found (${matchingWords.length})`;
  
  document.getElementById("wordsFound").innerHTML = matchingWords.map((word, index) => `
    <div class="search-result-item" data-val="${word}">
      <span class="result-number">${index + 1}.</span>
      <span class="result-word">${word}</span>
    </div>
  `).join('');
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
  //Search by Meaning
// NEW MEANING MATCH BLOCK GOES HERE — after id/letter checks
if (searchByMeaning === 1) {
  const matchedByMeaning = csvData.filter(item =>
    item.extra1 && item.extra1.toLowerCase().includes(term)
  );

  if (matchedByMeaning.length > 0) {
    const meaningHeader = document.querySelector("#meaningMatchSection h4");
    meaningHeader.textContent = `Meaning Matches (${matchedByMeaning.length})`;

    document.getElementById("meaningMatches").innerHTML = matchedByMeaning.map((item, index) => `
      <div class="search-result-item" data-val="${item.word}">
        <span class="result-number">${index + 1}.</span>
        <span class="result-word">${item.word}</span>: ${item.extra1}
      </div>
    `).join('');

    document.getElementById("meaningMatchSection").classList.remove("hidden");
    document.getElementById("searchResults").classList.remove("hidden");
    document.getElementById("clearSearch").classList.remove("hidden");

    searchResultClick();
    return;
  } else {
    noResultsMessage.classList.remove("hidden");
  }
} else{

  exactMatchSection.classList.toggle("hidden", !exactMatch);
  closeMatchesSection.classList.toggle("hidden", closeMatches.length === 0);
  
  if (exactMatch) {
    exactMatchDiv.innerHTML = `<div class="search-result-item" data-val="${exactMatch}">${exactMatch}</div>`;
  }

  if (closeMatches.length > 0) {
    /*closeMatchesDiv.innerHTML = closeMatches
      .map(word => `<div class="search-result-item">${word}</div>`)
      .join("");*/
    const closeMatchesHeader = document.querySelector("#closeMatchesSection h4");
  closeMatchesHeader.textContent = `Close Matches (${closeMatches.length})`;
  
  closeMatchesDiv.innerHTML = closeMatches.map((word, index) => `
    <div class="search-result-item" data-val="${word}">
      <span class="result-number">${index + 1}.</span>
      <span class="result-word">${word}</span>
    </div>
  `).join('');
  } else if (!exactMatch && !idMatch && !letterMatch) {
    noResultsMessage.classList.remove("hidden");
  }
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
      // const selectedWord = item.textContent.replace(/\(#\d+\)/g, "").trim();
     const selectedWord = item.dataset.val;
      
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
  document.getElementById("meaningMatchSection").classList.add("hidden");

  document.getElementById("meaningMatches").innerHTML = "";
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
  document.getElementById("meaningMatchSection").classList.add("hidden");
document.getElementById("meaningMatches").innerHTML = "";
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
/*
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
*/
  const synDisplay = document.getElementById("synDisplay");
const synCard = synDisplay.closest(".word-card");

if (synonyms.size > 0) {
  document.getElementById("synLabel").textContent = `Synonyms (${synonyms.size}) :`;
  synDisplay.innerHTML = [...synonyms].map(syn =>
    `<button class="word-button synonym">${syn}</button>`
  ).join(" ");
  synCard?.classList.remove("hidden");
} else {
  synDisplay.innerHTML = '';
  synCard?.classList.add("hidden");
}
const antDisplay = document.getElementById("antDisplay");
const antCard = antDisplay.closest(".word-card");

if (antonyms.size > 0) {
  document.getElementById("antLabel").textContent = `Antonyms (${antonyms.size}) :`;
  antDisplay.innerHTML = [...antonyms].map(ant =>
    `<button class="word-button antonym">${ant}</button>`
  ).join(" ");
  antCard?.classList.remove("hidden");
} else {
  antDisplay.innerHTML = '';
  antCard?.classList.add("hidden");
}
  //Meaning part
const meaningDiv = document.getElementById("meaningWord");
const wordCard = document.querySelector(".word-card .meaningDiv")?.parentNode;

// Use pendingWordMeaningMode if available, otherwise use current wordMeaningMode
const currentMode = pendingWordMeaningMode !== null ? pendingWordMeaningMode : wordMeaningMode;

if (currentMode === 1) {
  const wordEntries = csvData.filter(item => item.word === word);
  const displayEntry = wordEntries.find(item => item.extra1 || item.extra2);
  
  if (displayEntry && (displayEntry.extra1 || displayEntry.extra2)) {
    let meaningHTML = '<div class="meaning-content">';
    
    if (displayEntry.extra1) {
      meaningHTML += `
        <div class="meaning-section">
          <span class="meaning-header">Meaning (1):</span>
          <span class="meaning-text">${displayEntry.extra1}</span>
        </div>`;
    }
    if (displayEntry.extra2) {
      meaningHTML += `
        <div class="example-section">
          <span class="example-header">Example (1):</span>
          <span class="example-text">${displayEntry.extra2}</span>
        </div>`;
    }
    
    meaningHTML += '</div>';
    meaningDiv.innerHTML = meaningHTML;
    wordCard?.classList.remove("hidden");
    } else {
  meaningDiv.innerHTML = '';
  wordCard?.classList.add("hidden");
}
} else {
  meaningDiv.innerHTML = '';
  wordCard?.classList.add("hidden");
}
  //Optional Click on Word function
  document.querySelectorAll('.word-button').forEach(button => {
  if (clickOnWord === 1) {
    button.addEventListener('click', (e) => {
      const clickedWord = e.target.textContent;
      if (studyList.includes(clickedWord)) {
        currentIndex = studyList.indexOf(clickedWord);
        wordsSeen++;
        displayWord();
      } else {
        alert("No word was found!");
      }
    });
  }
});
}
/*
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
*/
function showMetadata() {
  const rootStatus = rootWordList.length === 0 ? "Empty" : "Loaded";
  
  // Update each metric in its corresponding <p> element
  document.getElementById('metadata-wordset').textContent = `Word Set: ${csvName}`;
  document.getElementById('metadata-mode').textContent = `View Order: ${selectedMode}`;
  document.getElementById('metadata-root-count').textContent = `Root Words: ${wordSetsCount}`;
  document.getElementById('metadata-total-words').textContent = `Total Words: ${studyList.length}`;
  document.getElementById('metadata-words-seen').textContent = `Words Seen: ${wordsSeen}`;
  document.getElementById('metadata-root-status').textContent = `Root Word List: ${rootStatus}`;
  document.getElementById('metadata-root-seen').textContent = `Rootwords Seen: ${seenRootWord.length}`;
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
// Tab content functions

// Updated viewRootWords function (mirroring search results structure)
/*function viewRootWords() {
  const contentArea = document.getElementById('contentArea');
  
  // Clear previous content
  contentArea.innerHTML = `
    <div id="rootWordsSection" class="root-section">
      <div id="rootWordsList"></div>
    </div>
  `;

  // Populate root words list
  const rootWordsList = document.getElementById('rootWordsList');
  rootWordsList.innerHTML = rootWordList.map(item =>
    `<div class="root-word-result" data-word="${item.word}">
      ${item.word} <span class="root-id">– ${item.numId}</span>
    </div>`
  ).join('');

  // Add click handlers (same pattern as search results)
  document.querySelectorAll('.root-word-result').forEach(item => {
    item.addEventListener('click', function() {
      const selectedWord = this.dataset.word;
      const index = studyList.indexOf(selectedWord);
      
      if (index !== -1) {
        currentIndex = index;
        wordsSeen++;
        displayWord();
        document.getElementById("menuScreen").style.display = "none";
  document.getElementById("mainScreen").style.display = "block";
      } else {
        alert("Word not found in current study list");
      }
    });
  });
}
function viewWordMeanings() {
  const contentArea = document.getElementById('contentArea');
  
  // Filter words that have a 3rd column (extra1)
  const wordsWithMeanings = csvData.filter(item => item.extra1);

  // Create container with matching structure
  contentArea.innerHTML = `
    <div id="wordMeaningsSection" class="meanings-section">
      <h3>Words with Definitions</h3>
      <div id="wordMeaningsList"></div>
    </div>
  `;

  const meaningsList = document.getElementById('wordMeaningsList');

  if (wordsWithMeanings.length > 0) {
    // Populate meanings list if words found
    meaningsList.innerHTML = wordsWithMeanings.map(item =>
      `<div class="meaning-result" data-word="${item.word}">
        <strong>${item.word}</strong>: ${item.extra1}
      </div>`
    ).join('');

    // Add click handlers
    document.querySelectorAll('.meaning-result').forEach(item => {
      item.addEventListener('click', function() {
        const selectedWord = this.dataset.word;
        const index = studyList.indexOf(selectedWord);
        
        if (index !== -1) {
          currentIndex = index;
          wordsSeen++;
          displayWord();
          showScreen("study");
        } else {
          alert("Word not found in current study list");
        }
      });
    });
  } else {
    // Display message when no words with definitions found
    meaningsList.innerHTML = `
      <div class="no-meanings-message">
        No Words with Definitions
      </div>
    `;
  }
}
*/
function viewRootWords() {
  const contentArea = document.getElementById('contentArea');
  
  contentArea.innerHTML = `
    <div id="rootWordsSection" class="root-section">
      <h3>Root Words (${rootWordList.length})</h3>
      <div id="rootWordsList"></div>
    </div>
  `;

  const rootWordsList = document.getElementById('rootWordsList');
  
  if (rootWordList.length > 0) {
    rootWordsList.innerHTML = rootWordList.map((item, index) => `
  <div class="root-word-result" data-word="${item.word}">
    <span class="result-number">${index + 1}.</span>
    <span class="result-word">${item.word}</span>
  </div>
`).join('');
    document.querySelectorAll('.root-word-result').forEach(item => {
      item.addEventListener('click', function() {
        const selectedWord = this.dataset.word;
        const index = studyList.indexOf(selectedWord);
        
        if (index !== -1) {
          currentIndex = index;
          wordsSeen++;
          displayWord();
          showScreen("study");
        } else {
          alert("Word not found in current study list");
        }
      });
    });
  } else {
    rootWordsList.innerHTML = '<div class="no-results-message">No Root Words Found</div>';
  }
}
function viewWordMeanings() {
  const contentArea = document.getElementById('contentArea');
  const wordsWithMeanings = csvData.filter(item => item.extra1);

  contentArea.innerHTML = `
    <div id="wordMeaningsSection" class="meanings-section">
      <h3>Words with Definitions (${wordsWithMeanings.length})</h3>
      <div id="wordMeaningsList"></div>
    </div>
  `;

  const meaningsList = document.getElementById('wordMeaningsList');

  if (wordsWithMeanings.length > 0) {
    meaningsList.innerHTML = wordsWithMeanings.map((item, index) => `
  <div class="meaning-result" data-word="${item.word}">
    <span class="result-number">${index + 1}.</span>
    <span class="result-word">${item.word}</span>: ${item.extra1}
  </div>
`).join('');

    document.querySelectorAll('.meaning-result').forEach(item => {
      item.addEventListener('click', function() {
        const selectedWord = this.dataset.word;
        const index = studyList.indexOf(selectedWord);
        
        if (index !== -1) {
          currentIndex = index;
          wordsSeen++;
          displayWord();
          showScreen("study");
        } else {
          alert("Word not found in current study list");
        }
      });
    });
  } else {
    meaningsList.innerHTML = '<div class="no-results-message">No Words with Definitions</div>';
  }
}
function viewNotedWords() {
  const contentArea = document.getElementById('contentArea');
  
  // Filter words with value = 1 in 5th column (extra3)
  const notedWords = csvData.filter(item => item.extra3 === "1");

  contentArea.innerHTML = `
    <div id="notedWordsSection" class="noted-section">
      <h3>Noted Words (${notedWords.length})</h3>
      <div id="notedWordsList"></div>
    </div>
  `;

  const notedList = document.getElementById('notedWordsList');

  if (notedWords.length > 0) {
    notedList.innerHTML = notedWords.map((item, index) => {
      // Use extra1 (3rd column) if available, otherwise show word only
      const noteContent = item.extra1 ? `${item.word}: ${item.extra1}` : item.word;
      return `
        <div class="noted-result" data-word="${item.word}">
          <span class="result-number">${index + 1}.</span>
          <span class="result-word">${noteContent}</span>
        </div>`;
    }).join('');

    // Add click handlers (same as other views)
    document.querySelectorAll('.noted-result').forEach(item => {
      item.addEventListener('click', function() {
        const selectedWord = this.dataset.word;
        const index = studyList.indexOf(selectedWord);
        
        if (index !== -1) {
          currentIndex = index;
          wordsSeen++;
          displayWord();
          showScreen("study");
        } else {
          alert("Word not found in current study list");
        }
      });
    });
  } else {
    notedList.innerHTML = '<div class="no-results-message">No Noted Words Found</div>';
  }
}
