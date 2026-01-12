// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const firebaseConfig = {
    apiKey: "AIzaSyC-D3ZdFb7qeafcbBXBKgjFNBqlD5TXjkQ",
    authDomain: "joko-cards.firebaseapp.com",
    databaseURL: "https://joko-cards-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "joko-cards",
    storageBucket: "joko-cards.firebasestorage.app",
    messagingSenderId: "588124186538",
    appId: "1:588124186538:web:2ec5a5f1b98e24608dadd3",
    measurementId: "G-J6RFQSCH1X"
};

// Initialize Firebase
let app, database;
try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// ============================================
// GAME STATE
// ============================================
let gameState = {
    player1Name: '',
    player2Name: '',
    player1Score: 0,
    player2Score: 0,
    player1Lives: 0,
    player2Lives: 0,
    player1Hits: 0,
    player2Hits: 0,
    gameMode: null, // 'time', 'hits', 'lives'
    gameModeValue: null, // duration in minutes, hit target, or lives count
    gameStarted: false,
    gameEnded: false,
    processedEvents: new Set(),
    eventListener: null,
    timerInterval: null,
    timeRemaining: 0, // in seconds
    soundQueue: [],
    isSpeaking: false,
    timeWarnings: { twoMin: false, oneMin: false },
    livesWarnings: { p1: { two: false, one: false }, p2: { two: false, one: false } }
};

// ============================================
// SOUND SYSTEM (Web Speech API)
// ============================================
const synth = window.speechSynthesis;

function speak(text, priority = false) {
    if (!synth) return;
    
    // Cancel current speech if priority
    if (priority && synth.speaking) {
        synth.cancel();
    }
    
    // Queue non-priority messages
    if (!priority && synth.speaking) {
        gameState.soundQueue.push(text);
        return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    utterance.onend = () => {
        gameState.isSpeaking = false;
        if (gameState.soundQueue.length > 0) {
            const nextText = gameState.soundQueue.shift();
            speak(nextText);
        }
    };
    
    utterance.onerror = () => {
        gameState.isSpeaking = false;
        if (gameState.soundQueue.length > 0) {
            const nextText = gameState.soundQueue.shift();
            speak(nextText);
        }
    };
    
    gameState.isSpeaking = true;
    synth.speak(utterance);
}

// ============================================
// DOM ELEMENTS
// ============================================
let setupScreen, modeSelectionScreen, gameScreen;
let player1NameInput, player2NameInput, continueBtn, resetBtn;
let player1NameDisplay, player2NameDisplay;
let player1ScoreDisplay, player2ScoreDisplay;
let player1Card, player2Card;
let player1LivesDisplay, player2LivesDisplay;
let hitLog;
let timerDisplay, hitsProgress, gameModeDisplay;
let modeButtons, timeOptions, hitsOptions, livesOptions;

// ============================================
// INITIALIZATION
// ============================================
function initApp() {
    // Get all DOM elements
    setupScreen = document.getElementById('setupScreen');
    modeSelectionScreen = document.getElementById('modeSelectionScreen');
    gameScreen = document.getElementById('gameScreen');
    
    player1NameInput = document.getElementById('player1Name');
    player2NameInput = document.getElementById('player2Name');
    continueBtn = document.getElementById('continueBtn');
    resetBtn = document.getElementById('resetBtn');
    
    player1NameDisplay = document.getElementById('player1NameDisplay');
    player2NameDisplay = document.getElementById('player2NameDisplay');
    player1ScoreDisplay = document.getElementById('player1Score');
    player2ScoreDisplay = document.getElementById('player2Score');
    player1Card = document.getElementById('player1Card');
    player2Card = document.getElementById('player2Card');
    player1LivesDisplay = document.getElementById('player1Lives');
    player2LivesDisplay = document.getElementById('player2Lives');
    hitLog = document.getElementById('hitLog');
    
    timerDisplay = document.getElementById('timerDisplay');
    hitsProgress = document.getElementById('hitsProgress');
    gameModeDisplay = document.getElementById('gameModeDisplay');
    
    modeButtons = document.querySelectorAll('.mode-btn');
    timeOptions = document.getElementById('timeOptions');
    hitsOptions = document.getElementById('hitsOptions');
    livesOptions = document.getElementById('livesOptions');
    
    // Check if all elements exist
    if (!setupScreen || !modeSelectionScreen || !gameScreen || !continueBtn) {
        console.error('Required DOM elements not found');
        return;
    }
    
    console.log('DOM elements loaded successfully');
    
    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Setup screen
    continueBtn.addEventListener('click', handleContinue);
    player1NameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') player2NameInput.focus();
    });
    player2NameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') continueBtn.click();
    });
    
    // Mode selection
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            showModeOptions(mode);
        });
    });
    
    // Option buttons
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', handleModeOptionSelect);
    });
    
    // Reset button
    resetBtn.addEventListener('click', handleReset);
}

// ============================================
// SCREEN TRANSITIONS
// ============================================
function showScreen(screenName) {
    setupScreen.classList.remove('active');
    modeSelectionScreen.classList.remove('active');
    gameScreen.classList.remove('active');
    
    switch(screenName) {
        case 'setup':
            setupScreen.classList.add('active');
            break;
        case 'mode':
            modeSelectionScreen.classList.add('active');
            break;
        case 'game':
            gameScreen.classList.add('active');
            break;
    }
}

// ============================================
// SETUP SCREEN HANDLERS
// ============================================
function handleContinue() {
    const p1Name = player1NameInput.value.trim();
    const p2Name = player2NameInput.value.trim();
    
    if (!p1Name || !p2Name) {
        alert('Please enter names for both players!');
        return;
    }
    
    gameState.player1Name = p1Name;
    gameState.player2Name = p2Name;
    
    showScreen('mode');
}

// ============================================
// MODE SELECTION HANDLERS
// ============================================
function showModeOptions(mode) {
    // Hide all options
    timeOptions.style.display = 'none';
    hitsOptions.style.display = 'none';
    livesOptions.style.display = 'none';
    
    // Show selected mode options
    switch(mode) {
        case 'time':
            timeOptions.style.display = 'flex';
            break;
        case 'hits':
            hitsOptions.style.display = 'flex';
            break;
        case 'lives':
            livesOptions.style.display = 'flex';
            break;
    }
}

function handleModeOptionSelect(e) {
    const btn = e.target;
    const parent = btn.closest('.mode-group');
    const modeBtn = parent.querySelector('.mode-btn');
    const mode = modeBtn.dataset.mode;
    
    // Disable all option buttons
    document.querySelectorAll('.option-btn').forEach(b => {
        b.disabled = true;
    });
    
    // Set game mode
    gameState.gameMode = mode;
    
    switch(mode) {
        case 'time':
            gameState.gameModeValue = parseInt(btn.dataset.duration);
            gameState.timeRemaining = gameState.gameModeValue * 60;
            gameModeDisplay.textContent = 'TIME LIMIT';
            break;
        case 'hits':
            gameState.gameModeValue = parseInt(btn.dataset.hits);
            gameState.player1Hits = 0;
            gameState.player2Hits = 0;
            gameModeDisplay.textContent = 'HITS TARGET';
            break;
        case 'lives':
            gameState.gameModeValue = parseInt(btn.dataset.lives);
            gameState.player1Lives = gameState.gameModeValue;
            gameState.player2Lives = gameState.gameModeValue;
            gameModeDisplay.textContent = 'LIMITED LIVES';
            break;
    }
    
    // Start game
    startGame();
}

// ============================================
// GAME START/END
// ============================================
function startGame() {
    // Reset game state
    gameState.gameStarted = true;
    gameState.gameEnded = false;
    gameState.player1Score = 0;
    gameState.player2Score = 0;
    gameState.processedEvents.clear();
    gameState.timeWarnings = { twoMin: false, oneMin: false };
    gameState.livesWarnings = { p1: { two: false, one: false }, p2: { two: false, one: false } };
    
    // Update displays
    player1NameDisplay.textContent = gameState.player1Name.toUpperCase();
    player2NameDisplay.textContent = gameState.player2Name.toUpperCase();
    player1ScoreDisplay.textContent = '0';
    player2ScoreDisplay.textContent = '0';
    hitLog.innerHTML = '';
    
    // Show/hide mode-specific displays
    timerDisplay.style.display = gameState.gameMode === 'time' ? 'block' : 'none';
    hitsProgress.style.display = gameState.gameMode === 'hits' ? 'block' : 'none';
    player1LivesDisplay.style.display = gameState.gameMode === 'lives' ? 'flex' : 'none';
    player2LivesDisplay.style.display = gameState.gameMode === 'lives' ? 'flex' : 'none';
    
    // Initialize mode-specific UI
    if (gameState.gameMode === 'time') {
        updateTimerDisplay();
        startTimer();
    } else if (gameState.gameMode === 'hits') {
        updateHitsProgress();
    } else if (gameState.gameMode === 'lives') {
        updateLivesDisplay();
    }
    
    // Switch to game screen
    showScreen('game');
    
    // Start listening to Firebase events
    startEventListening();
}

function endGame(winner) {
    if (gameState.gameEnded) return;
    
    gameState.gameEnded = true;
    gameState.gameStarted = false;
    
    // Stop timer
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    
    // Stop event listening
    if (gameState.eventListener) {
        gameState.eventListener();
        gameState.eventListener = null;
    }
    
    // Announce winner
    if (winner === 'tie') {
        speak('Game over! It\'s a tie!', true);
        setTimeout(() => {
            alert('Game Over!\nIT\'S A TIE!');
        }, 2000);
    } else {
        const winnerName = winner === 'player1' ? gameState.player1Name : gameState.player2Name;
        speak(`Game over! ${winnerName} wins!`, true);
        
        // Show winner in UI
        setTimeout(() => {
            alert(`Game Over!\n${winnerName.toUpperCase()} WINS!`);
        }, 2000);
    }
}

function handleReset() {
    // Stop timer
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    
    // Stop event listening
    if (gameState.eventListener) {
        gameState.eventListener();
        gameState.eventListener = null;
    }
    
    // Cancel speech
    if (synth) {
        synth.cancel();
    }
    
    // Reset game state
    gameState.gameStarted = false;
    gameState.gameEnded = false;
    gameState.gameMode = null;
    gameState.gameModeValue = null;
    gameState.player1Score = 0;
    gameState.player2Score = 0;
    gameState.player1Lives = 0;
    gameState.player2Lives = 0;
    gameState.player1Hits = 0;
    gameState.player2Hits = 0;
    gameState.processedEvents.clear();
    gameState.soundQueue = [];
    gameState.timeWarnings = { twoMin: false, oneMin: false };
    gameState.livesWarnings = { p1: { two: false, one: false }, p2: { two: false, one: false } };
    
    // Clear inputs
    player1NameInput.value = '';
    player2NameInput.value = '';
    
    // Re-enable option buttons
    document.querySelectorAll('.option-btn').forEach(b => {
        b.disabled = false;
    });
    
    // Hide mode options
    timeOptions.style.display = 'none';
    hitsOptions.style.display = 'none';
    livesOptions.style.display = 'none';
    
    // Switch back to setup screen
    showScreen('setup');
}

// ============================================
// TIMER FUNCTIONS
// ============================================
function startTimer() {
    updateTimerDisplay();
    
    gameState.timerInterval = setInterval(() => {
        if (!gameState.gameStarted || gameState.gameEnded) {
            clearInterval(gameState.timerInterval);
            return;
        }
        
        gameState.timeRemaining--;
        updateTimerDisplay();
        
        // Check for warnings
        if (gameState.timeRemaining === 120 && !gameState.timeWarnings.twoMin) {
            gameState.timeWarnings.twoMin = true;
            speak('Two minutes left before the game ends', true);
            timerDisplay.classList.add('warning');
        }
        
        if (gameState.timeRemaining === 60 && !gameState.timeWarnings.oneMin) {
            gameState.timeWarnings.oneMin = true;
            speak('One minute left before the game ends', true);
            timerDisplay.classList.add('warning');
        }
        
        // Check for game end
        if (gameState.timeRemaining <= 0) {
            clearInterval(gameState.timerInterval);
            const winner = gameState.player1Score > gameState.player2Score ? 'player1' : 
                          gameState.player2Score > gameState.player1Score ? 'player2' : null;
            if (winner) {
                endGame(winner);
            } else {
                endGame('tie');
            }
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(gameState.timeRemaining / 60);
    const seconds = gameState.timeRemaining % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ============================================
// LIVES DISPLAY
// ============================================
function updateLivesDisplay() {
    // Clear existing lives
    player1LivesDisplay.innerHTML = '';
    player2LivesDisplay.innerHTML = '';
    
    // Add life icons
    for (let i = 0; i < gameState.gameModeValue; i++) {
        const life1 = document.createElement('span');
        life1.className = `life-icon ${i >= gameState.player1Lives ? 'lost' : ''}`;
        life1.textContent = '❤️';
        player1LivesDisplay.appendChild(life1);
        
        const life2 = document.createElement('span');
        life2.className = `life-icon ${i >= gameState.player2Lives ? 'lost' : ''}`;
        life2.textContent = '❤️';
        player2LivesDisplay.appendChild(life2);
    }
}

// ============================================
// HITS PROGRESS
// ============================================
function updateHitsProgress() {
    hitsProgress.textContent =
        `${gameState.player1Name || 'P1'}: ${gameState.player1Hits} / ${gameState.gameModeValue} hits  |  ` +
        `${gameState.player2Name || 'P2'}: ${gameState.player2Hits} / ${gameState.gameModeValue} hits`;
}

// ============================================
// FIREBASE EVENT LISTENING
// ============================================
function startEventListening() {
    if (!database) {
        console.error('Firebase database not initialized');
        return;
    }
    
    const eventsRef = ref(database, 'events');
    
    console.log('Starting Firebase event listener');
    
    gameState.eventListener = onValue(eventsRef, (snapshot) => {
        if (!gameState.gameStarted || gameState.gameEnded) return;
        
        const events = snapshot.val();
        if (!events) return;
        
        Object.keys(events).forEach(eventId => {
            const event = events[eventId];
            
            if (!event || !event.player || event.event !== 'shot') {
                return;
            }
            
            const eventKey = eventId;
            
            if (gameState.processedEvents.has(eventKey)) {
                return;
            }
            
            gameState.processedEvents.add(eventKey);
            processEvent(event);
        });
    }, (error) => {
        console.error('Firebase error:', error);
    });
}

// ============================================
// EVENT PROCESSING
// ============================================
function processEvent(event) {
    const player = event.player;
    let scoringPlayer, hitPlayer;
    
    // Determine who scored and who was hit
    // If player === "p1" → p1 was shot → p2 scores
    // If player === "p2" → p2 was shot → p1 scores
    if (player === 'p1') {
        // p1 was shot, so p2 scores
        scoringPlayer = 'player2'; // p2 scores
        hitPlayer = 'player1'; // p1 was shot
    } else if (player === 'p2') {
        // p2 was shot, so p1 scores
        scoringPlayer = 'player1'; // p1 scores
        hitPlayer = 'player2'; // p2 was shot
    } else {
        return;
    }
    
    // Play hit sound - say who was shot
    const hitPlayerName = hitPlayer === 'player1' ? gameState.player1Name : gameState.player2Name;
    speak(`${hitPlayerName} was just shot`);
    
    // Update score
    if (scoringPlayer === 'player1') {
        gameState.player1Score += 5;
        updateScore('player1', gameState.player1Score);
        addHitLog(gameState.player1Name, false);
    } else {
        gameState.player2Score += 5;
        updateScore('player2', gameState.player2Score);
        addHitLog(gameState.player2Name, true);
    }
    
    // Handle mode-specific logic
    if (gameState.gameMode === 'hits') {
        // The scoring player gets a hit (they successfully hit the other player)
        if (scoringPlayer === 'player1') {
            gameState.player1Hits++;
        } else {
            gameState.player2Hits++;
        }
        updateHitsProgress();
        
        // Check for game end
        if (gameState.player1Hits >= gameState.gameModeValue) {
            endGame('player1');
        } else if (gameState.player2Hits >= gameState.gameModeValue) {
            endGame('player2');
        }
    } else if (gameState.gameMode === 'lives') {
        // Subtract life from the player who was hit
        // If p1 shoots → p2 was hit → p2 loses life
        // If p2 shoots → p1 was hit → p1 loses life
        if (hitPlayer === 'player1') {
            gameState.player1Lives--;
            speak(`${gameState.player1Name} just lost a life`);
            
            // Check for warnings
            if (gameState.player1Lives === 2 && !gameState.livesWarnings.p1.two) {
                gameState.livesWarnings.p1.two = true;
                speak(`${gameState.player1Name} has only two lives left`);
            } else if (gameState.player1Lives === 1 && !gameState.livesWarnings.p1.one) {
                gameState.livesWarnings.p1.one = true;
                speak(`${gameState.player1Name} has only one life left`);
            }
            
            // Check for game end
            if (gameState.player1Lives <= 0) {
                endGame('player2');
            }
        } else {
            gameState.player2Lives--;
            speak(`${gameState.player2Name} just lost a life`);
            
            // Check for warnings
            if (gameState.player2Lives === 2 && !gameState.livesWarnings.p2.two) {
                gameState.livesWarnings.p2.two = true;
                speak(`${gameState.player2Name} has only two lives left`);
            } else if (gameState.player2Lives === 1 && !gameState.livesWarnings.p2.one) {
                gameState.livesWarnings.p2.one = true;
                speak(`${gameState.player2Name} has only one life left`);
            }
            
            // Check for game end
            if (gameState.player2Lives <= 0) {
                endGame('player1');
            }
        }
        
        updateLivesDisplay();
    }
}

// ============================================
// UI UPDATE FUNCTIONS
// ============================================
function updateScore(player, newScore) {
    const scoreElement = player === 'player1' ? player1ScoreDisplay : player2ScoreDisplay;
    const cardElement = player === 'player1' ? player1Card : player2Card;
    
    scoreElement.textContent = newScore;
    
    scoreElement.classList.add('score-update');
    cardElement.classList.add('score-update');
    
    setTimeout(() => {
        scoreElement.classList.remove('score-update');
        cardElement.classList.remove('score-update');
    }, 600);
}

function addHitLog(playerName, isPlayer2) {
    const hitMessage = document.createElement('div');
    hitMessage.className = `hit-message ${isPlayer2 ? 'player2-hit' : 'player1-hit'}`;
    hitMessage.textContent = `🔥 ${playerName} scored! +5 points`;
    
    hitLog.insertBefore(hitMessage, hitLog.firstChild);
    
    while (hitLog.children.length > 20) {
        hitLog.removeChild(hitLog.lastChild);
    }
    
    hitLog.scrollTop = 0;
}

// ============================================
// INITIALIZE APP
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
