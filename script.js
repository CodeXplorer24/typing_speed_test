const quoteDisplayElement = document.getElementById('quote-display');
const quoteInputElement = document.getElementById('quote-input');
const timerElement = document.getElementById('timer');
const wpmElement = document.getElementById('wpm');
const accuracyElement = document.getElementById('accuracy');
const restartButton = document.getElementById('restart-btn');
const historyList = document.getElementById('history-list');

const chartCanvas = document.getElementById('history-chart');
let historyChartInstance;

const RANDOM_QUOTE_API_URL = 'https://random-word-api.herokuapp.com/word?number=15';
const STORAGE_KEY = 'typingTestHistory';

let timer;
let timeElapsed = 0;
let totalErrors = 0;
let currentQuote = '';
let isTestActive = false;


let allQuoteSpans = []; 
let currentIndex = 0; 


function getRandomQuote() {
    return fetch(RANDOM_QUOTE_API_URL)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (data && Array.isArray(data) && data.length > 0) { 
                return data.join(' '); // Joins all sentences
            } else {
                throw new Error('Invalid quote data received.');
            }
        })
        .catch(error => {
            console.error("Error fetching quote:", error);
            return "Error: Could not fetch quote. The API might be down.";
        });
}


async function renderNewQuote() {
    try {
        currentQuote = await getRandomQuote();
        quoteDisplayElement.innerHTML = ''; 
        allQuoteSpans = []; // Clear the span array

        if (!currentQuote) {
            quoteDisplayElement.innerText = "Could not load quote. Please restart.";
            return;
        }
        
        if (currentQuote.startsWith("Error:")) {
            quoteDisplayElement.innerText = currentQuote;
            return;
        }

        
        currentQuote.split('').forEach(char => {
            const charSpan = document.createElement('span');
            charSpan.innerText = char;
            quoteDisplayElement.appendChild(charSpan);
            allQuoteSpans.push(charSpan); // Add to our array
        });
        
        
        updateCursor();

    } catch (error) {
        console.error("Error rendering new quote:", error);
        quoteDisplayElement.innerText = "An error occurred. Please restart.";
    }
}


function startTimer() {
    isTestActive = true;
    timeElapsed = 0;
    timerElement.innerText = 0;

    timer = setInterval(() => {
        if (!isTestActive) return;
        timeElapsed++;
        timerElement.innerText = timeElapsed;
        updateWPM();
    }, 1000);
}


function handleKeyDown(e) {
    
    quoteInputElement.focus();

    if (!isTestActive && currentQuote && !currentQuote.startsWith("Error:")) {
        startTimer();
    }
    if (!isTestActive) return;

    const key = e.key;

    // Handle Backspace
    if (key === 'Backspace') {
        e.preventDefault(); // Stop browser from going back
        if (currentIndex > 0) {
            // Remove cursor from current, move to previous
            updateCursor(true); // 'true' indicates a backspace
            currentIndex--;
            // If the char we are moving back *to* was incorrect, decrement totalErrors
            if (allQuoteSpans[currentIndex].classList.contains('incorrect')) {
                totalErrors--;
            }
            // Clear the styling of the char we are moving back to
            allQuoteSpans[currentIndex].classList.remove('correct', 'incorrect');
        }
    } 
    
    else if (key.length === 1) { 
        e.preventDefault(); // Stop key from being typed into hidden input

        // Check if the typed key matches the quote
        if (key === allQuoteSpans[currentIndex].innerText) {
            allQuoteSpans[currentIndex].classList.add('correct');
            allQuoteSpans[currentIndex].classList.remove('incorrect');
        } else {
            allQuoteSpans[currentIndex].classList.add('incorrect');
            allQuoteSpans[currentIndex].classList.remove('correct');
            totalErrors++; // Increment errors
        }
        
        currentIndex++; // Move to the next character
    }

    // Update the visual cursor
    updateCursor();
    
    // Update real-time stats
    updateAccuracy();
    updateWPM();

    // Check for test completion
    if (currentIndex === allQuoteSpans.length) {
        endTest();
    }
}

// --- NEW FUNCTION: Manages the cursor class ---
function updateCursor(isBackspace = false) {
    // Remove cursor from all spans first
    allQuoteSpans.forEach(span => span.classList.remove('cursor'));

    // If we're at the end, don't show a cursor
    if (currentIndex >= allQuoteSpans.length) {
        return;
    }

    // Add cursor to the current span
    allQuoteSpans[currentIndex].classList.add('cursor');
}

// --- NEW FUNCTION: Separate Accuracy update ---
function updateAccuracy() {
    if (currentIndex === 0) {
        accuracyElement.innerText = '0%';
        return;
    }
    // Accuracy = ( (Total Typed - Errors) / Total Typed ) * 100
    let correctCharacters = Math.max(0, currentIndex - totalErrors);
    let accuracy = (correctCharacters / currentIndex) * 100;
    accuracyElement.innerText = `${Math.round(accuracy)}%`;
}

// This function calculates real-time WPM
function updateWPM() {
    if (timeElapsed === 0) {
        wpmElement.innerText = '0';
        return;
    }
    // WPM = ( (Total Correct Chars / 5) / Time in Minutes )
    let correctCharacters = Math.max(0, currentIndex - totalErrors);
    const wpm = (correctCharacters / 5) / (timeElapsed / 60);
    wpmElement.innerText = Math.round(wpm);
}

// This function calculates WPM based on *final* numbers
function calculateFinalWPM() {
    if (timeElapsed === 0) return 0;
    let correctCharacters = Math.max(0, currentIndex - totalErrors);
    const wpm = (correctCharacters / 5) / (timeElapsed / 60);
    return Math.round(wpm);
}

// Function to end the test
function endTest() {
    isTestActive = false;
    clearInterval(timer); 

    const finalWPM = calculateFinalWPM();
    wpmElement.innerText = finalWPM;

    let finalAccuracy = 0;
    if (currentIndex > 0) {
        let correctCharacters = Math.max(0, currentIndex - totalErrors);
        finalAccuracy = (correctCharacters / currentIndex) * 100;
        accuracyElement.innerText = `${Math.round(finalAccuracy)}%`;
    } else {
        accuracyElement.innerText = '0%';
    }

    saveScore(finalWPM, Math.round(finalAccuracy));
    displayHistory(); 
}

// Function to reset the test
function resetTest() {
    clearInterval(timer);
    isTestActive = false;
    timeElapsed = 0;
    totalErrors = 0;
    currentIndex = 0; // Reset index
    currentQuote = '';
    
    timerElement.innerText = 0; 
    wpmElement.innerText = '0';
    accuracyElement.innerText = '0%';
    
    quoteDisplayElement.innerText = 'Loading new quote...';
    quoteInputElement.value = ''; // Clear hidden input

    displayHistory();

    renderNewQuote().then(() => {
        if (!quoteDisplayElement.innerText.startsWith("Error:")) {
            quoteInputElement.disabled = false;
            quoteInputElement.focus(); // Focus the hidden input
            updateCursor(); // Set cursor to the first letter
        }
    });
}

// --- History and Chart Functions (Unchanged) ---
function loadHistory() {
    const historyString = localStorage.getItem(STORAGE_KEY) || '[]';
    return JSON.parse(historyString);
}
function saveScore(wpm, accuracy) {
    const history = loadHistory();
    const newScore = { wpm, accuracy, timestamp: new Date().toLocaleString() };
    history.unshift(newScore);
    if (history.length > 10) history.pop();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}
function displayHistory() {
    const history = loadHistory();
    historyList.innerHTML = '';
    if (history.length === 0) {
        historyList.innerHTML = '<li>No scores yet. Complete a test!</li>';
    } else {
        history.forEach(score => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${score.timestamp}</span>
                <span><strong>WPM:</strong> ${score.wpm} | <strong>Acc:</strong> ${score.accuracy}%</span>
            `;
            historyList.appendChild(li);
        });
    }
    renderHistoryChart(history);
}
function renderHistoryChart(history) {
    if (!chartCanvas) return;
    if (historyChartInstance) historyChartInstance.destroy();
    const reversedHistory = [...history].reverse();
    const labels = reversedHistory.map(score => score.timestamp.split(',')[0]);
    const wpmData = reversedHistory.map(score => score.wpm);
    const accuracyData = reversedHistory.map(score => score.accuracy);
    const ctx = chartCanvas.getContext('2d');
    historyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'WPM',
                    data: wpmData,
                    borderColor: '#e2b714',
                    backgroundColor: '#e2b71440',
                    tension: 0.1,
                    yAxisID: 'y'
                },
                {
                    label: 'Accuracy (%)',
                    data: accuracyData,
                    borderColor: '#d1d0c5',
                    backgroundColor: '#d1d0c540',
                    tension: 0.1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: '#646669' }, grid: { color: '#444' } },
                y: {
                    type: 'linear',
                    position: 'left',
                    ticks: { color: '#e2b714' },
                    grid: { color: '#444' },
                    title: { display: true, text: 'WPM', color: '#e2b714' }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    min: 0,
                    max: 100,
                    ticks: { color: '#d1d0c5' },
                    grid: { display: false },
                    title: { display: true, text: 'Accuracy (%)', color: '#d1d0c5' }
                }
            },
            plugins: { legend: { labels: { color: '#d1d0c5' } } }
        }
    });
}

// --- EVENT LISTENERS ---
// Listen for keydown on the whole document
document.addEventListener('keydown', handleKeyDown);

// We also add a click listener to the quote display
// This ensures that if the user clicks away and clicks back,
// the hidden input regains focus, and they can keep typing.
quoteDisplayElement.addEventListener('click', () => {
    quoteInputElement.focus();
});

restartButton.addEventListener('click', resetTest);

// Initialize the test
resetTest();