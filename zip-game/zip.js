/**
 * --- STATIC LEVELS ---
 * 0 = Empty, -1 = Wall, >0 = Fixed Number
 */
const LEVELS = [
    {
        id: 1,
        title: "Einfacher Start",
        rows: 5,
        cols: 5,
        grid: [
            [1,  0,  0,  0,  5],
            [0,  0,  0,  0,  6],
            [0,  0, -1,  0,  7],
            [13, 12, 11, 0,  8],
            [14, 0,  0,  0,  22] // Max 22 because of 1 wall + empty
        ]
    },
    {
        id: 2,
        title: "Die Schlange",
        rows: 5,
        cols: 5,
        grid: [
            [1,  2,  3,  4,  5],
            [0,  0,  0,  0,  6],
            [25, 0,  0,  0,  7],
            [24, 0,  0,  0,  8],
            [23, 0,  0,  0,  9]
        ]
    },
    {
        id: 3,
        title: "Labyrinth",
        rows: 6,
        cols: 6,
        grid: [
            [1,  0, -1, 34, 33, 32],
            [0, -1, -1, 0,  0,  31],
            [0,  0,  0,  0, -1, 30],
            [0, -1,  0, -1,  0, 29],
            [0,  8,  0,  0,  0,  0],
            [6,  7, 12, 13,  0, 27]
        ]
    }
];

/**
 * --- MODEL ---
 */
class ZipModel {
    constructor() {
        this.currentLevelIdx = 0;
        this.reset();
    }

    loadLevel(index) {
        if (index < 0 || index >= LEVELS.length) return;
        this.currentLevelIdx = index;
        const data = LEVELS[index];
        
        this.rows = data.rows;
        this.cols = data.cols;
        this.initialGrid = JSON.parse(JSON.stringify(data.grid)); // Deep copy
        
        // Berechne Ziel (Max Value) und valide Zellen
        this.maxValue = 0;
        this.wallCount = 0;
        this.startPos = null;

        for(let r=0; r<this.rows; r++) {
            for(let c=0; c<this.cols; c++) {
                const val = this.initialGrid[r][c];
                if(val === -1) this.wallCount++;
                if(val === 1) this.startPos = {r, c};
                // Max Value ist die Anzahl der nicht-Wand Felder
            }
        }
        this.maxValue = (this.rows * this.cols) - this.wallCount;
        this.resetState();
    }

    resetState() {
        // User Path State: Array of {r, c, val}
        this.path = [];
        if (this.startPos) {
            this.path.push({r: this.startPos.r, c: this.startPos.c, val: 1});
        }
        this.isComplete = false;
    }

    // Versucht einen Zug von der letzten Position zu (r,c)
    tryMove(r, c) {
        if (this.isComplete) return false;
        
        const last = this.path[this.path.length - 1];
        
        // 1. Ist es der Nachbar? (Orthogonal)
        const dist = Math.abs(r - last.r) + Math.abs(c - last.c);
        if (dist !== 1) return false;

        // 2. Ist es eine Wand?
        if (this.initialGrid[r][c] === -1) return false;

        // 3. Backtracking Check: Hat der User auf das vorletzte Feld geklickt? (Undo)
        if (this.path.length > 1) {
            const preLast = this.path[this.path.length - 2];
            if (preLast.r === r && preLast.c === c) {
                this.path.pop(); // Entferne letzten Schritt
                return true;
            }
        }

        // 4. Ist das Feld schon im Pfad? (Self-intersection)
        if (this.path.some(p => p.r === r && p.c === c)) return false;

        // 5. Nummer-Logik (Constraint Check)
        const nextVal = this.path.length + 1;
        const gridVal = this.initialGrid[r][c];

        // Wenn das Feld leer (0) ist: OK
        // Wenn das Feld eine Zahl hat: Muss exakt nextVal sein.
        if (gridVal !== 0 && gridVal !== nextVal) return false;

        // Move Valid -> Pfad erweitern
        this.path.push({r, c, val: nextVal});
        
        // Win Check
        if (this.path.length === this.maxValue) {
            // Optional: Prüfen ob das letzte Feld auch wirklich die höchste Zahl im Grid war (falls Grid Fehler hat)
            this.isComplete = true;
            return 'WIN';
        }

        return true;
    }

    undo() {
        if (this.path.length > 1) {
            this.path.pop();
            this.isComplete = false;
            return true;
        }
        return false;
    }
}

/**
 * --- VIEW & CONTROLLER ---
 */
class ZipController {
    constructor() {
        this.model = new ZipModel();
        this.boardEl = document.getElementById('zip-board');
        this.isDrawing = false;

        this.initUI();
        this.loadLevel(0);
    }

    initUI() {
        // Buttons
        document.getElementById('btn-reset').onclick = () => {
            this.model.resetState();
            this.render();
        };
        document.getElementById('btn-undo').onclick = () => {
            if(this.model.undo()) this.render();
        };
        document.getElementById('btn-prev-level').onclick = () => this.loadLevel(this.model.currentLevelIdx - 1);
        document.getElementById('btn-next-level').onclick = () => this.loadLevel(this.model.currentLevelIdx + 1);
        
        document.getElementById('btn-next-game').onclick = () => {
            document.getElementById('modal-win').style.display = 'none';
            this.loadLevel(this.model.currentLevelIdx + 1);
        };

        document.getElementById('btn-theme').onclick = () => {
            const body = document.body;
            const current = body.getAttribute('data-theme');
            body.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
        };

        // Touch / Mouse Events für "Drag to Draw"
        this.boardEl.addEventListener('pointerdown', (e) => this.handleStart(e));
        window.addEventListener('pointerup', () => this.handleEnd());
        // WICHTIG: touch-action: none im CSS, damit wir hier move tracken können
        window.addEventListener('pointermove', (e) => this.handleMove(e));
    }

    loadLevel(idx) {
        if (idx < 0) idx = LEVELS.length - 1;
        if (idx >= LEVELS.length) idx = 0;
        
        this.model.loadLevel(idx);
        
        // UI Updates
        document.getElementById('level-title').textContent = LEVELS[idx].title;
        document.getElementById('level-display').textContent = `Level ${idx + 1}`;
        document.getElementById('max-val-display').textContent = this.model.maxValue;

        // Grid CSS Setup
        this.boardEl.style.gridTemplateColumns = `repeat(${this.model.cols}, 1fr)`;
        this.boardEl.style.gridTemplateRows = `repeat(${this.model.rows}, 1fr)`;
        
        this.render();
    }

    handleStart(e) {
        // Verhindern von Default Actions
        if (e.target.closest('.cell')) {
            this.isDrawing = true;
            this.handleMove(e); // Sofort Trigger beim Klick
        }
    }

    handleMove(e) {
        if (!this.isDrawing) return;

        // Element unter dem Cursor finden (wichtig für Touch Drag)
        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (!target || !target.classList.contains('cell')) return;

        const r = parseInt(target.dataset.r);
        const c = parseInt(target.dataset.c);

        // State Check: Versuche Move
        const result = this.model.tryMove(r, c);
        
        if (result) {
            this.render(); // Nur neu rendern wenn sich was tat
            if (result === 'WIN') {
                this.isDrawing = false;
                this.playSound('win');
                setTimeout(() => {
                    document.getElementById('modal-win').style.display = 'flex';
                }, 300);
            } else {
                // Kleines Feedback haptisch/audio optional
            }
        }
    }

    handleEnd() {
        this.isDrawing = false;
    }

    render() {
        this.boardEl.innerHTML = '';
        
        // Map für schnellen Zugriff auf Pfad-Index: "r,c" -> pathIndex
        const pathMap = new Map();
        this.model.path.forEach((p, i) => pathMap.set(`${p.r},${p.c}`, i));

        for (let r = 0; r < this.model.rows; r++) {
            for (let c = 0; c < this.model.cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.r = r;
                cell.dataset.c = c;

                const initialVal = this.model.initialGrid[r][c];
                const pathIdx = pathMap.get(`${r},${c}`);
                const isInPath = pathIdx !== undefined;

                // Inhalt
                if (initialVal === -1) {
                    cell.classList.add('wall');
                } else if (isInPath) {
                    cell.classList.add('path');
                    cell.innerText = this.model.path[pathIdx].val;
                    
                    // Ist es der aktuelle Kopf der Schlange?
                    if (pathIdx === this.model.path.length - 1) {
                        cell.classList.add('current-head');
                    }

                    // Verbindungslinien zeichnen
                    if (pathIdx < this.model.path.length - 1) {
                        const nextStep = this.model.path[pathIdx + 1];
                        if (nextStep.r < r) cell.dataset.dir = 'up';
                        if (nextStep.r > r) cell.dataset.dir = 'down';
                        if (nextStep.c < c) cell.dataset.dir = 'left';
                        if (nextStep.c > c) cell.dataset.dir = 'right';
                    }

                } else if (initialVal > 0) {
                    cell.classList.add('fixed');
                    cell.innerText = initialVal;
                }

                this.boardEl.appendChild(cell);
            }
        }
    }

    playSound(type) {
        // Simplifizierter Sound, ähnlich Sudoku
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        if (type === 'win') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        }
    }
}

// Start
window.onload = () => new ZipController();