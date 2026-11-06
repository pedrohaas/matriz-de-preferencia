// Passo de scores: assistente de âncoras e posicionamento das alternativas

function currentCriterionId() {
    return state.criteria[state.currentCriterionIndex].id;
}

function currentEntry() {
    return state.comparisonData[currentCriterionId()];
}

function setupComparisonInterface() {
    // Critérios novos começam vazios; os existentes preservam os dados
    state.criteria.forEach(criterion => {
        if (!state.comparisonData[criterion.id]) {
            state.comparisonData[criterion.id] = {};
        }
    });

    // Abre o primeiro critério pendente, ou o primeiro de todos se estiverem concluídos
    state.currentCriterionIndex = Math.max(0, state.criteria.findIndex(c => !isComplete(c.id)));

    showComparisonForCriterion();
}

function isComplete(criterionId) {
    return isCriterionComplete(state.comparisonData[criterionId], alternativeIds());
}

function renderCriterionNav() {
    const buttons = state.criteria.map((criterion, index) => {
        const done = isComplete(criterion.id);
        const isCurrent = index === state.currentCriterionIndex;
        const stateClass = isCurrent ? 'is-current' : done ? 'is-done' : '';
        const label = criterion.name.length > 15 ? `${criterion.name.slice(0, 13)}…` : criterion.name;

        return `<button data-action="goToCriterion" data-id="${criterion.id}" class="criterion-chip ${stateClass}" ${isCurrent ? 'aria-current="true"' : ''} title="${escapeHtml(criterion.name)}">${index + 1}. ${escapeHtml(label)}${done && !isCurrent ? ` ${icon('check', { label: 'concluído' })}` : ''}</button>`;
    }).join('');

    return `<div class="criterion-nav">${buttons}</div>`;
}

function renderManagementColumn(title, items, removeAction) {
    const rows = items.map((item, index) => `
        <div class="management-item">
            <span>${index + 1}. ${escapeHtml(item.name)}</span>
            ${items.length > 2
                ? `<button class="icon-btn icon-btn-danger" data-action="${removeAction}" data-id="${item.id}" aria-label="Remover ${escapeHtml(item.name)}">${icon('trash-2')}</button>`
                : '<span class="muted-xs">mín.</span>'}
        </div>
    `).join('');

    return `
        <div>
            <h4 class="panel-title">${title} (${items.length})</h4>
            <div class="stack-2">${rows}</div>
        </div>
    `;
}

function renderManagementPanel() {
    return `
        <div class="management-panel">
            <button type="button" data-action="toggleManagementPanel" aria-expanded="false" aria-controls="managementPanelContent" class="btn btn-secondary btn-small">
                ${icon('settings')} Gerenciar critérios e alternativas
            </button>
            <div class="management-content" id="managementPanelContent" style="display:none;">
                <div class="management-grid">
                    ${renderManagementColumn('Critérios', state.criteria, 'removeCriterionFromStep3')}
                    ${renderManagementColumn('Alternativas', state.alternatives, 'removeAlternativeFromStep3')}
                </div>
                <p class="note">
                    Ao remover um critério ou alternativa, os scores associados serão recalculados. Mínimo: 2 critérios e 2 alternativas.
                </p>
            </div>
        </div>
    `;
}

function renderAlternativeCards(action, excludedId = null) {
    const cards = state.alternatives
        .filter(alternative => alternative.id !== excludedId)
        .map(alternative => `
            <button type="button" class="alternative-card" data-action="${action}" data-id="${alternative.id}">
                ${escapeHtml(alternative.name)}
            </button>
        `).join('');
    return `<div class="alternatives-grid">${cards}</div>`;
}

function renderSelectBest(criterionName_) {
    return `
        <div class="stage">
            <h4>1. Qual alternativa é a MELHOR para o critério "${criterionName_}"?</h4>
            <p class="hint">Selecione a alternativa com melhor desempenho neste critério.</p>
            ${renderAlternativeCards('selectBest')}
        </div>
    `;
}

function renderBestScoreInput(entry) {
    const best = escapeHtml(alternativeName(entry.best));
    return `
        <div class="stage">
            <div class="success-message">${icon('circle-check')} Melhor alternativa selecionada: <strong>${best}</strong></div>
            <h4>2. Defina o score da melhor alternativa — Âncora Superior:</h4>
            <p class="hint">
                Atribua um score máximo (entre 0 e 10) para <strong>${best}</strong>, que representa o melhor desempenho neste critério.
            </p>
            <div class="form-group">
                <label for="bestScore">Score para "${best}" (0 a 10):</label>
                <input type="number" id="bestScore" data-enter="setBestScore" min="0" max="10" placeholder="Ex: 10" step="0.1">
                <button class="btn btn-primary mt-2" data-action="setBestScore">Confirmar</button>
            </div>
        </div>
    `;
}

function renderSelectWorst(entry, criterionName_) {
    return `
        <div class="stage">
            <div class="success-message">${icon('circle-check')} Melhor: ${escapeHtml(alternativeName(entry.best))} → Score ${entry.bestScore}</div>
            <h4>3. Qual alternativa é a PIOR para o critério "${criterionName_}"?</h4>
            <p class="hint">Selecione a alternativa com pior desempenho neste critério.</p>
            ${renderAlternativeCards('selectWorst', entry.best)}
        </div>
    `;
}

function renderWorstScoreInput(entry) {
    const worst = escapeHtml(alternativeName(entry.worst));
    return `
        <div class="stage">
            <div class="success-message">${icon('circle-check')} Melhor: ${escapeHtml(alternativeName(entry.best))} → Score ${entry.bestScore}</div>
            <div class="success-message">${icon('circle-check')} Pior alternativa selecionada: <strong>${worst}</strong></div>
            <h4>4. Defina o score da pior alternativa — Âncora Inferior:</h4>
            <p class="hint">
                Atribua um score mínimo (entre 0 e ${entry.bestScore}) para <strong>${worst}</strong>.
            </p>
            <div class="form-group">
                <label for="worstScore">Score para "${worst}" (0 a ${entry.bestScore}):</label>
                <input type="number" id="worstScore" data-enter="setWorstScore" min="0" max="${entry.bestScore}" placeholder="Ex: 0" step="0.1">
                <button class="btn btn-primary mt-2" data-action="setWorstScore">Confirmar</button>
            </div>
        </div>
    `;
}

function renderPositionScoreInput(entry) {
    const position = entry.selectedPosition;
    const minScore = getScore(entry, position.lower);
    const maxScore = getScore(entry, position.higher);
    const averageScore = Math.round((minScore + maxScore) / 2 * 10) / 10;
    const alternative = escapeHtml(alternativeName(position.alternative));

    return `
        <div class="stage">
            <div class="success-message">${icon('circle-check')} Posição selecionada: Entre "${escapeHtml(alternativeName(position.higher))}" e "${escapeHtml(alternativeName(position.lower))}"</div>
            <h4>Defina o score para "${alternative}":</h4>
            <div class="form-group">
                <label for="positionScore">Score para "${alternative}" (${minScore} - ${maxScore}):</label>
                <input type="number" id="positionScore" data-enter="setPositionBetweenScore" min="${minScore}" max="${maxScore}" placeholder="Ex: ${averageScore}" step="0.1" value="${averageScore}">
                <button class="btn btn-primary" data-action="setPositionBetweenScore">Definir Score</button>
            </div>
        </div>
    `;
}

// Alternativas com score definido, da maior para a menor nota
function getRankedAlternatives(entry) {
    return state.alternatives
        .map(alternative => ({ id: alternative.id, name: alternative.name, score: getScore(entry, alternative.id) }))
        .filter(item => item.score !== null)
        .sort((a, b) => b.score - a.score);
}

// Alternativa cujo score está sendo corrigido no critério atual
let editingScoreId = null;

function renderRankingRows(ranked, itemClass) {
    const entry = currentEntry();
    return ranked.map((item, index) => {
        const name = escapeHtml(item.name);
        if (item.id === editingScoreId) {
            const { min, max } = getScoreBounds(entry, item.id, alternativeIds());
            return `
                <div class="${itemClass} is-editing">
                    <span class="rank">${index + 1}º</span>
                    <label class="alt-name" for="editScoreInput">${name} <small class="muted-xs">(de ${min} a ${max})</small></label>
                    <input type="number" class="input-compact" id="editScoreInput" min="${min}" max="${max}" step="0.1" value="${item.score}" data-enter="confirmScoreEdit">
                    <button type="button" class="icon-btn" data-action="confirmScoreEdit" aria-label="Salvar score de ${name}">${icon('check')}</button>
                    <button type="button" class="icon-btn" data-action="cancelScoreEdit" aria-label="Cancelar correção">${icon('x')}</button>
                </div>
            `;
        }
        return `
            <div class="${itemClass}">
                <span class="rank">${index + 1}º</span>
                <span class="alt-name">${name}</span>
                <span class="alt-score">${item.score}</span>
                <button type="button" class="icon-btn" data-action="editScore" data-alternative="${item.id}" aria-label="Corrigir score de ${name}">${icon('pencil')}</button>
            </div>
        `;
    }).join('');
}

// ---- Régua de 0 a 10 ----

const RULER_ROW_GAP = 1.2;

// Distribui os rótulos em linhas para que nomes com scores próximos não se sobreponham
function layoutRulerMarkers(ranked) {
    const rowEnds = [];
    return ranked.slice().sort((a, b) => a.score - b.score).map(item => {
        let row = rowEnds.findIndex(lastScore => item.score - lastScore >= RULER_ROW_GAP);
        if (row === -1) {
            row = rowEnds.length;
            rowEnds.push(item.score);
        } else {
            rowEnds[row] = item.score;
        }
        return { ...item, row };
    });
}

function renderRuler(entry, pendingId, criterionLabel) {
    const markers = layoutRulerMarkers(getRankedAlternatives(entry));
    const rows = Math.max(1, ...markers.map(m => m.row + 1));
    const worst = entry.worstScore;
    const best = entry.bestScore;

    const markerHtml = markers.map(marker => {
        const short = marker.name.length > 16 ? `${marker.name.slice(0, 15)}…` : marker.name;
        // Perto das bordas, o rótulo se alinha para dentro e não alarga a página
        const align = marker.score <= 2 ? 'align-start' : marker.score >= 8 ? 'align-end' : '';
        return `
            <span class="ruler-marker ${align}" style="left: ${marker.score * 10}%; --row: ${rows - 1 - marker.row};" title="${escapeHtml(marker.name)}: ${marker.score}">
                ${escapeHtml(short)} <strong>${marker.score}</strong>
            </span>
            <span class="ruler-dot" style="left: ${marker.score * 10}%;"></span>
        `;
    }).join('');

    const ticks = Array.from({ length: 11 }, (_, i) => `<span class="ruler-tick" style="left: ${i * 10}%;">${i}</span>`).join('');

    let control = '';
    if (pendingId && best > worst) {
        const middle = Math.round((worst + best) / 2 * 10) / 10;
        const name = escapeHtml(alternativeName(pendingId));
        control = `
            <span class="ruler-input-wrap" style="left: ${worst * 10}%; width: ${(best - worst) * 10}%;">
                <input type="range" class="ruler-input" id="rulerInput" min="${worst}" max="${best}" step="0.1" value="${middle}"
                       aria-label="Score de ${name} em ${criterionLabel}, entre ${worst} e ${best}"
                       data-input="previewRulerScore" data-enter="confirmRulerScore" data-alternative="${pendingId}">
            </span>
        `;
    }

    return `
        <div class="ruler" style="--rows: ${rows};">
            <div class="ruler-area">
                <div aria-hidden="true">${markerHtml}</div>
                <div class="ruler-track" aria-hidden="true">
                    <span class="ruler-range" style="left: ${worst * 10}%; width: ${(best - worst) * 10}%;"></span>
                </div>
                ${control}
                <div class="ruler-ticks" aria-hidden="true">${ticks}</div>
            </div>
        </div>
    `;
}

function applyScore(entry, alternativeId, value) {
    if (alternativeId === entry.best) {
        entry.bestScore = value;
    } else if (alternativeId === entry.worst) {
        entry.worstScore = value;
    } else {
        entry.scores[alternativeId] = value;
    }
}

function roundScore(value) {
    return Math.round(value * 10) / 10;
}

function renderPositionOptions(alternativeId, ranked) {
    let options = '';

    // Entre duas alternativas consecutivas com notas diferentes
    for (let i = 0; i < ranked.length - 1; i++) {
        const higher = ranked[i];
        const lower = ranked[i + 1];
        if (higher.score !== lower.score) {
            options += `
                <button type="button" class="alternative-card" data-action="selectPositionBetween" data-alternative="${alternativeId}" data-higher="${higher.id}" data-lower="${lower.id}">
                    <span class="position-label">${icon('layers')} Entre "${escapeHtml(higher.name)}" e "${escapeHtml(lower.name)}" </span>
                    <span class="position-description">Range: ${lower.score} - ${higher.score}</span>
                </button>
            `;
        }
    }

    // No mesmo nível de uma alternativa já avaliada
    ranked.forEach(item => {
        options += `
            <button type="button" class="alternative-card" data-action="setSameLevel" data-alternative="${alternativeId}" data-reference="${item.id}">
                <span class="position-label">${icon('scale')} Mesmo nível de "${escapeHtml(item.name)}"</span>
                <span class="position-description">Score igual: ${item.score}</span>
            </button>
        `;
    });

    return options;
}

function renderPlacement(entry, nextAlternativeId, criterionName_) {
    const ranked = getRankedAlternatives(entry);
    const name = escapeHtml(alternativeName(nextAlternativeId));
    const middle = roundScore((entry.worstScore + entry.bestScore) / 2);
    const hasRange = entry.bestScore > entry.worstScore;

    return `
        <div class="stage">
            <h4>${icon('pin')} Onde posicionar "${name}"?</h4>
            <p class="hint">${hasRange
                ? `Mova o marcador azul até a posição de ${name} entre a pior e a melhor alternativa. No teclado, use as setas.`
                : `A melhor e a pior alternativa têm o mesmo score: escolha "Mesmo nível" abaixo.`}</p>
            ${renderRuler(entry, nextAlternativeId, criterionName_)}
            ${hasRange ? `
                <div class="ruler-confirm">
                    <span class="ruler-readout">${name}: <strong id="rulerValue">${middle}</strong></span>
                    <button type="button" class="btn btn-primary btn-small" data-action="confirmRulerScore" data-alternative="${nextAlternativeId}">Definir score</button>
                </div>
            ` : ''}
            <details class="position-alternatives" ${hasRange ? '' : 'open'}>
                <summary>Ou escolha uma posição relativa às já avaliadas</summary>
                <div class="position-options">${renderPositionOptions(nextAlternativeId, ranked)}</div>
            </details>
            <div class="ranking-display">
                <h4>${icon('trophy')} Ranking atual para "${criterionName_}"</h4>
                ${renderRankingRows(ranked, 'ranking-item')}
            </div>
        </div>
    `;
}

// Revisões que o livro recomenda depois de todos os scores
function renderBookChecks() {
    const uniform = findUniformCriteria(criterionIds(), alternativeIds(), state.comparisonData);
    const dominated = findDominatedAlternatives(criterionIds(), alternativeIds(), state.comparisonData);
    if (uniform.length === 0 && dominated.length === 0) return '';

    const canRemoveCriterion = state.criteria.length > 2;
    const canRemoveAlternative = state.alternatives.length > 2;
    const items = [
        ...uniform.map(id => `
            <li>O critério <strong>${escapeHtml(criterionName(id))}</strong> tem o mesmo score em todas as alternativas e não ajuda a compará-las. O livro recomenda eliminá-lo.
                ${canRemoveCriterion ? `<button type="button" class="chip-btn" data-action="removeCriterionFromStep3" data-id="${id}">Remover critério</button>` : ''}</li>
        `),
        ...dominated.map(({ id, dominatedBy }) => `
            <li><strong>${escapeHtml(alternativeName(id))}</strong> é dominada por ${dominatedBy.map(other => `<strong>${escapeHtml(alternativeName(other))}</strong>`).join(', ')}: não é melhor em nenhum critério. O livro recomenda eliminá-la.
                ${canRemoveAlternative ? `<button type="button" class="chip-btn" data-action="removeAlternativeFromStep3" data-id="${id}">Remover alternativa</button>` : ''}</li>
        `),
    ].join('');

    return `
        <div class="callout callout-warning" id="bookChecks">
            <strong class="callout-title">${icon('triangle-alert')} Revisão recomendada pelo livro</strong>
            <ul class="callout-list">${items}</ul>
            <span class="callout-note">Remover é opcional e pode ser desfeito.</span>
        </div>
    `;
}

function renderCriterionDone(entry, criterionId, criterionName_) {
    const resetButton = `
        <button class="btn btn-secondary" data-action="resetCurrentCriterion" title="Refazer os scores deste critério">
            ${icon('rotate-ccw')} Reiniciar este critério
        </button>
    `;
    const pending = state.criteria.filter(c => c.id !== criterionId && !isComplete(c.id));

    let guidance;
    if (pending.length === 0) {
        guidance = `
            <div class="callout callout-success">
                <strong class="callout-title">${icon('circle-check')} Todos os critérios foram avaliados!</strong>
                Use o botão <strong>"Avançar: Pesos"</strong> para continuar para a atribuição de pesos.
            </div>
            ${renderBookChecks()}
            <div class="mt-3">${resetButton}</div>
        `;
    } else {
        const pendingLinks = pending.map(c => `
            <button class="chip-btn" data-action="goToCriterion" data-id="${c.id}">${state.criteria.indexOf(c) + 1}. ${escapeHtml(c.name)}</button>
        `).join(' ');

        guidance = `
            <div class="callout callout-warning">
                <strong class="callout-title">${icon('triangle-alert')} Critério concluído, mas ainda faltam outros:</strong>
                <div class="cluster">${pendingLinks}</div>
                <span class="callout-note">Clique em um critério pendente acima ou use o painel de navegação no topo.</span>
            </div>
            <div class="actions-row">
                <button class="btn btn-primary" data-action="goToCriterion" data-id="${pending[0].id}">Ir para próximo pendente →</button>
                ${resetButton}
            </div>
        `;
    }

    return `
        <div class="stage">
            <div class="success-message">${icon('circle-check')} Avaliação completa para "${criterionName_}"!</div>
            ${renderRuler(entry, null, criterionName_)}
            <div class="final-ranking">
                <h4>${icon('trophy')} Ranking final para "${criterionName_}"</h4>
                ${renderRankingRows(getRankedAlternatives(entry), 'ranking-item final')}
            </div>
            ${guidance}
        </div>
    `;
}

function renderCriterionStage(entry, criterionId) {
    const name = escapeHtml(criterionName(criterionId));

    if (!entry.best) return renderSelectBest(name);
    if (entry.bestScore === undefined) return renderBestScoreInput(entry);
    if (!entry.worst) return renderSelectWorst(entry, name);
    if (entry.worstScore === undefined) return renderWorstScoreInput(entry);
    if (entry.selectedPosition) return renderPositionScoreInput(entry);

    const nextAlternativeId = alternativeIds().find(id => getScore(entry, id) === null);
    if (nextAlternativeId) return renderPlacement(entry, nextAlternativeId, name);

    return renderCriterionDone(entry, criterionId, name);
}

function showComparisonForCriterion() {
    const criterionId = currentCriterionId();
    const entry = state.comparisonData[criterionId];

    let html = renderCriterionNav() + renderManagementPanel() + `
        <div class="comparison-question">
            <div class="question-text">
                Critério: ${escapeHtml(criterionName(criterionId))} (${state.currentCriterionIndex + 1} de ${state.criteria.length})
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(state.currentCriterionIndex / state.criteria.length) * 100}%"></div>
            </div>
        </div>
    `;

    html += renderCriterionStage(entry, criterionId);

    // Permite desfazer uma escolha errada antes de concluir o critério
    // (com o critério concluído, o bloco final já oferece este botão)
    if (entry.best && !isComplete(criterionId)) {
        html += `
            <div class="mt-3">
                <button class="btn btn-secondary" data-action="resetCurrentCriterion" title="Refazer os scores deste critério">
                    ${icon('rotate-ccw')} Reiniciar este critério
                </button>
            </div>
        `;
    }

    document.getElementById('comparisonInterface').innerHTML = html;
}

// Redesenha após uma ação e leva o foco ao próximo controle, que o redesenho substituiu
function refreshComparison() {
    showComparisonForCriterion();

    const container = document.getElementById('comparisonInterface');
    const scoreInput = container.querySelector('#editScoreInput, #bestScore, #worstScore, #positionScore, #rulerInput');
    if (scoreInput) {
        scoreInput.focus();
        if (scoreInput.type === 'number') scoreInput.select();
        return;
    }
    container.querySelector('.alternative-card, button.btn-primary, [data-action="resetCurrentCriterion"]')?.focus();
}

function readScoreInput(id) {
    return parseFloat(document.getElementById(id).value);
}

function setBestScore() {
    const score = readScoreInput('bestScore');
    if (score >= 0 && score <= 10) {
        currentEntry().bestScore = score;
        refreshComparison();
    } else {
        showError('Score deve estar entre 0 e 10.');
    }
}

function setWorstScore() {
    const entry = currentEntry();
    const score = readScoreInput('worstScore');
    if (score >= 0 && score <= entry.bestScore) {
        entry.worstScore = score;
        entry.scores = entry.scores || {};
        refreshComparison();
    } else {
        showError(`Score deve estar entre 0 e ${entry.bestScore}.`);
    }
}

function setPositionBetweenScore() {
    const entry = currentEntry();
    const position = entry.selectedPosition;
    const minScore = getScore(entry, position.lower);
    const maxScore = getScore(entry, position.higher);
    const score = readScoreInput('positionScore');

    if (score >= minScore && score <= maxScore) {
        entry.scores[position.alternative] = score;
        delete entry.selectedPosition;
        refreshComparison();
    } else {
        showError(`Score deve estar entre ${minScore} e ${maxScore}.`);
    }
}

function resetCurrentCriterion() {
    editingScoreId = null;
    state.comparisonData[currentCriterionId()] = {};
    refreshComparison();
}

function validateAllComparisons() {
    if (!state.criteria.every(criterion => isComplete(criterion.id))) {
        showError('Complete todas as avaliações antes de continuar.');
        return false;
    }
    return true;
}

function removeCriterionFromStep3(id) {
    if (state.criteria.length <= 2) {
        showError('É necessário manter pelo menos 2 critérios.');
        return;
    }

    const removedName = criterionName(id);
    const before = JSON.stringify(state);

    removeCriterion(id);
    state.currentCriterionIndex = Math.min(state.currentCriterionIndex, state.criteria.length - 1);

    refreshComparison();
    offerUndo(`Critério "${removedName}" removido, com seus scores.`, () => restoreStateSnapshot(before));
}

function removeAlternativeFromStep3(id) {
    if (state.alternatives.length <= 2) {
        showError('É necessário manter pelo menos 2 alternativas.');
        return;
    }

    const removedName = alternativeName(id);
    const before = JSON.stringify(state);

    removeAlternative(id);

    refreshComparison();
    offerUndo(`Alternativa "${removedName}" removida, com seus scores.`, () => restoreStateSnapshot(before));
}

function confirmScoreEdit() {
    const entry = currentEntry();
    const input = document.getElementById('editScoreInput');
    const value = roundScore(parseFloat(input.value));
    const { min, max } = getScoreBounds(entry, editingScoreId, alternativeIds());

    if (!(value >= min && value <= max)) {
        showError(`O score de ${alternativeName(editingScoreId)} precisa ficar entre ${min} e ${max} para manter a ordem entre as alternativas.`);
        input.focus();
        return;
    }

    applyScore(entry, editingScoreId, value);
    editingScoreId = null;
    refreshComparison();
}

function confirmRulerScore() {
    const input = document.getElementById('rulerInput');
    const entry = currentEntry();
    const value = roundScore(parseFloat(input.value));
    if (!(value >= entry.worstScore && value <= entry.bestScore)) return;
    entry.scores[input.dataset.alternative] = value;
    refreshComparison();
}

registerActions({
    goToCriterion: el => {
        state.currentCriterionIndex = criterionIds().indexOf(el.dataset.id);
        editingScoreId = null;
        refreshComparison();
    },
    editScore: el => {
        editingScoreId = el.dataset.alternative;
        refreshComparison();
    },
    cancelScoreEdit: () => {
        editingScoreId = null;
        refreshComparison();
    },
    confirmScoreEdit,
    previewRulerScore: el => {
        document.getElementById('rulerValue').textContent = roundScore(parseFloat(el.value));
    },
    confirmRulerScore,
    toggleManagementPanel: el => {
        const panel = document.getElementById('managementPanelContent');
        const opening = panel.style.display === 'none';
        panel.style.display = opening ? 'block' : 'none';
        el.setAttribute('aria-expanded', String(opening));
    },
    removeCriterionFromStep3: el => removeCriterionFromStep3(el.dataset.id),
    removeAlternativeFromStep3: el => removeAlternativeFromStep3(el.dataset.id),
    selectBest: el => {
        currentEntry().best = el.dataset.id;
        refreshComparison();
    },
    selectWorst: el => {
        currentEntry().worst = el.dataset.id;
        refreshComparison();
    },
    setBestScore,
    setWorstScore,
    setPositionBetweenScore,
    selectPositionBetween: el => {
        const { alternative, higher, lower } = el.dataset;
        currentEntry().selectedPosition = { alternative, higher, lower };
        refreshComparison();
    },
    setSameLevel: el => {
        const entry = currentEntry();
        entry.scores[el.dataset.alternative] = getScore(entry, el.dataset.reference);
        refreshComparison();
    },
    resetCurrentCriterion,
});
