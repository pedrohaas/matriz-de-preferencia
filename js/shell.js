// Estrutura da interface: tela inicial, exemplos, painel da matriz em construção,
// requisitos de cada passo, modo de apresentação e configurações

const STEP_NEXT_LABELS = ['Critérios', 'Alternativas', 'Scores', 'Pesos', 'Tomada de Decisão'];

// ---- Telas ----

function setView(view) {
    document.body.classList.toggle('view-home', view === 'home');
    document.body.classList.toggle('view-wizard', view === 'wizard');
}

function goHome() {
    flushAutoSave();
    setView('home');
    renderSavedAnalyses();
    renderExamples();
    window.scrollTo(0, 0);
    document.getElementById('homeTitle').focus({ preventScroll: true });
}

function newAnalysis() {
    flushAutoSave();
    resetApp();
    document.getElementById('problemTitle').focus();
}

function renderExamples() {
    document.getElementById('examplesList').innerHTML = EXAMPLES.map(example => `
        <button type="button" class="example-card" data-action="openExample" data-id="${escapeHtml(example.id)}">
            <span class="example-title">${escapeHtml(example.dados.problema)}</span>
            <span class="example-description">${escapeHtml(example.dados.descricao)}</span>
            <span class="example-meta">${escapeHtml(example.dados.metodo)} · ${example.dados.criterios.length} critérios · ${example.dados.alternativas.length} alternativas</span>
        </button>
    `).join('');
}

function openExample(id) {
    const example = EXAMPLES.find(item => item.id === id);
    if (!example) return;
    flushAutoSave();
    importAnalysisText(JSON.stringify(example.dados));
    showSuccess(`Exemplo "${example.dados.problema}" aberto. Clique em "Avançar" para ver a tomada de decisão.`);
}

// ---- Requisitos de cada passo ----

function countMissing(total, minimum) {
    return Math.max(0, minimum - total);
}

// O que ainda falta para avançar do passo, sem mostrar erros. Texto vazio quando está pronto.
function getStepRequirement(step) {
    if (step === 1) return state.problemTitle ? '' : 'Falta: título do problema';
    if (step === 2) {
        const missing = countMissing(state.criteria.length, 2);
        return missing ? `Falta: ${missing} critério${missing > 1 ? 's' : ''}` : '';
    }
    if (step === 3) {
        const missing = countMissing(state.alternatives.length, 2);
        return missing ? `Falta: ${missing} alternativa${missing > 1 ? 's' : ''}` : '';
    }
    if (step === 4) {
        const pending = state.criteria.filter(c => !isCriterionComplete(state.comparisonData[c.id], alternativeIds())).length;
        return pending ? `Falta: scores em ${pending} critério${pending > 1 ? 's' : ''}` : '';
    }
    if (step === 5) return getWeightingRequirement();
    return '';
}

function getWeightingRequirement() {
    if (!state.weightingMethod) return 'Falta: escolher o método de pesagem';

    if (state.weightingMethod === 'ranksum') {
        if (!document.getElementById(`ranksum_${state.criteria[0]?.id}`)) return '';
        const result = computeRankSumWeights(readRankSumForm());
        if (result.duplicate) return 'Há posições repetidas';
        const missing = Object.values(readRankSumForm()).filter(rank => isNaN(rank)).length;
        return missing ? `Falta: posição de ${missing} critério${missing > 1 ? 's' : ''}` : '';
    }

    const mostImportant = document.getElementById('mostImportant');
    if (!mostImportant) return '';
    if (!mostImportant.value) return 'Falta: o critério de maior impacto';
    const missing = state.criteria
        .filter(c => c.id !== mostImportant.value)
        .filter(c => {
            const value = parseFloat(document.getElementById(`swingweight_${c.id}`)?.value);
            return isNaN(value) || value < 0 || value > 100;
        }).length;
    return missing ? `Falta: impacto de ${missing} critério${missing > 1 ? 's' : ''}` : '';
}

function updateStepHint() {
    const step = state.currentStep;
    const hint = document.getElementById(`hint-step${step}`);
    if (!hint) return;

    const requirement = getStepRequirement(step);
    const text = step === 6 ? '' : requirement || `Pronto para avançar para ${STEP_NEXT_LABELS[step - 1]}`;
    if (hint.textContent !== text) hint.textContent = text;
    hint.classList.toggle('is-ready', !requirement);
}

function updateStepMeta() {
    const plural = (n, singular, pluralWord) => `${n} ${n === 1 ? singular : pluralWord}`;
    const scored = state.criteria.filter(c => isCriterionComplete(state.comparisonData[c.id], alternativeIds())).length;
    const meta = [
        state.problemTitle ? 'Definido' : '',
        state.criteria.length ? plural(state.criteria.length, 'critério', 'critérios') : '',
        state.alternatives.length ? plural(state.alternatives.length, 'alternativa', 'alternativas') : '',
        state.criteria.length && state.alternatives.length ? `${scored} de ${state.criteria.length} critérios` : '',
        state.weightingMethod ? getWeightingMethodName() : '',
        '',
    ];
    meta.forEach((text, index) => {
        const element = document.getElementById(`prog-meta-${index}`);
        if (element && element.textContent !== text) element.textContent = text;
    });
}

// ---- Matriz em construção ----

const MATRIX_PANEL_HINTS = [
    'A matriz é construída ao longo dos passos, como na Tabela 5.1 do livro.',
    'Cada critério vira uma linha da matriz.',
    'Cada alternativa vira uma coluna.',
    'Os scores preenchem as células, de 0 a 10.',
    'Os pesos completam a coluna Peso e somam 100%.',
    'O total de cada coluna é a soma de score × peso.',
];

function hasCompleteWeights() {
    return state.criteria.length > 0
        && state.criteria.every(c => Number.isFinite(state.weights[c.id]))
        && Object.values(state.weights).some(weight => weight > 0);
}

function renderBuildingMatrix() {
    const container = document.getElementById('buildingMatrix');
    const step = state.currentStep;
    document.getElementById('matrixPanelHint').textContent = MATRIX_PANEL_HINTS[step - 1];

    if (state.criteria.length === 0 && state.alternatives.length === 0) {
        container.innerHTML = '<p class="empty-state">Os critérios aparecem aqui assim que forem adicionados.</p>';
        return;
    }

    const showWeights = step >= 5 && hasCompleteWeights();
    const showTotals = step === 6 && showWeights && state.alternatives.length > 0
        && state.criteria.every(c => isCriterionComplete(state.comparisonData[c.id], alternativeIds()));
    const finals = showTotals
        ? computeFinalScores(criterionIds(), alternativeIds(), state.comparisonData, state.weights)
        : null;

    const headers = state.alternatives.length
        ? state.alternatives.map(a => `<th scope="col">${escapeHtml(a.name)}</th>`).join('')
        : '<th scope="col" class="placeholder">Alternativas</th>';

    const rows = state.criteria.length
        ? state.criteria.map(criterion => {
            const entry = state.comparisonData[criterion.id];
            const cells = state.alternatives.length
                ? state.alternatives.map(alternative => {
                    const score = getScore(entry, alternative.id);
                    return score === null ? '<td class="pending">·</td>' : `<td>${score}</td>`;
                }).join('')
                : '<td class="pending">·</td>';
            const weight = showWeights ? `${(state.weights[criterion.id] * 100).toFixed(1)}%` : '·';
            return `<tr><th scope="row">${escapeHtml(criterion.name)}</th><td class="${showWeights ? '' : 'pending'}">${weight}</td>${cells}</tr>`;
        }).join('')
        : `<tr><th scope="row" class="placeholder">Critérios</th><td class="pending">·</td>${state.alternatives.map(() => '<td class="pending">·</td>').join('')}</tr>`;

    const totals = showTotals
        ? `<tfoot><tr><th scope="row">Total</th><td>100%</td>${state.alternatives.map(a => `<td>${finals[a.id].toFixed(2)}</td>`).join('')}</tr></tfoot>`
        : '';

    container.innerHTML = `
        <div class="table-scroll">
            <table class="building-matrix" data-focus="${['problem', 'criteria', 'alternatives', 'scores', 'weights', 'result'][step - 1]}">
                <thead><tr><th scope="col">Critério</th><th scope="col">Peso</th>${headers}</tr></thead>
                <tbody>${rows}</tbody>
                ${totals}
            </table>
        </div>
    `;
}

// Atualiza tudo o que depende do estado em volta do passo atual
function refreshShell() {
    updateStepMeta();
    updateStepHint();
    renderBuildingMatrix();
}

// ---- Preferências de exibição ----

function syncDisplayToggles() {
    const matrixOn = !document.documentElement.classList.contains('matrix-panel-off');
    document.getElementById('toggleMatrixPanel').setAttribute('aria-pressed', String(matrixOn));
    const presentationOn = document.documentElement.classList.contains('presentation-mode');
    document.getElementById('togglePresentation').setAttribute('aria-pressed', String(presentationOn));
}

function toggleMatrixPanel() {
    const visible = document.documentElement.classList.contains('matrix-panel-off');
    writePreference('matriz', visible);
    applyDisplayPreferences();
    syncDisplayToggles();
    if (visible) renderBuildingMatrix();
}

function togglePresentation() {
    writePreference('apresentacao', !document.documentElement.classList.contains('presentation-mode'));
    applyDisplayPreferences();
    syncDisplayToggles();
}

// ---- Configurações ----

let settingsReturnFocus = null;

function openSettings() {
    settingsReturnFocus = document.activeElement;
    document.getElementById('settingsDrawer').hidden = false;
    document.getElementById('settingsBackdrop').hidden = false;
    document.getElementById('apiKey').focus();
}

function closeSettings() {
    document.getElementById('settingsDrawer').hidden = true;
    document.getElementById('settingsBackdrop').hidden = true;
    settingsReturnFocus?.focus?.();
}

document.addEventListener('keydown', event => {
    const drawer = document.getElementById('settingsDrawer');
    if (!drawer || drawer.hidden) return;

    if (event.key === 'Escape') {
        closeSettings();
    } else if (event.key === 'Tab') {
        const focusable = [...drawer.querySelectorAll('button, input, a[href]')].filter(e => !e.disabled);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
});

// ---- Desfazer ----

const UNDO_TIMEOUT_MS = 8000;
let pendingUndo = null;
let undoTimer = null;

// Em vez de pedir confirmação antes, a ação acontece e pode ser desfeita por alguns segundos
function offerUndo(message, restore) {
    pendingUndo = restore;
    const bar = document.getElementById('undoBar');
    bar.querySelector('.undo-text').textContent = message;
    bar.hidden = false;
    clearTimeout(undoTimer);
    undoTimer = setTimeout(hideUndo, UNDO_TIMEOUT_MS);
}

function hideUndo() {
    clearTimeout(undoTimer);
    pendingUndo = null;
    document.getElementById('undoBar').hidden = true;
}

function undoLastAction() {
    const restore = pendingUndo;
    hideUndo();
    if (!restore) return;
    restore();
    showSuccess('Ação desfeita.');
}

// Volta a análise inteira a um estado anterior, guardado como JSON
function restoreStateSnapshot(snapshot) {
    state = hydrateState(JSON.parse(snapshot));
    lastSavedSnapshot = null;
    syncFixedFields();
    updateCriteriaList();
    updateAlternativesList();
    showStep(state.currentStep);
}

registerActions({
    undo: undoLastAction,
    dismissUndo: hideUndo,
    goHome,
    newAnalysis,
    openExample: el => openExample(el.dataset.id),
    toggleMatrixPanel,
    togglePresentation,
    openSettings,
    closeSettings,
});
