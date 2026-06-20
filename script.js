/* ============================================
   CALCULATOR - Full Logic
============================================ */

// ============================================
// STATE
// ============================================
const state = {
    currentInput: '0',
    previousInput: '',
    operator: null,
    shouldResetInput: false,
    justEvaluated: false,
    history: [],
    isDarkMode: false,
    soundEnabled: true,
    expression: '',
};

// ============================================
// DOM REFERENCES
// ============================================
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const displayResult = $('#displayResult');
const displayExpression = $('#displayExpression');
const displayHistory = $('#displayHistory');
const historyList = $('#historyList');
const historyBadge = $('#historyBadge');
const historyPanel = $('#historyPanel');
const toast = $('#toast');
const toastMessage = $('#toastMessage');
const loadingScreen = $('#loadingScreen');

// ============================================
// AUDIO (Web Audio API - no external files)
// ============================================
let audioCtx = null;

function playClick() {
    if (!state.soundEnabled) return;
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.08;
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.05);
    } catch (_) { /* silently fail */ }
}

function playError() {
    if (!state.soundEnabled) return;
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.value = 300;
        oscillator.type = 'sawtooth';
        gainNode.gain.value = 0.06;
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (_) { /* silently fail */ }
}

// ============================================
// DISPLAY UPDATE
// ============================================
function updateDisplay() {
    let displayValue = state.currentInput;

    // Handle error
    if (displayValue === 'Error') {
        displayResult.textContent = 'Error';
        displayResult.className = 'display-result error';
        return;
    }

    displayResult.className = 'display-result';

    // Format long numbers
    if (displayValue.length > 14 && !isNaN(displayValue)) {
        const num = parseFloat(displayValue);
        if (!isNaN(num)) {
            if (Number.isInteger(num) && num.toString().length > 14) {
                displayValue = num.toExponential(6);
            } else if (displayValue.includes('.')) {
                displayValue = num.toPrecision(10);
            } else {
                displayValue = num.toExponential(6);
            }
        }
    }

    displayResult.textContent = displayValue;

    // Shrink if too long
    if (displayValue.length > 12) {
        displayResult.classList.add('shrink');
    } else {
        displayResult.classList.remove('shrink');
    }

    // Update expression
    updateExpression();

    // Update history display
    updateHistoryDisplay();
}

function updateExpression() {
    if (state.operator && state.previousInput) {
        const opSymbols = {
            '+': '+',
            '−': '−',
            '×': '×',
            '÷': '÷',
            '%': '%',
        };
        displayExpression.textContent = `${state.previousInput} ${opSymbols[state.operator] || state.operator}`;
    } else {
        displayExpression.textContent = '';
    }
}

function updateHistoryDisplay() {
    if (state.expression && state.justEvaluated) {
        displayHistory.textContent = state.expression;
    } else {
        displayHistory.textContent = '';
    }
}

// ============================================
// CORE MATH
// ============================================
function evaluate(a, op, b) {
    const numA = parseFloat(a);
    const numB = parseFloat(b);

    if (isNaN(numA) || isNaN(numB)) return 'Error';

    let result;
    switch (op) {
        case '+':
            result = numA + numB;
            break;
        case '−':
            result = numA - numB;
            break;
        case '×':
            result = numA * numB;
            break;
        case '÷':
            if (numB === 0) return 'Error';
            result = numA / numB;
            break;
        case '%':
            if (numB === 0) return 'Error';
            result = numA % numB;
            break;
        default:
            return b;
    }

    // Clean floating point
    if (typeof result === 'number' && !Number.isInteger(result)) {
        result = parseFloat(result.toPrecision(12));
    }

    return String(result);
}

// ============================================
// ACTIONS
// ============================================
function inputDigit(digit) {
    if (state.justEvaluated) {
        resetAfterEvaluation();
    }

    if (state.shouldResetInput) {
        state.currentInput = '0';
        state.shouldResetInput = false;
    }

    if (digit === '.' && state.currentInput.includes('.')) return;

    if (state.currentInput === '0' && digit !== '.') {
        state.currentInput = digit;
    } else {
        if (state.currentInput.length >= 18) return;
        state.currentInput += digit;
    }

    playClick();
    updateDisplay();
}

function handleOperator(op) {
    playClick();

    if (state.justEvaluated) {
        state.previousInput = state.currentInput;
        state.operator = op;
        state.shouldResetInput = true;
        state.justEvaluated = false;
        updateDisplay();
        return;
    }

    const currentNum = state.currentInput;

    if (state.operator && state.previousInput && !state.shouldResetInput) {
        const result = evaluate(state.previousInput, state.operator, currentNum);
        if (result === 'Error') {
            state.currentInput = 'Error';
            state.operator = null;
            state.previousInput = '';
            state.shouldResetInput = false;
            playError();
            updateDisplay();
            return;
        }
        state.currentInput = result;
        state.previousInput = state.currentInput;
        state.operator = op;
        state.shouldResetInput = true;
        updateDisplay();
    } else {
        state.previousInput = currentNum;
        state.operator = op;
        state.shouldResetInput = true;
        updateDisplay();
    }
    state.justEvaluated = false;
}

function handleEquals() {
    playClick();

    if (!state.operator || !state.previousInput) {
        state.justEvaluated = true;
        return;
    }

    const expr = `${state.previousInput} ${state.operator} ${state.currentInput}`;
    const result = evaluate(state.previousInput, state.operator, state.currentInput);

    if (result === 'Error') {
        state.currentInput = 'Error';
        state.operator = null;
        state.previousInput = '';
        state.shouldResetInput = false;
        playError();
        updateDisplay();
        return;
    }

    state.expression = `${expr} = ${result}`;
    state.currentInput = result;
    state.previousInput = '';
    state.operator = null;
    state.shouldResetInput = true;
    state.justEvaluated = true;

    // Save to history
    addHistory(state.expression);

    updateDisplay();
}

function resetAfterEvaluation() {
    state.currentInput = '0';
    state.previousInput = '';
    state.operator = null;
    state.shouldResetInput = false;
    state.justEvaluated = false;
    state.expression = '';
}

function clearAll() {
    playClick();
    state.currentInput = '0';
    state.previousInput = '';
    state.operator = null;
    state.shouldResetInput = false;
    state.justEvaluated = false;
    state.expression = '';
    updateDisplay();
}

function backspace() {
    playClick();
    if (state.justEvaluated) {
        clearAll();
        return;
    }
    if (state.currentInput.length === 1 || (state.currentInput.length === 2 && state.currentInput.startsWith('-'))) {
        state.currentInput = '0';
    } else {
        state.currentInput = state.currentInput.slice(0, -1);
    }
    updateDisplay();
}

function handlePercent() {
    playClick();
    const num = parseFloat(state.currentInput);
    if (isNaN(num)) return;
    state.currentInput = String(num / 100);
    updateDisplay();
}

function copyResult() {
    const text = displayResult.textContent;
    if (!text || text === '0' || text === 'Error') return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied! ✅');
        }).catch(() => {
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast('Copied! ✅');
}

// ============================================
// HISTORY
// ============================================
function addHistory(entry) {
    const timestamp = new Date().toLocaleTimeString();
    state.history.unshift({ entry, timestamp });
    if (state.history.length > 50) state.history.pop();
    saveHistoryToStorage();
    renderHistory();
}

function renderHistory() {
    if (state.history.length === 0) {
        historyList.innerHTML = `
            <div class="history-empty">
                <i class="fas fa-calculator"></i>
                <p>No calculations yet</p>
            </div>
        `;
        historyBadge.textContent = '0';
        return;
    }

    historyList.innerHTML = state.history.map((item, index) => `
        <div class="history-item" data-index="${index}">
            <div class="h-expr">${item.entry}</div>
            <div class="h-time">${item.timestamp}</div>
        </div>
    `).join('');

    historyBadge.textContent = state.history.length;
}

function clearHistory() {
    state.history = [];
    saveHistoryToStorage();
    renderHistory();
    showToast('History cleared 🗑️');
}

// ============================================
// LOCAL STORAGE
// ============================================
function saveHistoryToStorage() {
    try {
        localStorage.setItem('calcHistory', JSON.stringify(state.history));
    } catch (_) { /* ignore */ }
}

function loadHistoryFromStorage() {
    try {
        const data = localStorage.getItem('calcHistory');
        if (data) {
            state.history = JSON.parse(data);
            renderHistory();
        }
    } catch (_) { /* ignore */ }
}

function saveThemeToStorage() {
    try {
        localStorage.setItem('calcTheme', state.isDarkMode ? 'dark' : 'light');
    } catch (_) { /* ignore */ }
}

// ============================================
// THEME - UPDATED
// ============================================
function loadThemeFromStorage() {
    try {
        const theme = localStorage.getItem('calcTheme');
        if (theme === 'light') {
            state.isDarkMode = false;
            document.documentElement.removeAttribute('data-theme');
            const themeBtn = document.querySelector('.theme-btn');
            if (themeBtn) themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            state.isDarkMode = true;
            document.documentElement.setAttribute('data-theme', 'dark');
            const themeBtn = document.querySelector('.theme-btn');
            if (themeBtn) themeBtn.innerHTML = '<i class="fas fa-moon"></i>';
        }
    } catch (_) { /* ignore */ }
}

function toggleTheme() {
    state.isDarkMode = !state.isDarkMode;
    
    if (state.isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        const themeBtn = document.querySelector('.theme-btn');
        if (themeBtn) themeBtn.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        document.documentElement.removeAttribute('data-theme');
        const themeBtn = document.querySelector('.theme-btn');
        if (themeBtn) themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    saveThemeToStorage();
    playClick();
}

function updateThemeIcons() {
    const themeBtn = document.querySelector('.theme-btn');
    if (!themeBtn) return;
    
    if (state.isDarkMode) {
        themeBtn.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// ============================================
// TOAST
// ============================================
let toastTimeout = null;

function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 2200);
}

// ============================================
// HISTORY PANEL
// ============================================
let historyOpen = false;

function toggleHistory() {
    historyOpen = !historyOpen;
    historyPanel.classList.toggle('open', historyOpen);
}

// ============================================
// SOUND TOGGLE
// ============================================
function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    const btn = $('#soundToggle');
    btn.classList.toggle('muted', !state.soundEnabled);
    btn.querySelector('i').className = state.soundEnabled ? 'fas fa-volume-high' : 'fas fa-volume-xmark';
    playClick();
}

// ============================================
// KEYBOARD SUPPORT
// ============================================
function handleKeyboard(e) {
    const key = e.key;

    // Prevent default for calculator keys
    const calcKeys = ['Enter', 'Backspace', 'Escape', 'Delete', 'Tab',
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.',
        '+', '-', '*', '/', '%', '='];

    if (calcKeys.includes(key) || key.startsWith('Arrow')) {
        e.preventDefault();
    }

    // Number keys
    if (/^[0-9]$/.test(key)) {
        inputDigit(key);
        return;
    }

    // Decimal
    if (key === '.') {
        inputDigit('.');
        return;
    }

    // Operators
    if (key === '+') { handleOperator('+'); return; }
    if (key === '-') { handleOperator('−'); return; }
    if (key === '*') { handleOperator('×'); return; }
    if (key === '/') { handleOperator('÷'); return; }
    if (key === '%') { handlePercent(); return; }

    // Equals / Enter
    if (key === '=' || key === 'Enter') {
        handleEquals();
        return;
    }

    // Backspace
    if (key === 'Backspace') {
        backspace();
        return;
    }

    // Clear (Escape, Delete)
    if (key === 'Escape' || key === 'Delete') {
        clearAll();
        return;
    }

    // History toggle (H key)
    if (key === 'h' || key === 'H') {
        toggleHistory();
        return;
    }

    // Copy (C key - only if not in input)
    if ((key === 'c' || key === 'C') && !e.ctrlKey && !e.metaKey) {
        copyResult();
        return;
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
function init() {
    // Loading screen
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 800);

    // Load saved data
    loadHistoryFromStorage();
    loadThemeFromStorage();

    // Button clicks - delegated
    document.querySelector('.button-grid').addEventListener('click', (e) => {
        const btn = e.target.closest('.btn');
        if (!btn) return;

        const action = btn.dataset.action;
        if (!action) return;

        switch (action) {
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
                inputDigit(action);
                break;
            case 'decimal':
                inputDigit('.');
                break;
            case 'add':
                handleOperator('+');
                break;
            case 'subtract':
                handleOperator('−');
                break;
            case 'multiply':
                handleOperator('×');
                break;
            case 'divide':
                handleOperator('÷');
                break;
            case 'percent':
                handlePercent();
                break;
            case 'equals':
                handleEquals();
                break;
            case 'clear-all':
                clearAll();
                break;
            case 'backspace':
                backspace();
                break;
            case 'copy':
                copyResult();
                break;
        }
    });

    // Theme toggle - UPDATED to use .theme-btn
    const themeBtn = document.querySelector('.theme-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
    }

    // History toggle - UPDATED to use .history-btn
    const historyBtn = document.querySelector('.history-btn');
    if (historyBtn) {
        historyBtn.addEventListener('click', toggleHistory);
    }

    // Clear history
    $('#clearHistory').addEventListener('click', clearHistory);

    // Sound toggle
    $('#soundToggle').addEventListener('click', toggleSound);

    // Keyboard
    document.addEventListener('keydown', handleKeyboard);

    // Close history on outside click (mobile friendly)
    document.addEventListener('click', (e) => {
        if (historyOpen) {
            const panel = historyPanel;
            const toggle = document.querySelector('.history-btn');
            if (!panel.contains(e.target) && !toggle.contains(e.target)) {
                toggleHistory();
            }
        }
    });

    // Initial render
    renderHistory();
    updateDisplay();

    // Update sound icon
    const soundBtn = $('#soundToggle');
    soundBtn.classList.remove('muted');
    soundBtn.querySelector('i').className = 'fas fa-volume-high';
}

// ============================================
// START APP
// ============================================
document.addEventListener('DOMContentLoaded', init);