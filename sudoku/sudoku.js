/**
 * --- MODEL & LOGIC ---
 */
class SudokuModel {
    constructor() {
        this.size = 9; // Default 9x9
        this.boxW = 3;
        this.boxH = 3;
        this.reset();
    }

    reset() {
        this.totalCells = this.size * this.size;
        this.board = Array(this.totalCells).fill(0);
        this.solution = Array(this.totalCells).fill(0);
        this.fixed = Array(this.totalCells).fill(false);
        this.history = [];
        this.redoStack = [];
        this.timer = 0;
        this.isPlaying = false;
        this.errors = 0;
        this.hintsUsed = 0;
    }

    generate(mode, difficulty) {
        // Konfiguration setzen
        this.mode = mode;
        this.difficulty = difficulty;
        
        if (mode === 'mini') {
            this.size = 6;
            this.boxW = 3; // 3 Spalten breit
            this.boxH = 2; // 2 Zeilen hoch
        } else {
            this.size = 9;
            this.boxW = 3;
            this.boxH = 3;
        }
        
        this.reset(); // Reset mit neuer Größe

        // Board generieren
        // Bei 6x6 ist Brute Force schnell genug für das ganze Board
        // Bei 9x9 füllen wir erst die Diagonalen Boxen für Randomisierung
        if (this.size === 9) {
            this.fillDiagonalBoxes();
        } else {
            // Für Mini Sudoku: Einfach erste Box füllen für Randomness
            this.fillBox(0, 0); 
        }

        this.solve(this.solution, 0, true);
        this.board = [...this.solution];

        // Zahlen entfernen
        let attempts = 0;
        if (this.size === 9) {
            attempts = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 45 : 58;
        } else {
            // 6x6 (Total 36 Zellen)
            attempts = difficulty === 'easy' ? 12 : difficulty === 'medium' ? 18 : 22;
        }

        // Killer Modus Logik hier vereinfacht/deaktiviert für Mini, 
        // oder man müsste Käfige für 6x6 anpassen. 
        // Wir lassen Killer nur für 9x9 Classic aktiv in der UI Logik, oder ignorieren es hier.

        while (attempts > 0) {
            let idx = Math.floor(Math.random() * this.totalCells);
            if (this.board[idx] !== 0) {
                this.board[idx] = 0;
                attempts--;
            }
        }

        // Fixed setzen
        for (let i = 0; i < this.totalCells; i++) {
            if (this.board[i] !== 0) this.fixed[i] = true;
        }
        
        this.saveState();
        this.isPlaying = true;
    }

    fillDiagonalBoxes() {
        for (let i = 0; i < this.size; i += this.boxH) {
            // Bei 9x9: 0, 3, 6 (Box Starts diagonal)
            // Bei 6x6 ist das komplizierter wegen 2x3. Wir nutzen oben vereinfachte Logik.
            if(i < this.size) this.fillBox(i, i);
        }
    }

    fillBox(row, col) {
        let num;
        for (let i = 0; i < this.boxH; i++) {
            for (let j = 0; j < this.boxW; j++) {
                do {
                    num = Math.floor(Math.random() * this.size) + 1;
                } while (!this.isSafeInBox(row, col, num, this.solution));
                
                let idx = (row + i) * this.size + (col + j);
                this.solution[idx] = num;
            }
        }
    }

    isSafeInBox(rowStart, colStart, num, grid) {
        // Finde Box Start Koordinaten
        const rStart = rowStart - (rowStart % this.boxH);
        const cStart = colStart - (colStart % this.boxW);

        for (let i = 0; i < this.boxH; i++) {
            for (let j = 0; j < this.boxW; j++) {
                let idx = (rStart + i) * this.size + (cStart + j);
                if (grid[idx] === num) return false;
            }
        }
        return true;
    }

    isValidMove(idx, num, grid) {
        const row = Math.floor(idx / this.size);
        const col = idx % this.size;
        
        // Zeile & Spalte
        for (let i = 0; i < this.size; i++) {
            if (grid[row * this.size + i] === num && (row * this.size + i) !== idx) return false;
            if (grid[i * this.size + col] === num && (i * this.size + col) !== idx) return false;
        }

        // Box
        const startRow = row - row % this.boxH;
        const startCol = col - col % this.boxW;
        for (let i = 0; i < this.boxH; i++) {
            for (let j = 0; j < this.boxW; j++) {
                let cIdx = (startRow + i) * this.size + (startCol + j);
                if (grid[cIdx] === num && cIdx !== idx) return false;
            }
        }

        // Diagonal (nur für 9x9 implementiert oder angepasst für 6x6)
        if (this.mode === 'diagonal') {
            if (row === col) { 
                for (let i = 0; i < this.size; i++) {
                    if (grid[i * this.size + i] === num && (i*this.size+i) !== idx) return false;
                }
            }
            if (row + col === this.size - 1) { 
                for (let i = 0; i < this.size; i++) {
                    if (grid[i * this.size + (this.size - 1 - i)] === num && (i*this.size+(this.size-1-i)) !== idx) return false;
                }
            }
        }
        return true;
    }

    solve(grid, idx = 0, randomize = false) {
        if (idx >= this.totalCells) return true;
        if (grid[idx] !== 0) return this.solve(grid, idx + 1, randomize);

        let nums = [];
        for(let k=1; k<=this.size; k++) nums.push(k);
        if (randomize) nums.sort(() => Math.random() - 0.5);

        for (let num of nums) {
            if (this.isValidMove(idx, num, grid)) {
                grid[idx] = num;
                if (this.solve(grid, idx + 1, randomize)) return true;
                grid[idx] = 0;
            }
        }
        return false;
    }

    // ... Actions (setInput, undo, redo, saveState, loadState) bleiben gleich ...
    // HINWEIS: Bei loadState muss this.size neu gesetzt werden!
    
    setInput(idx, val) {
        if (this.fixed[idx]) return false;
        this.pushHistory(idx, this.board[idx], val);
        this.board[idx] = val;
        this.saveState();
        return true;
    }
    pushHistory(idx, oldVal, newVal) {
        this.history.push({ idx, oldVal, newVal });
        this.redoStack = [];
        if (this.history.length > 50) this.history.shift();
    }
    undo() {
        if (this.history.length === 0) return null;
        const move = this.history.pop();
        this.redoStack.push(move);
        this.board[move.idx] = move.oldVal;
        this.saveState();
        return move.idx;
    }
    redo() {
        if (this.redoStack.length === 0) return null;
        const move = this.redoStack.pop();
        this.history.push(move);
        this.board[move.idx] = move.newVal;
        this.saveState();
        return move.idx;
    }
    saveState() {
        const state = {
            board: this.board,
            fixed: this.fixed,
            solution: this.solution,
            timer: this.timer,
            mode: this.mode,
            size: this.size, // Speichern der Größe
            difficulty: this.difficulty,
            hints: this.hintsUsed,
            errors: this.errors
        };
        localStorage.setItem('sudoku_save', JSON.stringify(state));
    }
    loadState() {
        const saved = localStorage.getItem('sudoku_save');
        if (!saved) return false;
        try {
            const state = JSON.parse(saved);
            this.mode = state.mode;
            this.size = state.size || 9; // Fallback
            
            // Box Maße setzen basierend auf Size
            if(this.size === 6) { this.boxW = 3; this.boxH = 2; }
            else { this.boxW = 3; this.boxH = 3; }

            this.board = state.board;
            this.totalCells = this.board.length;
            this.fixed = state.fixed;
            this.solution = state.solution;
            this.timer = state.timer;
            this.difficulty = state.difficulty;
            this.hintsUsed = state.hints || 0;
            this.errors = state.errors || 0;
            this.isPlaying = true;
            return true;
        } catch (e) {
            return false;
        }
    }
}

/**
 * --- VIEW & CONTROLLER ---
 */
class SudokuController {
    constructor() {
        this.model = new SudokuModel();
        this.selectedIdx = -1;
        this.soundEnabled = true;
        
        // Elements
        this.boardEl = document.getElementById('sudoku-board');
        this.timerEl = document.getElementById('game-timer');
        this.modeSel = document.getElementById('mode-select');
        this.diffSel = document.getElementById('diff-select');
        
        this.initEventListeners();
        
        if (this.model.loadState()) {
            this.modeSel.value = this.model.mode;
            this.diffSel.value = this.model.difficulty;
            this.updateUIForMode(); // Wichtig für Grid Layout
            this.renderBoard();
            this.startTimer();
        } else {
            this.newGame();
        }
    }

    initEventListeners() {
        document.getElementById('btn-new-game').onclick = () => this.newGame();
        this.modeSel.onchange = () => this.newGame();
        this.diffSel.onchange = () => this.newGame();
        
        document.querySelectorAll('.btn-num').forEach(btn => {
            btn.onclick = (e) => this.handleInput(parseInt(e.target.dataset.val));
        });
        document.getElementById('btn-delete').onclick = () => this.handleInput(0);
        document.getElementById('btn-undo').onclick = () => {
            let idx = this.model.undo();
            if (idx !== null) { this.renderBoard(); this.selectCell(idx); }
        };
        document.getElementById('btn-redo').onclick = () => {
            let idx = this.model.redo();
            if (idx !== null) { this.renderBoard(); this.selectCell(idx); }
        };
        document.getElementById('btn-hint').onclick = () => this.giveHint();
        document.getElementById('btn-solve').onclick = () => this.solveGame();
        
        // Modals
        document.getElementById('btn-close-modal').onclick = () => document.getElementById('modal-highscore').style.display = 'none';
        document.getElementById('btn-next-game').onclick = () => {
            document.getElementById('modal-win').style.display = 'none';
            this.newGame();
        };
        document.getElementById('btn-highscore').onclick = () => this.showHighscores();

        // Theme & Sound
        document.getElementById('btn-theme').onclick = () => {
            const body = document.body;
            const current = body.getAttribute('data-theme');
            body.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
        };
        document.getElementById('btn-sound').onclick = (e) => {
            this.soundEnabled = !this.soundEnabled;
            e.target.innerText = this.soundEnabled ? '🔊' : '🔇';
        };
    }

    newGame() {
        const mode = this.modeSel.value;
        const diff = this.diffSel.value;
        this.model.generate(mode, diff);
        this.updateUIForMode();
        this.renderBoard();
        this.startTimer();
        this.selectedIdx = -1;
    }

    updateUIForMode() {
        const size = this.model.size;
        // Setze CSS Variable für Grid Spalten
        this.boardEl.style.setProperty('--cols', size);
        this.boardEl.dataset.size = size;

        // Tastatur anpassen
        const numpad1 = document.getElementById('numpad-1-5');
        const numpad2 = document.getElementById('numpad-6-9');
        
        if (size === 6) {
            numpad2.classList.add('hidden'); // Verstecke 6-9 Reihe (fast, 6 brauchen wir noch)
            // Wir müssen Button 6 verschieben oder NumPad Struktur ändern.
            // Einfacher Hack: Button 6 in Reihe 1 schieben via JS? 
            // Nein, CSS Grid Change ist sauberer.
            
            // Wir bauen das Numpad dynamisch um für 6x6
            numpad1.innerHTML = '';
            for(let i=1; i<=6; i++) {
                const btn = document.createElement('button');
                btn.className = 'btn-num';
                btn.innerText = i;
                btn.dataset.val = i;
                btn.onclick = (e) => this.handleInput(parseInt(e.target.dataset.val));
                numpad1.appendChild(btn);
            }
            numpad1.classList.add('full-width'); // CSS Klasse für 6 Spalten
            numpad2.style.display = 'none';
        } else {
            // Restore 9x9 Layout
            numpad1.innerHTML = '';
            for(let i=1; i<=5; i++) {
                const btn = document.createElement('button');
                btn.className = 'btn-num';
                btn.innerText = i;
                btn.dataset.val = i;
                btn.onclick = (e) => this.handleInput(parseInt(e.target.dataset.val));
                numpad1.appendChild(btn);
            }
            numpad1.classList.remove('full-width');
            numpad2.style.display = 'grid'; // Restore
        }
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (!this.model.isPlaying) return;
            this.model.timer++;
            this.updateTimerDisplay();
            if (this.model.timer % 5 === 0) this.model.saveState();
        }, 1000);
    }

    updateTimerDisplay() {
        const min = Math.floor(this.model.timer / 60).toString().padStart(2, '0');
        const sec = (this.model.timer % 60).toString().padStart(2, '0');
        this.timerEl.innerText = `${min}:${sec}`;
    }

    renderBoard() {
        this.boardEl.innerHTML = '';
        const size = this.model.size;
        
        for (let i = 0; i < this.model.totalCells; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.index = i;
            
            const val = this.model.board[i];
            if (val !== 0) {
                cell.innerText = val;
                if (this.model.fixed[i]) cell.classList.add('fixed');
                else cell.classList.add('user-input');
            }

            // Diagonal Styling
            if (this.model.mode === 'diagonal') {
                 const r = Math.floor(i/size), c = i%size;
                 if (r === c || r + c === size - 1) cell.style.backgroundColor = 'var(--bg-color)';
            }

            cell.onclick = () => this.selectCell(i);
            this.boardEl.appendChild(cell);
        }
        this.highlightErrors();
    }

    selectCell(idx) {
        if (this.selectedIdx !== -1 && this.boardEl.children[this.selectedIdx]) {
            this.boardEl.children[this.selectedIdx].classList.remove('selected');
        }
        this.selectedIdx = idx;
        const cell = this.boardEl.children[idx];
        cell.classList.add('selected');

        const val = this.model.board[idx];
        const size = this.model.size;
        const row = Math.floor(idx / size);
        const col = idx % size;
        const boxH = this.model.boxH;
        const boxW = this.model.boxW;
        const boxStartRow = row - row % boxH;
        const boxStartCol = col - col % boxW;

        Array.from(this.boardEl.children).forEach((c, i) => {
            c.classList.remove('highlight-same', 'highlight-related');
            
            if (val !== 0 && this.model.board[i] === val) c.classList.add('highlight-same');

            const r = Math.floor(i / size);
            const co = i % size;
            const bR = r - r % boxH;
            const bC = co - co % boxW;

            if (r === row || co === col || (bR === boxStartRow && bC === boxStartCol)) {
                if (i !== idx) c.classList.add('highlight-related');
            }
        });
        // playSound logic...
    }

    handleInput(val) {
        if (this.selectedIdx === -1) return;
        if (this.model.fixed[this.selectedIdx]) return;

        this.model.setInput(this.selectedIdx, val);
        const cell = this.boardEl.children[this.selectedIdx];
        cell.innerText = val === 0 ? '' : val;
        
        cell.className = 'cell selected user-input'; // Reset classes keep selected
        
        if (val !== 0) {
            if (!this.model.isValidMove(this.selectedIdx, val, this.model.board)) {
                cell.classList.add('error');
                this.model.errors++;
            }
        }
        
        this.highlightErrors();
        this.selectCell(this.selectedIdx); // Refresh highlights
        this.checkWin();
    }

    highlightErrors() {
        for (let i = 0; i < this.model.totalCells; i++) {
            const val = this.model.board[i];
            const cell = this.boardEl.children[i];
            if(cell) {
                cell.classList.remove('error');
                if (val !== 0 && !this.model.fixed[i]) {
                    if (!this.model.isValidMove(i, val, this.model.board)) {
                        cell.classList.add('error');
                    }
                }
            }
        }
    }

    checkWin() {
        if (this.model.board.includes(0)) return;
        for (let i = 0; i < this.model.totalCells; i++) {
            if (this.model.board[i] !== this.model.solution[i]) return;
        }

        this.model.isPlaying = false;
        clearInterval(this.timerInterval);
        
        let diffMult = this.model.difficulty === 'easy' ? 1 : this.model.difficulty === 'medium' ? 1.5 : 2;
        let score = Math.max(0, Math.floor((1000 * diffMult) - this.model.timer - (this.model.errors * 50) - (this.model.hintsUsed * 100)));
        
        this.saveHighscore(score);
        
        setTimeout(() => {
            document.getElementById('win-time-display').innerText = this.timerEl.innerText;
            document.getElementById('win-score-display').innerText = score;
            document.getElementById('modal-win').style.display = 'flex';
        }, 500);
    }
    
    // Hint, Solve, Audio, Highscore Helper funktionen analog zum alten Code...
    giveHint() {
        if (!this.model.isPlaying) return;
        let empties = [];
        for(let i=0; i<this.model.totalCells; i++) if(this.model.board[i] === 0) empties.push(i);
        if(empties.length === 0) return;
        const idx = empties[Math.floor(Math.random() * empties.length)];
        this.model.board[idx] = this.model.solution[idx];
        this.model.fixed[idx] = true;
        this.model.hintsUsed++;
        this.renderBoard();
        this.selectCell(idx);
    }

    solveGame() {
        if (confirm("Lösung anzeigen?")) {
            this.model.board = [...this.model.solution];
            this.model.isPlaying = false;
            clearInterval(this.timerInterval);
            this.renderBoard();
        }
    }
    
    saveHighscore(score) {
        let scores = JSON.parse(localStorage.getItem('sudoku_highscores') || '[]');
        scores.push({ score, date: new Date().toLocaleDateString(), mode: this.model.mode });
        scores.sort((a, b) => b.score - a.score);
        localStorage.setItem('sudoku_highscores', JSON.stringify(scores.slice(0, 5)));
    }
    
    showHighscores() {
        const list = document.getElementById('highscore-list');
        list.innerHTML = '';
        let scores = JSON.parse(localStorage.getItem('sudoku_highscores') || '[]');
        if (!scores.length) list.innerHTML = '<li>Keine Einträge</li>';
        scores.forEach(s => {
            let li = document.createElement('li');
            li.className = 'highscore-item';
            li.innerHTML = `<span>${s.mode || 'Classic'}</span> <b>${s.score}</b>`;
            list.appendChild(li);
        });
        document.getElementById('modal-highscore').style.display = 'flex';
    }
}

window.onload = () => new SudokuController();