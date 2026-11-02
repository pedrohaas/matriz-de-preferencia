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
        const buttonStyle = isCurrent
            ? 'background:var(--primary);color:#fff;border:2px solid var(--primary);'
            : done
                ? 'background:var(--success, #22c55e);color:#fff;border:2px solid var(--success, #22c55e);'
                : 'background:var(--bg);color:var(--text-dark);border:2px solid var(--border);';
        const label = criterion.name.length > 15 ? `${criterion.name.slice(0, 13)}…` : criterion.name;

        return `<button data-action="goToCriterion" data-id="${criterion.id}" style="${buttonStyle} padding:5px 12px; border-radius:20px; font-size:0.82rem; font-weight:600; cursor:pointer; transition:all 0.2s;" title="${escapeHtml(criterion.name)}">${index + 1}. ${escapeHtml(label)}${done && !isCurrent ? ' ✓' : ''}</button>`;
    }).join('');

    return `<div class="criterion-nav" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:1.25rem;">${buttons}</div>`;
}

function renderManagementColumn(title, items, removeAction, borderColor) {
    const rows = items.map((item, index) => `
        <div style="display:flex; align-items:center; justify-content:space-between; background:white; padding:8px 10px; border-radius:6px; border-left:3px solid var(${borderColor}); font-size:0.88rem;">
            <span>${index + 1}. ${escapeHtml(item.name)}</span>
            ${items.length > 2
                ? `<button class="remove-btn" data-action="${removeAction}" data-id="${item.id}" style="font-size:0.75rem; padding:3px 8px;">🗑️</button>`
                : '<span style="font-size:0.72rem; color:var(--text-soft);">mín.</span>'}
        </div>
    `).join('');

    return `
        <div>
            <h4 style="color:var(--primary); margin-bottom:8px; font-size:0.95rem;">${title} (${items.length})</h4>
            <div style="display:flex; flex-direction:column; gap:6px;">${rows}</div>
        </div>
    `;
}

function renderManagementPanel() {
    return `
        <div class="management-panel" style="margin-bottom:1.25rem;">
            <button data-action="toggleManagementPanel" class="btn btn-secondary btn-small" style="font-size:0.82rem; padding:6px 14px;">
                ⚙️ Gerenciar Critérios e Alternativas
            </button>
            <div id="managementPanelContent" style="display:none; margin-top:12px; padding:16px; background:var(--white); border:2px solid var(--border); border-radius:var(--radius-md);">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                    ${renderManagementColumn('📋 Critérios', state.criteria, 'removeCriterionFromStep3', '--secondary')}
                    ${renderManagementColumn('🏷️ Alternativas', state.alternatives, 'removeAlternativeFromStep3', '--primary')}
                </div>
                <p style="margin-top:10px; font-size:0.78rem; color:var(--text-soft); font-style:italic;">
                    ⚠️ Ao remover um critério ou alternativa, os scores associados serão recalculados. Mínimo: 2 critérios e 2 alternativas.
                </p>
            </div>
        </div>
    `;
}

function renderAlternativeCards(action, excludedId = null) {
    const cards = state.alternatives
        .filter(alternative => alternative.id !== excludedId)
        .map(alternative => `
            <div class="alternative-card" data-action="${action}" data-id="${alternative.id}">
                ${escapeHtml(alternative.name)}
            </div>
        `).join('');
    return `<div class="alternatives-grid">${cards}</div>`;
}

function renderSelectBest(criterionName_) {
    return `
        <div style="margin: 20px 0;">
            <h4>1. Qual alternativa é a MELHOR para o critério "${criterionName_}"?</h4>
            <p style="color: var(--text-soft); font-size: 0.9rem; margin-bottom: 10px;">Selecione a alternativa com melhor desempenho neste critério.</p>
            ${renderAlternativeCards('selectBest')}
        </div>
    `;
}

function renderBestScoreInput(entry) {
    const best = escapeHtml(alternativeName(entry.best));
    return `
        <div style="margin: 20px 0;">
            <div class="success-message">✅ Melhor alternativa selecionada: <strong>${best}</strong></div>
            <h4>2. Defina o score da melhor alternativa — Âncora Superior:</h4>
            <p style="color: var(--text-soft); font-size: 0.9rem; margin-bottom: 10px;">
                Atribua um score máximo (entre 0 e 10) para <strong>${best}</strong>, que representa o melhor desempenho neste critério.
            </p>
            <div class="form-group">
                <label>Score para "${best}" (0 a 10):</label>
                <input type="number" id="bestScore" min="0" max="10" placeholder="Ex: 10" step="0.1">
                <button class="btn btn-primary" style="margin-top: 8px;" data-action="setBestScore">Confirmar</button>
            </div>
        </div>
    `;
}

function renderSelectWorst(entry, criterionName_) {
    return `
        <div style="margin: 20px 0;">
            <div class="success-message">✅ Melhor: ${escapeHtml(alternativeName(entry.best))} → Score ${entry.bestScore}</div>
            <h4>3. Qual alternativa é a PIOR para o critério "${criterionName_}"?</h4>
            <p style="color: var(--text-soft); font-size: 0.9rem; margin-bottom: 10px;">Selecione a alternativa com pior desempenho neste critério.</p>
            ${renderAlternativeCards('selectWorst', entry.best)}
        </div>
    `;
}

function renderWorstScoreInput(entry) {
    const worst = escapeHtml(alternativeName(entry.worst));
    return `
        <div style="margin: 20px 0;">
            <div class="success-message">✅ Melhor: ${escapeHtml(alternativeName(entry.best))} → Score ${entry.bestScore}</div>
            <div class="success-message">✅ Pior alternativa selecionada: <strong>${worst}</strong></div>
            <h4>4. Defina o score da pior alternativa — Âncora Inferior:</h4>
            <p style="color: var(--text-soft); font-size: 0.9rem; margin-bottom: 10px;">
                Atribua um score mínimo (entre 0 e ${entry.bestScore}) para <strong>${worst}</strong>.
            </p>
            <div class="form-group">
                <label>Score para "${worst}" (0 a ${entry.bestScore}):</label>
                <input type="number" id="worstScore" min="0" max="${entry.bestScore}" placeholder="Ex: 0" step="0.1">
                <button class="btn btn-primary" style="margin-top: 8px;" data-action="setWorstScore">Confirmar</button>
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
        <div style="margin: 20px 0;">
            <div class="success-message">✅ Posição selecionada: Entre "${escapeHtml(alternativeName(position.higher))}" e "${escapeHtml(alternativeName(position.lower))}"</div>
            <h4>Defina o score para "${alternative}":</h4>
            <div class="form-group">
                <label>Score para "${alternative}" (${minScore} - ${maxScore}):</label>
                <input type="number" id="positionScore" min="${minScore}" max="${maxScore}" placeholder="Ex: ${averageScore}" step="0.1" value="${averageScore}">
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

function renderRankingRows(ranked, itemClass) {
    return ranked.map((item, index) => `
        <div class="${itemClass}">
            <span class="rank">${index + 1}º</span>
            <span class="alt-name">${escapeHtml(item.name)}</span>
            <span class="alt-score">${item.score}</span>
        </div>
    `).join('');
}

function renderPositionOptions(alternativeId, ranked) {
    let options = '';

    // Entre duas alternativas consecutivas com notas diferentes
    for (let i = 0; i < ranked.length - 1; i++) {
        const higher = ranked[i];
        const lower = ranked[i + 1];
        if (higher.score !== lower.score) {
            options += `
                <div class="alternative-card" data-action="selectPositionBetween" data-alternative="${alternativeId}" data-higher="${higher.id}" data-lower="${lower.id}">
                    <div class="position-label">📊 Entre "${escapeHtml(higher.name)}" e "${escapeHtml(lower.name)}" </div>
                    <div class="position-description">Range: ${lower.score} - ${higher.score}</div>
                </div>
            `;
        }
    }

    // No mesmo nível de uma alternativa já avaliada
    ranked.forEach(item => {
        options += `
            <div class="alternative-card" data-action="setSameLevel" data-alternative="${alternativeId}" data-reference="${item.id}">
                <div class="position-label">⚖️ Mesmo nível de "${escapeHtml(item.name)}"</div>
                <div class="position-description">Score igual: ${item.score}</div>
            </div>
        `;
    });

    return options;
}

function renderPlacement(entry, nextAlternativeId, criterionName_) {
    const ranked = getRankedAlternatives(entry);
    return `
        <div style="margin: 20px 0;">
            <div class="ranking-display">
                <h4>🏆 Ranking atual para "${criterionName_}"</h4>
                ${renderRankingRows(ranked, 'ranking-item')}
            </div>
            <h4>📍 Onde posicionar "${escapeHtml(alternativeName(nextAlternativeId))}"?</h4>
            <p>Escolha a posição mais adequada comparando com as alternativas já avaliadas:</p>
            <div class="position-options">${renderPositionOptions(nextAlternativeId, ranked)}</div>
        </div>
    `;
}

function renderCriterionDone(entry, criterionId, criterionName_) {
    const resetButton = `
        <button class="btn btn-secondary" data-action="resetCurrentCriterion" title="Refazer os scores deste critério">
            ↺ Reiniciar este Critério
        </button>
    `;
    const pending = state.criteria.filter(c => c.id !== criterionId && !isComplete(c.id));

    let guidance;
    if (pending.length === 0) {
        guidance = `
            <div style="margin-top: 16px; padding: 16px; background: linear-gradient(135deg, #edf7f2, #d8f0e4); border-left: 4px solid var(--success); border-radius: var(--radius-sm);">
                <strong style="color: var(--success); display: block; margin-bottom: 4px;">🎉 Todos os critérios foram avaliados!</strong>
                Use o botão <strong>"Passo 4 →"</strong> abaixo para continuar para a atribuição de pesos.
            </div>
            <div style="margin-top:10px;">${resetButton}</div>
        `;
    } else {
        const pendingLinks = pending.map(c => `
            <button data-action="goToCriterion" data-id="${c.id}" style="background:var(--secondary);color:#fff;border:none;padding:4px 10px;border-radius:12px;font-size:0.82rem;font-weight:600;cursor:pointer;margin:2px;">${state.criteria.indexOf(c) + 1}. ${escapeHtml(c.name)}</button>
        `).join(' ');

        guidance = `
            <div style="margin-top: 14px; padding: 14px; background: linear-gradient(135deg, #fef9ec, #fef3c7); border-left: 4px solid #f59e0b; border-radius: var(--radius-sm);">
                <strong style="color: #92400e; display: block; margin-bottom: 6px;">⚠️ Critério concluído, mas ainda faltam outros:</strong>
                <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px;">${pendingLinks}</div>
                <span style="font-size:0.82rem; color:#92400e;">Clique em um critério pendente acima ou use o painel de navegação no topo.</span>
            </div>
            <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
                <button class="btn btn-primary" data-action="goToCriterion" data-id="${pending[0].id}">Ir para próximo pendente →</button>
                ${resetButton}
            </div>
        `;
    }

    return `
        <div style="margin: 20px 0;">
            <div class="success-message">✅ Avaliação completa para "${criterionName_}"!</div>
            <div class="final-ranking">
                <h4>🏆 Ranking final para "${criterionName_}"</h4>
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
            <div style="margin-top: 10px;">
                <button class="btn btn-secondary" data-action="resetCurrentCriterion" title="Refazer os scores deste critério">
                    ↺ Reiniciar este Critério
                </button>
            </div>
        `;
    }

    document.getElementById('comparisonInterface').innerHTML = html;
}

function readScoreInput(id) {
    return parseFloat(document.getElementById(id).value);
}

function setBestScore() {
    const score = readScoreInput('bestScore');
    if (score >= 0 && score <= 10) {
        currentEntry().bestScore = score;
        showComparisonForCriterion();
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
        showComparisonForCriterion();
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
        showComparisonForCriterion();
    } else {
        showError(`Score deve estar entre ${minScore} e ${maxScore}.`);
    }
}

function resetCurrentCriterion() {
    state.comparisonData[currentCriterionId()] = {};
    showComparisonForCriterion();
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
    if (!confirm(`Remover o critério "${removedName}"? Os scores associados serão perdidos.`)) {
        return;
    }

    removeCriterion(id);
    state.currentCriterionIndex = Math.min(state.currentCriterionIndex, state.criteria.length - 1);

    showSuccess(`Critério "${removedName}" removido com sucesso.`);
    showComparisonForCriterion();
}

function removeAlternativeFromStep3(id) {
    if (state.alternatives.length <= 2) {
        showError('É necessário manter pelo menos 2 alternativas.');
        return;
    }

    const removedName = alternativeName(id);
    if (!confirm(`Remover a alternativa "${removedName}"? Os scores associados serão recalculados.`)) {
        return;
    }

    removeAlternative(id);

    showSuccess(`Alternativa "${removedName}" removida com sucesso.`);
    showComparisonForCriterion();
}

registerActions({
    goToCriterion: el => {
        state.currentCriterionIndex = criterionIds().indexOf(el.dataset.id);
        showComparisonForCriterion();
    },
    toggleManagementPanel: () => {
        const panel = document.getElementById('managementPanelContent');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    },
    removeCriterionFromStep3: el => removeCriterionFromStep3(el.dataset.id),
    removeAlternativeFromStep3: el => removeAlternativeFromStep3(el.dataset.id),
    selectBest: el => {
        currentEntry().best = el.dataset.id;
        showComparisonForCriterion();
    },
    selectWorst: el => {
        currentEntry().worst = el.dataset.id;
        showComparisonForCriterion();
    },
    setBestScore,
    setWorstScore,
    setPositionBetweenScore,
    selectPositionBetween: el => {
        const { alternative, higher, lower } = el.dataset;
        currentEntry().selectedPosition = { alternative, higher, lower };
        showComparisonForCriterion();
    },
    setSameLevel: el => {
        const entry = currentEntry();
        entry.scores[el.dataset.alternative] = getScore(entry, el.dataset.reference);
        showComparisonForCriterion();
    },
    resetCurrentCriterion,
});
