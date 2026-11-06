// Passo de pesos: formulários de Rank-Sum e Swing Weighting

function setupWeightingInterface() {
    const method = state.weightingMethod;
    const container = document.getElementById('weightingInterface');

    if (method === 'ranksum') {
        container.innerHTML = renderRankSumForm();
    } else if (method === 'swingweighting') {
        container.innerHTML = renderSwingForm();
    } else {
        container.innerHTML = '';
        return;
    }

    restoreWeightingInputs(method);
}

// Barras com os pesos normalizados, atualizadas enquanto o usuário preenche
function renderWeightBars(weights) {
    if (!weights) {
        return '<p class="hint">Os pesos aparecem aqui assim que o formulário estiver completo.</p>';
    }
    const rows = state.criteria.map(criterion => {
        const percent = (weights[criterion.id] ?? 0) * 100;
        return `
            <div class="weight-bar-row">
                <span class="weight-bar-name">${escapeHtml(criterion.name)}</span>
                <span class="weight-bar-track"><span class="weight-bar-fill" style="width: ${percent}%;"></span></span>
                <span class="weight-bar-value">${percent.toFixed(1)}%</span>
            </div>
        `;
    }).join('');
    return `<div class="weight-bars">${rows}</div>`;
}

// ---- Rank-Sum ----

function renderRankSumForm() {
    const options = state.criteria
        .map((_, index) => `<option value="${index + 1}">${index + 1}º lugar</option>`)
        .join('');

    const rows = state.criteria.map(criterion => `
        <div class="rank-row">
            <label for="ranksum_${criterion.id}">${escapeHtml(criterion.name)}</label>
            <select id="ranksum_${criterion.id}" data-change="updateRankSumWeights" data-id="${criterion.id}">
                <option value="">Posição...</option>
                ${options}
            </select>
        </div>
    `).join('');

    return `
        <div class="method-intro">
            <h3>${icon('list-ordered')} Rank-Sum</h3>
            <p>Ordene os critérios do mais para o menos relevante nesta decisão. Os pesos saem da posição: quanto mais alto, maior o peso. Escolher uma posição já ocupada troca os dois critérios de lugar.</p>
        </div>
        <div class="weighting-layout">
            <div class="rank-list">${rows}</div>
            <div class="weights-preview">
                <h4>Pesos resultantes</h4>
                <div id="weightsPreview">${renderWeightBars(null)}</div>
            </div>
        </div>
    `;
}

function readRankSumForm() {
    const ranks = {};
    state.criteria.forEach(criterion => {
        ranks[criterion.id] = parseInt(document.getElementById(`ranksum_${criterion.id}`).value);
    });
    return ranks;
}

// Uma posição já ocupada troca de lugar com a anterior do critério alterado,
// para que duas posições iguais nunca coexistam
function updateRankSumWeights(select) {
    if (select?.dataset?.id) {
        const changedId = select.dataset.id;
        const newRank = select.value;
        const previousRank = state.weightingInputs.ranks[changedId];
        state.criteria.forEach(criterion => {
            if (criterion.id === changedId) return;
            const other = document.getElementById(`ranksum_${criterion.id}`);
            if (newRank && other.value === newRank) other.value = previousRank ? String(previousRank) : '';
        });
    }

    const ranks = readRankSumForm();
    state.weightingInputs.ranks = {};
    Object.keys(ranks).forEach(id => {
        if (!isNaN(ranks[id])) state.weightingInputs.ranks[id] = ranks[id];
    });

    const result = computeRankSumWeights(ranks);
    if (result.ok) state.weights = result.weights;
    document.getElementById('weightsPreview').innerHTML = renderWeightBars(result.ok ? result.weights : null);
}

// ---- Swing ----

function renderCriterionRange(criterion) {
    const entry = state.comparisonData[criterion.id] ?? {};
    const worst = entry.worstScore;
    const best = entry.bestScore;
    if (worst === undefined || best === undefined) return '';
    return `
        <li class="swing-range">
            <span class="swing-range-name">${escapeHtml(criterion.name)}</span>
            <span class="swing-range-track" aria-hidden="true"><span class="swing-range-fill" style="left: ${worst * 10}%; width: ${(best - worst) * 10}%;"></span></span>
            <span class="swing-range-values">de <strong>${worst}</strong> a <strong>${best}</strong></span>
        </li>
    `;
}

function renderSwingForm() {
    const options = state.criteria
        .map(criterion => `<option value="${criterion.id}">${escapeHtml(criterion.name)}</option>`)
        .join('');

    return `
        <div class="method-intro">
            <h3>${icon('scale')} Swing Weighting</h3>
            <p>Imagine uma alternativa com o <strong>pior</strong> score em todos os critérios. Se pudesse melhorar só um critério até o <strong>melhor</strong> score, qual escolheria? Ele recebe 100 pontos, e os demais são comparados a ele. Ao final, os pesos são normalizados para somar 100%.</p>
        </div>

        <h4>O que cada critério pode melhorar</h4>
        <p class="hint">Intervalo entre o pior e o melhor score do passo anterior. É ele que está em jogo em cada comparação.</p>
        <ul class="swing-ranges">${state.criteria.map(renderCriterionRange).join('')}</ul>

        <div class="form-group mt-4">
            <label for="mostImportant">Se pudesse melhorar só um critério, do pior ao melhor score, qual escolheria?</label>
            <select id="mostImportant" data-change="updateSwingWeightingInterface">
                <option value="">Escolha o critério de maior impacto...</option>
                ${options}
            </select>
        </div>

        <div class="weighting-layout">
            <div id="swingWeightingComparisons"></div>
            <div class="weights-preview">
                <h4>Pesos resultantes</h4>
                <div id="swingWeightingSummary">${renderWeightBars(null)}</div>
            </div>
        </div>
    `;
}

function describeImprovement(criterionId) {
    const entry = state.comparisonData[criterionId] ?? {};
    return `<strong>${escapeHtml(criterionName(criterionId))}</strong> de ${entry.worstScore} para ${entry.bestScore}`;
}

function updateSwingWeightingInterface() {
    const select = document.getElementById('mostImportant');
    const comparisons = document.getElementById('swingWeightingComparisons');
    const inputs = state.weightingInputs;

    if (!select.value) {
        inputs.mostImportant = null;
        inputs.swing = {};
        comparisons.innerHTML = '';
        document.getElementById('swingWeightingSummary').innerHTML = renderWeightBars(null);
        return;
    }

    // Os impactos são relativos ao critério mais importante: trocá-lo invalida os anteriores
    if (inputs.mostImportant !== select.value) {
        inputs.mostImportant = select.value;
        inputs.swing = {};
    }

    const reference = describeImprovement(select.value);
    const rows = state.criteria
        .filter(criterion => criterion.id !== select.value)
        .map(criterion => {
            const name = escapeHtml(criterion.name);
            return `
                <div class="field-card swing-card">
                    <label for="swingweight_${criterion.id}">Melhorar ${describeImprovement(criterion.id)} vale quanto, comparado a melhorar ${reference}?</label>
                    <div class="swing-inputs">
                        <input type="range" id="swingrange_${criterion.id}" min="0" max="100" step="1" value="0"
                               aria-label="Impacto de ${name}, de 0 a 100" data-input="syncSwingRange" data-id="${criterion.id}">
                        <input class="input-compact" type="number" id="swingweight_${criterion.id}" min="0" max="100" step="1" placeholder="0-100"
                               data-change="updateSwingWeightingWeights">
                        <span class="muted">pontos</span>
                    </div>
                </div>
            `;
        }).join('');

    comparisons.innerHTML = `
        <div class="info-line"><strong>${escapeHtml(criterionName(select.value))}</strong> = 100 pontos, o critério de maior impacto.</div>
        ${rows}
    `;

    updateSwingWeightingWeights();
}

function syncSwingRange(range) {
    document.getElementById(`swingweight_${range.dataset.id}`).value = range.value;
    updateSwingWeightingWeights();
}

function updateSwingWeightingWeights() {
    const mostImportantId = document.getElementById('mostImportant').value;
    if (!mostImportantId) return;

    const rawWeights = { [mostImportantId]: 100 };
    let allValid = true;

    state.weightingInputs.swing = {};
    state.criteria.forEach(criterion => {
        if (criterion.id === mostImportantId) return;

        const text = document.getElementById(`swingweight_${criterion.id}`).value;
        if (text.trim() !== '') state.weightingInputs.swing[criterion.id] = text;

        const value = parseFloat(text);
        const range = document.getElementById(`swingrange_${criterion.id}`);
        if (range && !isNaN(value)) range.value = value;

        if (isNaN(value) || value < 0 || value > 100) {
            allValid = false;
            rawWeights[criterion.id] = 0;
        } else {
            rawWeights[criterion.id] = value;
        }
    });

    state.weights = allValid ? normalizeWeights(rawWeights) : {};
    document.getElementById('swingWeightingSummary').innerHTML = renderWeightBars(allValid ? state.weights : null);
}

// ---- Restauração e validação ----

// Recoloca nos formulários o que o usuário já havia preenchido
function restoreWeightingInputs(method) {
    const inputs = state.weightingInputs;

    if (method === 'ranksum') {
        state.criteria.forEach(criterion => {
            const select = document.getElementById(`ranksum_${criterion.id}`);
            select.value = inputs.ranks[criterion.id] ?? '';
            // Posição que não existe mais (lista de critérios encolheu) fica em branco
            if (select.selectedIndex === -1) select.value = '';
        });
        const result = computeRankSumWeights(readRankSumForm());
        document.getElementById('weightsPreview').innerHTML = renderWeightBars(result.ok ? result.weights : null);
        return;
    }

    if (!criterionIds().includes(inputs.mostImportant)) return;

    const savedImpacts = { ...inputs.swing };
    document.getElementById('mostImportant').value = inputs.mostImportant;
    updateSwingWeightingInterface();
    state.criteria.forEach(criterion => {
        const input = document.getElementById(`swingweight_${criterion.id}`);
        if (input) input.value = savedImpacts[criterion.id] ?? '';
    });
    updateSwingWeightingWeights();
}

function forgetCriterionInputs(criterionId) {
    const inputs = state.weightingInputs;
    delete inputs.ranks[criterionId];
    delete inputs.worst[criterionId];
    delete inputs.swing[criterionId];
    if (inputs.mostImportant === criterionId) {
        inputs.mostImportant = null;
        inputs.swing = {};
    }
}

// Os pesos são sempre recalculados a partir do formulário do método selecionado,
// descartando valores de outro método, de critérios removidos ou dos sliders
function validateWeights() {
    if (state.weightingMethod === 'ranksum') {
        const result = computeRankSumWeights(readRankSumForm());
        if (!result.ok) {
            showError(result.error);
            return false;
        }
        state.weights = result.weights;
        return true;
    }

    if (state.weightingMethod === 'swingweighting') {
        return validateSwingForm();
    }

    return false;
}

function validateSwingForm() {
    const mostImportantId = document.getElementById('mostImportant').value;
    if (!mostImportantId) {
        showError('Escolha o critério de maior impacto para o Swing Weighting.');
        return false;
    }

    const impacts = state.criteria
        .filter(criterion => criterion.id !== mostImportantId)
        .map(criterion => parseFloat(document.getElementById(`swingweight_${criterion.id}`).value));

    if (impacts.some(value => isNaN(value) || value < 0 || value > 100)) {
        showError('Informe de 0 a 100 pontos para cada critério no Swing Weighting.');
        return false;
    }
    if (!impacts.some(value => value > 0)) {
        showError('Dê mais de 0 pontos a pelo menos um dos outros critérios no Swing Weighting.');
        return false;
    }

    updateSwingWeightingWeights();
    return true;
}

registerActions({
    updateRankSumWeights,
    updateSwingWeightingInterface,
    updateSwingWeightingWeights,
    syncSwingRange,
});
