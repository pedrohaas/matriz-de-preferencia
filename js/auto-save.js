// Persistência no localStorage: salvamento automático e análises salvas

const STORAGE_KEY = 'analisesSalvas';
const LEGACY_STORAGE_KEY = 'matrizesSalvas';
const AUTO_SAVE_DELAY_MS = 1000;
const STEP_NAMES = ['Apresentação', 'Critérios', 'Alternativas', 'Scores', 'Pesos', 'Tomada de Decisão'];

let autoSaveTimeout = null;
let lastSavedSnapshot = null;

function readSavedAnalyses() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (error) {
        console.error('Análises salvas ilegíveis:', error);
        return {};
    }
}

function writeSavedAnalyses(analyses) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(analyses));
}

function scheduleAutoSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(flushAutoSave, AUTO_SAVE_DELAY_MS);
    if (state.problemTitle && JSON.stringify(state) !== lastSavedSnapshot) setSaveStatus('Salvando…');
    refreshShell();
}

// Grava imediatamente o que estiver pendente. Sem título, ainda não há o que salvar.
function flushAutoSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = null;

    const snapshot = JSON.stringify(state);
    if (!state.problemTitle || snapshot === lastSavedSnapshot) return;

    const savedAt = new Date().toISOString();
    try {
        const analyses = readSavedAnalyses();
        analyses[state.matrixId] = { savedAt, state };
        writeSavedAnalyses(analyses);
    } catch (error) {
        console.error('Erro ao salvar:', error);
        setSaveStatus('Não foi possível salvar. O armazenamento do navegador pode estar cheio.', 'error');
        return;
    }

    lastSavedSnapshot = snapshot;
    setSaveStatus(`Salvo às ${new Date(savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
    renderSavedAnalyses();
}

// Não perde a última alteração ao fechar ou recarregar a página
window.addEventListener('pagehide', flushAutoSave);

function setSaveStatus(text, tone = '') {
    const status = document.getElementById('saveStatus');
    status.textContent = text;
    status.dataset.tone = tone;
}

// Último passo que os dados permitem abrir
function furthestReachableStep(analysis) {
    if (!analysis.problemTitle) return 1;
    if (analysis.criteria.length < 2) return 2;
    if (analysis.alternatives.length < 2) return 3;

    const alternativeIdList = analysis.alternatives.map(a => a.id);
    if (!analysis.criteria.every(c => isCriterionComplete(analysis.comparisonData[c.id], alternativeIdList))) return 4;

    const hasWeights = analysis.weightingMethod
        && analysis.criteria.every(c => Number.isFinite(analysis.weights[c.id]));
    return hasWeights ? 6 : 5;
}

function isValidItemList(list) {
    return Array.isArray(list) && list.every(item => typeof item?.id === 'string' && typeof item?.name === 'string');
}

function hydrateState(saved) {
    if (!saved || !isValidItemList(saved.criteria) || !isValidItemList(saved.alternatives)) {
        throw new Error('Dados salvos inválidos.');
    }
    return { ...createInitialState(), ...saved };
}

function syncFixedFields() {
    document.getElementById('problemTitle').value = state.problemTitle;
    document.getElementById('problemDescription').value = state.problemDescription;
    document.getElementById('weightingMethod').value = state.weightingMethod;
}

// Substitui a análise em tela e abre o passo pedido, limitado ao que os dados permitem
function loadAnalysis(analysis, step) {
    clearTimeout(autoSaveTimeout);
    state = analysis;
    state.currentStep = Math.min(step, furthestReachableStep(analysis));
    lastSavedSnapshot = JSON.stringify(state);

    syncFixedFields();
    ['comparisonInterface', 'weightingInterface', 'resultsInterface'].forEach(id => {
        document.getElementById(id).innerHTML = '';
    });
    updateCriteriaList();
    updateAlternativesList();
    showStep(state.currentStep);

    // Apenas abrir uma análise não conta como alteração
    clearTimeout(autoSaveTimeout);
    lastSavedSnapshot = JSON.stringify(state);
    setSaveStatus('Salvamento automático ativo');
}

function openAnalysis(id) {
    flushAutoSave();
    const stored = readSavedAnalyses()[id];
    try {
        const analysis = hydrateState(stored?.state);
        loadAnalysis(analysis, analysis.currentStep);
        showSuccess(`Análise "${analysis.problemTitle}" aberta.`);
    } catch (error) {
        console.error('Erro ao abrir análise:', error);
        showError('Não foi possível abrir esta análise. Os dados salvos estão inválidos.');
    }
}

function deleteAnalysis(id) {
    const analyses = readSavedAnalyses();
    const title = analyses[id]?.state?.problemTitle ?? '';
    const removed = analyses[id];
    const wasOpen = id === state.matrixId;

    delete analyses[id];
    writeSavedAnalyses(analyses);

    // Sem isso, a próxima alteração recriaria a análise que acabou de ser excluída
    if (wasOpen) resetApp();
    renderSavedAnalyses();
    if (wasOpen) setView('home');

    offerUndo(`Análise "${title}" excluída.`, () => {
        const current = readSavedAnalyses();
        current[id] = removed;
        writeSavedAnalyses(current);
        renderSavedAnalyses();
    });
}

// Em telas pequenas, quantas análises aparecem de uma vez; as demais ficam a uma rolagem de
// distância. Nas maiores, a lista ocupa o espaço que sobra na janela (veja HOME_FIT_QUERY).
const SAVED_VISIBLE_ROWS = 5;
const MIN_ANALYSES_FOR_SEARCH = 2;

// Compara sem distinguir maiúsculas nem acentos
const searchable = text => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function renderSavedAnalyses() {
    const container = document.getElementById('savedAnalysesList');
    const searchBox = document.getElementById('savedSearchBox');
    const allEntries = Object.entries(readSavedAnalyses())
        .sort(([, a], [, b]) => String(b.savedAt).localeCompare(String(a.savedAt)));

    document.getElementById('savedCount').textContent = allEntries.length ? `(${allEntries.length})` : '';
    searchBox.hidden = allEntries.length < MIN_ANALYSES_FOR_SEARCH;
    if (searchBox.hidden) document.getElementById('savedSearch').value = '';

    const query = searchable(document.getElementById('savedSearch').value.trim());
    const entries = query
        ? allEntries.filter(([, { state: analysis }]) => searchable(analysis?.problemTitle).includes(query))
        : allEntries;

    if (allEntries.length === 0) {
        container.innerHTML = '<p class="saved-analyses-empty">Nenhuma análise salva ainda.</p>';
        fitSavedList();
        return;
    }
    if (entries.length === 0) {
        container.innerHTML = '<p class="saved-analyses-empty">Nenhuma análise com esse título.</p>';
        fitSavedList();
        return;
    }

    container.innerHTML = entries.map(([id, { savedAt, state: analysis }]) => {
        const savedDate = new Date(savedAt);
        const dateLabel = isNaN(savedDate) ? 'data desconhecida' : savedDate.toLocaleString('pt-BR');
        const stepName = STEP_NAMES[(analysis?.currentStep ?? 1) - 1] ?? STEP_NAMES[0];
        const isCurrent = id === state.matrixId;

        return `
            <div class="saved-analysis${isCurrent ? ' current' : ''}">
                <div class="saved-analysis-info">
                    <strong>${escapeHtml(analysis?.problemTitle ?? 'Sem título')}</strong>${isCurrent ? ' <span class="saved-analysis-badge">Aberta</span>' : ''}
                    <small>Salva em ${escapeHtml(dateLabel)} · Etapa: ${escapeHtml(stepName)} · ${analysis?.criteria?.length ?? 0} critério(s), ${analysis?.alternatives?.length ?? 0} alternativa(s)</small>
                </div>
                <div class="saved-analysis-actions">
                    <button class="btn btn-primary btn-small" data-action="openAnalysis" data-id="${escapeHtml(id)}" aria-label="Abrir ${escapeHtml(analysis?.problemTitle ?? 'Sem título')}">${isCurrent ? 'Continuar' : 'Abrir'}</button>
                    <button class="remove-btn" data-action="deleteAnalysis" data-id="${escapeHtml(id)}" aria-label="Excluir ${escapeHtml(analysis?.problemTitle ?? 'Sem título')}">Excluir</button>
                </div>
            </div>
        `;
    }).join('');
    fitSavedList();
}

// Limita a altura da lista às primeiras análises; a lista some da tela quando oculta, por isso
// a medida é refeita ao voltar para a tela inicial e ao redimensionar a janela
function fitSavedList() {
    const container = document.getElementById('savedAnalysesList');
    const rows = container.querySelectorAll('.saved-analysis');
    container.style.maxHeight = '';
    if (container.offsetParent === null) return;
    if (window.matchMedia(HOME_FIT_QUERY).matches) {
        const scrollable = container.scrollHeight > container.clientHeight + 1;
        container.classList.toggle('is-scrollable', scrollable);
        container.tabIndex = scrollable ? 0 : -1;
        return;
    }
    const scrollable = rows.length > SAVED_VISIBLE_ROWS;
    container.classList.toggle('is-scrollable', scrollable);
    container.tabIndex = scrollable ? 0 : -1;
    if (!scrollable) return;
    const last = rows[SAVED_VISIBLE_ROWS - 1];
    container.style.maxHeight = `${last.offsetTop + last.offsetHeight - rows[0].offsetTop + 2 * parseFloat(getComputedStyle(container).paddingTop)}px`;
}

document.addEventListener('input', event => {
    if (event.target.id === 'savedSearch') {
        renderSavedAnalyses();
        document.getElementById('savedAnalysesList').scrollTop = 0;
    }
});
window.addEventListener('resize', () => {
    if (document.body.classList.contains('view-home')) fitSavedList();
});

// Converte as matrizes do formato anterior, que usava o título como chave.
// Entradas sem conteúdo eram só títulos parciais gravados durante a digitação.
// O que não puder ser convertido permanece na chave antiga.
function migrateLegacyAnalyses() {
    let legacy;
    try {
        legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    } catch (error) {
        console.error('Matrizes antigas ilegíveis:', error);
        return;
    }
    if (!legacy) return;

    const analyses = readSavedAnalyses();
    const failed = {};

    Object.entries(legacy).forEach(([title, data]) => {
        try {
            if (!data.criteria?.length && !data.alternatives?.length) return;

            const usesIds = typeof (data.criteria?.[0] ?? data.alternatives?.[0]) === 'object';
            let analysis;
            if (usesIds) {
                const { lastSaved, ...saved } = data;
                analysis = hydrateState(saved);
            } else {
                analysis = buildStateFromNames({
                    title: data.problemTitle || title,
                    description: data.problemDescription,
                    criteria: data.criteria ?? [],
                    alternatives: data.alternatives ?? [],
                    comparison: data.comparisonData,
                });
                analysis.currentStep = Math.min(furthestReachableStep(analysis), 5);
            }
            analyses[analysis.matrixId] = { savedAt: data.lastSaved ?? new Date().toISOString(), state: analysis };
        } catch (error) {
            console.error(`Matriz "${title}" não convertida:`, error);
            failed[title] = data;
        }
    });

    writeSavedAnalyses(analyses);
    if (Object.keys(failed).length > 0) {
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(failed));
    } else {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
}

// Recebe as análises vindas do endereço antigo (veja canonical-site.js). Como os dados
// chegam por um link, só são gravados com a confirmação do usuário e depois de validados.
function receiveMigratedAnalyses(hash) {
    if (!hash.startsWith(MIGRATION_HASH_PREFIX)) return;
    history.replaceState(null, '', location.pathname + location.search);

    let received;
    let incoming;
    let legacy;
    try {
        received = JSON.parse(decodeURIComponent(hash.slice(MIGRATION_HASH_PREFIX.length)));
        incoming = received.analyses ? JSON.parse(received.analyses) : {};
        legacy = received.legacy ? JSON.parse(received.legacy) : {};
    } catch (error) {
        console.error('Análises recebidas ilegíveis:', error);
        return;
    }

    const validEntries = Object.entries(incoming).filter(([, entry]) => {
        try {
            return hydrateState(entry?.state).matrixId === entry.state.matrixId;
        } catch (error) {
            return false;
        }
    });
    const total = validEntries.length + Object.keys(legacy).length;
    if (total === 0) return;
    if (!confirm(`O site mudou de endereço. Trazer ${total} análise(s) salva(s) no endereço antigo para este?`)) return;

    const analyses = readSavedAnalyses();
    validEntries.forEach(([, entry]) => {
        const id = entry.state.matrixId;
        if (!analyses[id]) analyses[id] = entry;
    });
    writeSavedAnalyses(analyses);

    if (Object.keys(legacy).length > 0) {
        let currentLegacy = {};
        try {
            currentLegacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY)) || {};
        } catch (error) {
            console.error('Matrizes antigas ilegíveis:', error);
        }
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ ...legacy, ...currentLegacy }));
    }
}

registerActions({
    openAnalysis: el => openAnalysis(el.dataset.id),
    deleteAnalysis: el => deleteAnalysis(el.dataset.id),
});
