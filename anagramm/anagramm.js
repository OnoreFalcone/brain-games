/**
 * --- WORD LISTS ---
 */
const WORDS = {
    easy: [
        "BAUM", "HAUS", "TURM", "BROT", "WIND", "KIND", "MAUS", "REIS", "LAND", "BERG",
        "AUTO", "BILD", "BUCH", "DORF", "FLUSS", "GELD", "HERZ", "INSEL", "JAHR", "KOPF"
    ],
    medium: [
        "GARTEN", "STRAND", "FENSTER", "SCHULE", "KAFFEE", "FREUND", "SOMMER", "WINTER",
        "STADT", "WOLKE", "REGEN", "SONNE", "BLUME", "BRÜCKE", "FISCH", "VOGEL", "PFERD",
        "TISCH", "STUHL", "LAMPE"
    ],
    hard: [
        "SCHMETTERLING", "HIMMELSRICHTUNG", "COMPUTER", "NACHBARSCHAFT", "WISSENSCHAFT",
        "ABENTEUER", "FLUGHAFEN", "GESCHICHTE", "PRODUKTION", "VERSICHERUNG",
        "GEBURTSTAG", "WÖRTERBUCH", "LANDSCHAFT", "ERFAHRUNG", "FREIHEIT", "GESUNDHEIT"
    ]
};

/**
 * --- GAME LOGIC ---
 */
class AnagrammGame {
    constructor() {
        this.currentWord = "";
        this.scrambledWord = "";
        this.score = 0;
        this.level = null;
        this.timeLeft = 0;
        this.timerInterval = null;
        this.hintsGiven = 0;

        this.initElements();
        this.initEvents();
    }

    initElements() {
        this.el = {
            levelSelection: document.getElementById('level-selection'),
            playArea: document.getElementById('play-area'),
            scrambledWord: document.getElementById('scrambled-word'),
            correctAnswerDisplay: document.getElementById('correct-answer-display'),
            userInput: document.getElementById('user-input'),
            submitBtn: document.getElementById('submit-btn'),
            hintBtn: document.getElementById('hint-btn'),
            skipBtn: document.getElementById('skip-btn'),
            score: document.getElementById('score'),
            timer: document.getElementById('timer'),
            timerDisplay: document.getElementById('timer-display'),
            resultOverlay: document.getElementById('result-overlay'),
            resultTitle: document.getElementById('result-title'),
            resultText: document.getElementById('result-text'),
            restartBtn: document.getElementById('restart-btn'),
            mainMenuBtn: document.getElementById('main-menu-btn')
        };
    }

    initEvents() {
        // Level buttons
        document.querySelectorAll('.level-buttons button').forEach(btn => {
            btn.addEventListener('click', () => this.startGame(btn.dataset.level));
        });

        // Submit actions
        this.el.submitBtn.addEventListener('click', () => this.checkAnswer());
        this.el.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.checkAnswer();
        });

        // Other controls
        this.el.hintBtn.addEventListener('click', () => this.giveHint());
        this.el.skipBtn.addEventListener('click', () => this.nextWord());
        
        // Overlays
        this.el.restartBtn.addEventListener('click', () => this.restart());
        this.el.mainMenuBtn.addEventListener('click', () => location.reload());
    }

    startGame(level) {
        this.level = level;
        this.score = 0;
        this.el.score.textContent = "0";
        this.el.levelSelection.classList.add('hidden');
        this.el.playArea.classList.remove('hidden');
        
        if (level !== 'easy') {
            this.el.timerDisplay.classList.remove('hidden');
        } else {
            this.el.timerDisplay.classList.add('hidden');
        }

        this.nextWord();
    }

    nextWord() {
        const words = WORDS[this.level];
        this.currentWord = words[Math.floor(Math.random() * words.length)];
        this.scrambledWord = this.scramble(this.currentWord);
        this.hintsGiven = 0;

        this.el.scrambledWord.textContent = this.scrambledWord;
        this.el.userInput.value = "";
        this.el.userInput.classList.remove('shake');
        this.el.userInput.focus();

        this.resetTimer();
    }

    scramble(word) {
        let scrambled;
        do {
            const arr = word.split('');
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            scrambled = arr.join('');
        } while (scrambled === word); // Ensure it's actually scrambled
        
        return scrambled.split('').join(' '); // Add spaces for better readability
    }

    resetTimer() {
        clearInterval(this.timerInterval);
        
        if (this.level === 'easy') return;

        this.timeLeft = this.level === 'hard' ? 15 : 20;
        this.updateTimerDisplay();

        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();

            if (this.timeLeft <= 0) {
                this.gameOver("Zeit abgelaufen!");
            }
        }, 1000);
    }

    updateTimerDisplay() {
        this.el.timer.textContent = this.timeLeft;
        if (this.timeLeft <= 5) {
            this.el.timer.parentElement.style.color = "var(--danger)";
            this.el.timer.classList.add('timer-pulse');
        } else {
            this.el.timer.parentElement.style.color = "inherit";
            this.el.timer.classList.remove('timer-pulse');
        }
    }

    checkAnswer() {
        const guess = this.el.userInput.value.trim().toUpperCase();
        
        if (guess === this.currentWord) {
            this.handleSuccess();
        } else {
            this.el.userInput.classList.add('shake');
            setTimeout(() => this.el.userInput.classList.remove('shake'), 300);
        }
    }

    handleSuccess() {
        // Show correct word and animations
        this.el.correctAnswerDisplay.textContent = `Richtig: ${this.currentWord}!`;
        this.el.correctAnswerDisplay.classList.add('visible');
        this.el.scrambledWord.classList.add('pop');
        this.el.userInput.classList.add('success');
        
        this.score += this.calculatePoints();
        this.el.score.textContent = this.score;

        // Briefly pause before next word
        setTimeout(() => {
            this.el.correctAnswerDisplay.classList.remove('visible');
            this.el.scrambledWord.classList.remove('pop');
            this.el.userInput.classList.remove('success');
            this.nextWord();
        }, 1000);
    }

    calculatePoints() {
        let base = 10;
        if (this.level === 'medium') base = 20;
        if (this.level === 'hard') base = 30;
        
        // Deduct points for hints
        return Math.max(5, base - (this.hintsGiven * 5));
    }

    giveHint() {
        this.hintsGiven++;
        const hintText = this.currentWord.substring(0, this.hintsGiven);
        this.el.userInput.value = hintText;
        this.el.userInput.focus();
    }

    gameOver(reason) {
        clearInterval(this.timerInterval);
        this.el.resultTitle.textContent = reason;
        this.el.resultText.textContent = `Dein Punktestand: ${this.score}`;
        this.el.resultOverlay.classList.remove('hidden');
    }

    restart() {
        this.el.resultOverlay.classList.add('hidden');
        this.startGame(this.level);
    }
}

// Start the game when loaded
document.addEventListener('DOMContentLoaded', () => {
    new AnagrammGame();
});
