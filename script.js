const quoteDisplayElement = document.getElementById("quote-display");
const quoteInputElement = document.getElementById("quote-input");
const timerElement = document.getElementById("timer");
const wpmElement = document.getElementById("wpm");
const accuracyElement = document.getElementById("accuracy");
const restartButton = document.getElementById("restart-btn");

const RANDOM_QUOTE_API_URL = "https://quotes.domiadi.com/api";

let timer;
let timeLimit = 60;
let timeElapsed = 0;
let totalErrors = 0;
let charactersTyped = 0;
let currentQuote = "";
let isTestActive = false;

function getRandomQuote() {
  return fetch(RANDOM_QUOTE_API_URL)
    .then((response) => {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    })
    .then((data) => {
      if (data && data.quote) {
        return data.quote;
      } else {
        throw new Error("Invalid quote data received.");
      }
    })
    .catch((error) => {
      console.error("Error fetching quote:", error);

      return "There was an error fetching the quote. Please restart the test.";
    });
}

async function renderNewQuote() {
  try {
    currentQuote = await getRandomQuote();
    quoteDisplayElement.innerHTML = "";

    if (!currentQuote) {
      quoteDisplayElement.innerText = "Could not load quote. Please restart.";
      return;
    }

    currentQuote.split("").forEach((char) => {
      const charSpan = document.createElement("span");
      charSpan.innerText = char;
      quoteDisplayElement.appendChild(charSpan);
    });

    quoteInputElement.value = null;
  } catch (error) {
    console.error("Error rendering new quote:", error);
    quoteDisplayElement.innerText = "An error occurred. Please restart.";
  }
}

function startTimer() {
  isTestActive = true;
  timerElement.innerText = timeLimit;
  timeElapsed = 0;

  timer = setInterval(() => {
    if (timeElapsed >= timeLimit) {
      endTest();
    } else {
      timeElapsed++;
      timerElement.innerText = timeLimit - timeElapsed;
    }
  }, 1000);
}

function processInput() {
  if (!isTestActive && currentQuote) {
    startTimer();
  }

  if (!isTestActive) return;

  charactersTyped++;
  const quoteArray = quoteDisplayElement.querySelectorAll("span");
  const valueArray = quoteInputElement.value.split("");
  let errors = 0;

  quoteArray.forEach((charSpan, index) => {
    const character = valueArray[index];

    if (character == null) {
      charSpan.classList.remove("correct");
      charSpan.classList.remove("incorrect");
    } else if (character === charSpan.innerText) {
      charSpan.classList.add("correct");
      charSpan.classList.remove("incorrect");
    } else {
      charSpan.classList.add("incorrect");
      charSpan.classList.remove("correct");
      errors++;
    }
  });

  totalErrors = errors;

  if (charactersTyped > 0) {
    let correctCharacters = charactersTyped - totalErrors;
    let accuracy = correctCharacters / charactersTyped*100;
    accuracyElement.innerText = `${Math.round(accuracy)}%`;
  } else {
    accuracyElement.innerText = "0%";
  }

  if (quoteInputElement.value.length === currentQuote.length) {
    endTest();
  }
}

function calculateWPM() {
  if (timeElapsed === 0) return 0;
  // 5 is the standard average word length
  const grossWPM = charactersTyped / 5 / (timeElapsed / 60);
  return Math.round(grossWPM);
}

function endTest() {
  isTestActive = false;
  clearInterval(timer);
  quoteInputElement.disabled = true;

  const wpm = calculateWPM();
  wpmElement.innerText = wpm;
}

function resetTest() {
  clearInterval(timer);
  isTestActive = false;
  timeElapsed = 0;
  totalErrors = 0;
  charactersTyped = 0;
  currentQuote = "";

  timerElement.innerText = timeLimit;
  wpmElement.innerText = "0";
  accuracyElement.innerText = "0%";

  quoteDisplayElement.innerText = "Loading new quote...";
  quoteInputElement.disabled = true;

  renderNewQuote().then(() => {
    quoteInputElement.disabled = false;
    quoteInputElement.value = "";
    quoteInputElement.focus();
  });
}

quoteInputElement.addEventListener("input", processInput);
restartButton.addEventListener("click", resetTest);

resetTest();
