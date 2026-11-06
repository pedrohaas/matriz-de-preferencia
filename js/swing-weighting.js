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

function renderRankSumForm() {
    const options = state.criteria
        .map((_, index) => `<option value="${index + 1}">${index + 1}º posição</option>`)
        .join('');

    const rows = state.criteria.map(criterion => `
        <div class="my-3">
            <label for="ranksum_${criterion.id}">${escapeHtml(criterion.name)}:</label>
            <select id="ranksum_${criterion.id}" data-change="updateRankSumWeights">
                <option value="">Selecione a posição...</option>
                ${options}
            </select>
        </div>
    `).join('');

    return `
        <div class="form-group">
            <div class="orientation-box mb-4">
                <strong>Método Rank-Sum</strong>
                Ordene os critérios pela sua importância relativa. O objetivo que ocupa a posição mais alta é o de maior preferência. Os pesos são calculados automaticamente usando a fórmula Rank-Sum.
            </div>
            <label>Ordene os critérios por preferência (1 = maior preferência):</label>
            ${rows}
        </div>
    `;
}

function renderSwingForm() {
    const options = state.criteria
        .map(criterion => `<option value="${criterion.id}">${escapeHtml(criterion.name)}</option>`)
        .join('');

    return `
        <div class="form-group">
            <div class="orientation-box mb-4">
                <strong>Método Swing (Swing Weighting)</strong>
                Imagine um cenário em que <em>todos</em> os critérios estão no pior valor possível. Se você pudesse melhorar apenas <em>um</em> critério para o seu melhor valor, qual escolheria? Esse é o critério de maior impacto e recebe 100 pontos. Os demais são comparados relativamente a ele (0–100). Ao final, os pesos são normalizados para somar 100%.
            </div>

            <div id="worstAlternativeSummary">${renderWorstAlternativeTable()}</div>

            <div class="my-4">
                <label for="mostImportant"><strong>Passo 2: Qual é o critério mais importante?</strong></label>
                <p class="hint">
                    Selecione o critério que causará maior impacto ao ser melhorado do pior cenário para a melhor performance.
                </p>
                <select id="mostImportant" data-change="updateSwingWeightingInterface">
                    <option value="">Selecione o critério de maior impacto...</option>
                    ${options}
                </select>
            </div>
            <div id="swingWeightingComparisons"></div>
            <div class="mt-4" id="swingWeightingSummary"></div>
        </div>
    `;
}

function renderWorstAlternativeTable() {
    const rows = state.criteria.map(criterion => {
        const worstScore = state.comparisonData[criterion.id]?.worstScore;
        return `
            <tr>
                <td class="tcell">${escapeHtml(criterion.name)}</td>
                <td class="tcell">
                    <input class="input-compact" type="number" id="worstValue_${criterion.id}" step="any" placeholder="Digite o pior valor"
                           aria-label="Pior valor de ${escapeHtml(criterion.name)}"
                           data-change="validateWorstAlternative"
                          >
                </td>
                <td class="tcell muted-xs">
                    ${worstScore !== undefined ? `Pior encontrado: ${worstScore}` : 'N/A'}
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="subpanel">
            <h4>Passo 1: Definir Alternativa Hipotética com Piores Valores</h4>
            <p class="hint">
                Defina os valores que representam o <strong>pior cenário possível</strong> para cada critério.
                Esta alternativa servirá como base de comparação para estabelecer os pesos.
            </p>
            <div class="table-scroll"><table class="data-table">
                <tr>
                    <th class="tcell">Critério</th>
                    <th class="tcell">Valor do Pior Cenário</th>
                    <th class="tcell">Sugestão</th>
                </tr>
                ${rows}
            </table></div>
            <div class="mt-3" id="worstAlternativeStatus"></div>
        </div>
    `;
}

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
        return;
    }

    // Sem valor informado, o pior cenário parte da âncora inferior definida nos scores
    state.criteria.forEach(criterion => {
        const suggestion = state.comparisonData[criterion.id]?.worstScore;
        document.getElementById(`worstValue_${criterion.id}`).value = inputs.worst[criterion.id] ?? suggestion ?? '';
    });
    validateWorstAlternative();

    if (!criterionIds().includes(inputs.mostImportant) || !isWorstAlternativeComplete()) return;

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

function readRankSumForm() {
    const ranks = {};
    state.criteria.forEach(criterion => {
        ranks[criterion.id] = parseInt(document.getElementById(`ranksum_${criterion.id}`).value);
    });
    return ranks;
}

function updateRankSumWeights() {
    const ranks = readRankSumForm();

    state.weightingInputs.ranks = {};
    Object.keys(ranks).forEach(id => {
        if (!isNaN(ranks[id])) state.weightingInputs.ranks[id] = ranks[id];
    });

    const result = computeRankSumWeights(ranks);
    if (result.ok) {
        state.weights = result.weights;
    } else if (result.duplicate) {
        showError(result.error);
    }
}

function isWorstAlternativeComplete() {
    return state.criteria.every(criterion => {
        const input = document.getElementById(`worstValue_${criterion.id}`);
        return input && input.value.trim() !== '' && !isNaN(parseFloat(input.value));
    });
}

function validateWorstAlternative() {
    state.weightingInputs.worst = {};
    state.criteria.forEach(criterion => {
        const value = document.getElementById(`worstValue_${criterion.id}`).value;
        if (value.trim() !== '') state.weightingInputs.worst[criterion.id] = value;
    });

    const complete = isWorstAlternativeComplete();
    document.getElementById('worstAlternativeStatus').innerHTML = complete
        ? `<div class="status-line status-ok">
               ${icon('circle-check')} Alternativa hipotética completa. Você pode prosseguir para o Passo 2.
           </div>`
        : `<div class="status-line status-warn">
               ${icon('triangle-alert')} Complete todos os valores antes de prosseguir para o Passo 2.
           </div>`;
}

function updateSwingWeightingInterface() {
    const select = document.getElementById('mostImportant');
    const comparisons = document.getElementById('swingWeightingComparisons');
    const inputs = state.weightingInputs;

    if (!select.value) {
        inputs.mostImportant = null;
        inputs.swing = {};
        comparisons.innerHTML = '';
        document.getElementById('swingWeightingSummary').innerHTML = '';
        return;
    }

    if (!isWorstAlternativeComplete()) {
        showError('Complete a definição da alternativa hipotética (Passo 1) antes de prosseguir para o Passo 2.');
        select.value = '';
        return;
    }

    // Os impactos são relativos ao critério mais importante: trocá-lo invalida os anteriores
    if (inputs.mostImportant !== select.value) {
        inputs.mostImportant = select.value;
        inputs.swing = {};
    }

    const mostImportantName = escapeHtml(criterionName(select.value));
    const rows = state.criteria
        .filter(criterion => criterion.id !== select.value)
        .map(criterion => {
            const name = escapeHtml(criterion.name);
            const worstValue = escapeHtml(document.getElementById(`worstValue_${criterion.id}`).value);
            return `
                <div class="field-card">
                    <label for="swingweight_${criterion.id}"><strong>${name}</strong></label>
                    <p class="hint">
                        Qual o impacto de melhorar "${name}" do valor ${worstValue} para a melhor performance,
                        comparado ao mesmo tipo de melhoria em "${mostImportantName}"?
                    </p>
                    <input class="input-compact" type="number" id="swingweight_${criterion.id}" min="0" max="100" step="1" placeholder="0-100"
                           data-change="updateSwingWeightingWeights">
                    <span>% do impacto de ${mostImportantName}</span>
                </div>
            `;
        }).join('');

    comparisons.innerHTML = `
        <div class="my-4">
            <h4>Comparações de Impacto (Passos 3-4)</h4>
            <div class="info-line">
                <strong>${mostImportantName}</strong> = 100 (Critério mais importante - Passo 2)
            </div>
            <p class="hint">
                Para cada critério abaixo, considere o impacto de melhorar da pior para a melhor performance
                comparado ao mesmo tipo de melhoria no critério mais importante.
            </p>
            ${rows}
        </div>
    `;

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
        if (isNaN(value) || value < 0 || value > 100) {
            allValid = false;
            rawWeights[criterion.id] = 0;
        } else {
            rawWeights[criterion.id] = value;
        }
    });

    if (allValid) {
        state.weights = normalizeWeights(rawWeights);
        renderSwingSummary(rawWeights, true);
    } else {
        state.weights = {};
        renderSwingSummary(rawWeights, false);
    }
}

function renderSwingSummary(rawWeights, valid) {
    const rows = state.criteria.map(criterion => `
        <tr>
            <td class="tcell">${escapeHtml(criterion.name)}</td>
            <td class="tcell">${rawWeights[criterion.id] ?? 0}</td>
            <td class="tcell">${((state.weights[criterion.id] ?? 0) * 100).toFixed(1)}%</td>
        </tr>
    `).join('');

    const total = Object.values(state.weights).reduce((sum, weight) => sum + weight, 0);

    document.getElementById('swingWeightingSummary').innerHTML = `
        <h4>Resumo dos Pesos (Passo 5: Normalização)</h4>
        <div class="table-scroll mt-3"><table class="data-table">
            <tr>
                <th class="tcell">Critério</th>
                <th class="tcell">Peso Bruto</th>
                <th class="tcell">Peso Normalizado</th>
            </tr>
            ${rows}
        </table></div>
        ${valid ? `
            <p class="mt-3 fw-700">Total dos pesos normalizados: ${(total * 100).toFixed(1)}%</p>
            <p class="hint">
                Passo 6: Utilize estes pesos normalizados para calcular a utilidade total de cada alternativa.
            </p>
        ` : ''}
    `;
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
    if (!isWorstAlternativeComplete()) {
        showError('Complete a definição da alternativa hipotética no Passo 1 antes de prosseguir.');
        return false;
    }

    const mostImportantId = document.getElementById('mostImportant').value;
    if (!mostImportantId) {
        showError('Selecione o critério mais importante para o Swing Weighting (Passo 2).');
        return false;
    }

    const impacts = state.criteria
        .filter(criterion => criterion.id !== mostImportantId)
        .map(criterion => parseFloat(document.getElementById(`swingweight_${criterion.id}`).value));

    if (impacts.some(value => isNaN(value) || value < 0 || value > 100)) {
        showError('Atribua pesos válidos (0-100) para todos os critérios no Swing Weighting (Passo 4).');
        return false;
    }
    if (!impacts.some(value => value > 0)) {
        showError('Defina pelo menos um peso maior que zero para os outros critérios no Swing Weighting (Passo 4).');
        return false;
    }

    updateSwingWeightingWeights();
    return true;
}

registerActions({
    updateRankSumWeights,
    validateWorstAlternative,
    updateSwingWeightingInterface,
    updateSwingWeightingWeights,
});
