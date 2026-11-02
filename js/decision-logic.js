// Navegação entre os passos e tela de resultados

let aiModalResolver = null;

function showAiModal(suggestions) {
    return new Promise(resolve => {
        const modal = document.getElementById('aiSuggestionModal');
        const container = document.getElementById('aiCriteriaContainer');
        container.innerHTML = '';

        suggestions.forEach(suggestion => {
            const chip = document.createElement('div');
            chip.className = 'ai-chip selected';
            chip.textContent = suggestion.trim();
            chip.onclick = () => chip.classList.toggle('selected');
            container.appendChild(chip);
        });

        aiModalResolver = resolve;
        modal.classList.add('active');
    });
}

function closeAiModal(accept) {
    document.getElementById('aiSuggestionModal').classList.remove('active');

    if (aiModalResolver) {
        const selected = document.querySelectorAll('#aiCriteriaContainer .ai-chip.selected');
        aiModalResolver(accept ? Array.from(selected).map(chip => chip.textContent.trim()) : null);
    }
    aiModalResolver = null;
}

// Mostra um passo e prepara a interface dele, sem alterar os dados já informados
function showStep(step) {
    document.querySelector('.step.active')?.classList.remove('active');
    state.currentStep = step;
    document.getElementById(`step${step}`).classList.add('active');

    if (step === 2) {
        updateCriteriaList();
    } else if (step === 3) {
        updateAlternativesList();
    } else if (step === 4) {
        setupComparisonInterface();
    } else if (step === 5) {
        setupWeightingInterface();
    } else if (step === 6) {
        calculateResults();
    }

    updateProgressBar();
    updateContextBanner();
}

// Consulta a IA ao sair da apresentação, se configurada e ainda sem critérios.
// Consultas repetidas para o mesmo problema são evitadas.
async function offerAiSuggestions() {
    const suggestionKey = `${state.problemTitle}\n${state.problemDescription}`;
    if (!getApiKey() || state.criteria.length > 0 || state.aiSuggestionKey === suggestionKey) {
        return;
    }

    const nextButton = document.getElementById('btn-next-step1');
    const originalText = nextButton.textContent;
    nextButton.textContent = 'Buscando sugestões...';
    nextButton.disabled = true;

    let suggestions = [];
    try {
        suggestions = await sugerirCritériosGemini(state.problemTitle, state.problemDescription);
    } catch (error) {
        // Sem sugestões, o usuário segue normalmente
        console.error('Erro ao buscar critérios:', error);
    } finally {
        nextButton.textContent = originalText;
        nextButton.disabled = false;
    }

    if (suggestions.length === 0) return;

    state.aiSuggestionKey = suggestionKey;
    const accepted = await showAiModal(suggestions);
    if (accepted) addCriteriaFromAI(accepted);
}

function validateStep(step) {
    if (step === 1) {
        if (!state.problemTitle) {
            showError('Por favor, insira um título para o problema.');
            return false;
        }
    } else if (step === 2) {
        if (state.criteria.length < 2) {
            showError('Adicione pelo menos 2 critérios antes de continuar.');
            return false;
        }
    } else if (step === 3) {
        if (state.alternatives.length < 2) {
            showError('Adicione pelo menos 2 alternativas antes de continuar.');
            return false;
        }
    } else if (step === 4) {
        return validateAllComparisons();
    } else if (step === 5) {
        if (!state.weightingMethod) {
            showError('Selecione um método de pesagem antes de continuar.');
            return false;
        }
        return validateWeights();
    }
    return true;
}

async function nextStep() {
    const step = state.currentStep;
    if (step >= 6 || !validateStep(step)) return;

    if (step === 1) await offerAiSuggestions();

    showStep(step + 1);
}

function prevStep() {
    if (state.currentStep > 1) showStep(state.currentStep - 1);
}

// Navegação direta pela barra de progresso: só para passos anteriores
function goToStep(targetStep) {
    if (targetStep > state.currentStep) {
        showInfo('Complete o passo atual antes de avançar.');
        return;
    }
    if (targetStep < state.currentStep) showStep(targetStep);
}

// Atualiza a régua de progresso visual
function updateProgressBar() {
    const activeIndex = state.currentStep - 1;

    for (let i = 0; i <= 5; i++) {
        const dot = document.getElementById(`prog-dot-${i}`);
        const item = document.getElementById(`prog-item-${i}`);
        const connector = document.getElementById(`prog-conn-${i}`);

        dot.classList.toggle('completed', i < activeIndex);
        dot.classList.toggle('active', i === activeIndex);
        item.classList.toggle('completed', i < activeIndex);
        item.classList.toggle('active', i === activeIndex);
        connector?.classList.toggle('completed', i < activeIndex);
    }
}

// Atualiza o banner de contexto persistente
function updateContextBanner() {
    const banner = document.getElementById('contextBanner');

    if (state.currentStep === 1 || !state.problemTitle) {
        banner.classList.remove('visible');
        return;
    }

    document.getElementById('contextTitle').textContent = `🎯 ${state.problemTitle}`;
    document.getElementById('contextDesc').textContent = state.problemDescription;
    banner.classList.add('visible');

    // Recolhe a configuração da API ao sair da apresentação
    document.getElementById('apiConfigSection').classList.add('collapsed');
}

function toggleApiConfig() {
    document.getElementById('apiConfigSection').classList.toggle('collapsed');
}

// ---- Resultados ----

function getResults() {
    const finals = computeFinalScores(criterionIds(), alternativeIds(), state.comparisonData, state.weights);
    return { finals, sortedIds: sortByFinalScore(alternativeIds(), finals) };
}

function calculateResults() {
    state.originalWeights = { ...state.weights };
    displayResults();
}

function renderRankingItems(finals, sortedIds) {
    const positions = computeRankPositions(finals, sortedIds);
    return sortedIds.map((id, index) => {
        const tied = positions.filter(position => position === positions[index]).length > 1;
        return `
        <li>
            <div style="display: flex; align-items: center; gap: 15px;">
                <div class="ranking-position">${positions[index]}</div>
                <div style="flex-grow: 1;">
                    <strong>${escapeHtml(alternativeName(id))}</strong>
                    ${tied ? '<span class="tie-badge">Empate</span>' : ''}
                </div>
                <div class="score">${finals[id].toFixed(2)}</div>
            </div>
        </li>
        `;
    }).join('');
}

function renderMatrixRows(finals, sortedIds) {
    return sortedIds.map(alternativeId => {
        const cells = state.criteria.map(criterion => {
            const score = getScore(state.comparisonData[criterion.id], alternativeId);
            const weighted = score * state.weights[criterion.id];
            return `<td>${score}<br /><small>(${weighted.toFixed(2)})</small></td>`;
        }).join('');
        return `<tr><td><strong>${escapeHtml(alternativeName(alternativeId))}</strong></td>${cells}<td><strong>${finals[alternativeId].toFixed(2)}</strong></td></tr>`;
    }).join('');
}

// Alternativa(s) em 1º lugar, deixando claro quando há empate. Devolve texto puro.
function getRecommendationLabel(finals, sortedIds) {
    const names = topAlternatives(finals, sortedIds).map(alternativeName);
    if (names.length === 1) return names[0];
    return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]} (empate)`;
}

// Nome do método, indicando quando os sliders alteraram os pesos calculados por ele
function getResultsMethodLabel() {
    const adjusted = criterionIds().some(id =>
        Math.abs(state.weights[id] - state.originalWeights[id]) > FLOAT_TOLERANCE
    );
    return getWeightingMethodName() + (adjusted ? ' (pesos ajustados manualmente)' : '');
}

function displayResults() {
    const { finals, sortedIds } = getResults();

    const weightControls = state.criteria.map(criterion => {
        const percentage = (state.weights[criterion.id] * 100).toFixed(1);
        return `
            <div class="weight-control-item" style="display: flex; align-items: center; gap: 15px; padding: 10px; background: white; border-radius: 6px; border: 1px solid #ddd;">
                <div style="min-width: 150px; font-weight: 500;">${escapeHtml(criterion.name)}</div>
                <div style="flex-grow: 1; display: flex; align-items: center; gap: 10px;">
                    <input type="range" id="weight-${criterion.id}" min="0" max="100" value="${percentage}" step="0.1"
                           style="flex-grow: 1;" data-input="updateWeightFromControl" data-id="${criterion.id}" />
                    <div style="min-width: 80px; display: flex; align-items: center; gap: 5px;">
                        <input type="number" id="weight-input-${criterion.id}" min="0" max="100" step="0.1" value="${percentage}"
                               style="width: 60px; padding: 2px 4px; border: 1px solid #ccc; border-radius: 3px; text-align: center;"
                               data-change="updateWeightFromControl" data-id="${criterion.id}" />
                        <span style="font-size: 0.9em; color: #666;">%</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const matrixHeaders = state.criteria.map(criterion =>
        `<th>${escapeHtml(criterion.name)}<br /><small id="weight-header-${criterion.id}">Peso: ${(state.weights[criterion.id] * 100).toFixed(1)}%</small></th>`
    ).join('');

    document.getElementById('resultsInterface').innerHTML = `
        <div class="results">
            <h3>🏆 Ranking Final das Alternativas</h3>
            <ul class="ranking" id="dynamicRanking">${renderRankingItems(finals, sortedIds)}</ul>
        </div>

        <!-- Painel de Ajuste Dinâmico de Pesos -->
        <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
            <h3>⚖️ Ajuste Dinâmico dos Pesos</h3>
            <p style="margin-bottom: 15px; color: #666;">Ajuste os pesos abaixo e veja os resultados atualizarem em tempo real:</p>

            <!-- Controles de Normalização -->
            <div style="margin-bottom: 20px; padding: 15px; background: #fff; border-radius: 6px; border: 1px solid #ddd;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="autoNormalizeCheckbox" ${state.autoNormalize ? 'checked' : ''}
                               data-change="toggleAutoNormalize" style="transform: scale(1.2);" />
                        <span style="font-weight: 500;">Normalização Automática</span>
                    </label>
                </div>
                <div style="font-size: 0.9em; color: #666;">
                    <strong>Ativado:</strong> Os pesos são automaticamente ajustados para somar 100%<br/>
                    <strong>Desativado:</strong> Você controla os pesos manualmente (recomendado que somem 100%)
                </div>
                <div id="weightStatus" style="margin-top: 10px; padding: 8px; border-radius: 4px; font-size: 0.9em; font-weight: 500;"></div>
            </div>

            <div class="weight-controls" style="display: grid; gap: 15px;">${weightControls}</div>

            <div class="weight-action-buttons" style="margin-top: 15px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button class="btn btn-outline-primary" data-action="resetWeights">🔄 Restaurar Pesos Originais</button>
                <button class="btn btn-outline-success" data-action="equalizeWeights">⚖️ Equalizar Pesos</button>
                <button class="btn btn-outline-warning" data-action="normalizeWeightsManually">📐 Normalizar Agora</button>
            </div>
        </div>

        <div style="margin-top: 30px;">
            <h3>📊 Matriz de Decisão Completa</h3>
            <div style="overflow-x: auto;">
                <table class="matrix-table" id="dynamicMatrix">
                    <thead>
                        <tr>
                            <th>Alternativas</th>
                            ${matrixHeaders}
                            <th>Score Final</th>
                        </tr>
                    </thead>
                    <tbody id="matrixBody">${renderMatrixRows(finals, sortedIds)}</tbody>
                </table>
            </div>
        </div>

        <div style="margin-top: 30px;">
            <h3>📈 Resumo da Análise</h3>
            <div class="items-list">
                <div class="item"><span><strong>Problema:</strong> ${escapeHtml(state.problemTitle)}</span></div>
                <div class="item"><span><strong>Critérios:</strong> ${state.criteria.length}</span></div>
                <div class="item"><span><strong>Alternativas:</strong> ${state.alternatives.length}</span></div>
                <div class="item"><span><strong>Método de Pesagem:</strong> <span id="resultsMethod">${escapeHtml(getResultsMethodLabel())}</span></span></div>
                <div class="item"><span><strong>Alternativa Recomendada:</strong> <span id="topAlternative">${escapeHtml(getRecommendationLabel(finals, sortedIds))}</span></span></div>
            </div>
        </div>

        <!-- Exportação dos resultados -->
        <div class="results-export-actions" style="margin-top: 20px; text-align: center; display: flex; gap: 1rem; justify-content: center;">
            <button class="btn btn-secondary" data-action="saveResults">💾 Salvar JSON</button>
            <button class="btn btn-secondary" data-action="saveResultsImage">🖼️ Salvar Imagem</button>
        </div>
    `;

    updateWeightStatus();
}

// Define o peso de um critério: com a normalização ativa, o valor informado é
// mantido e os demais critérios dividem o restante proporcionalmente
function applyWeightChange(criterionId, percent) {
    const newWeight = Math.min(Math.max(percent, 0), 100) / 100;

    if (state.autoNormalize) {
        state.weights = redistributeWeights(state.weights, criterionId, newWeight);
    } else {
        state.weights[criterionId] = newWeight;
    }

    refreshWeightsAndResults();
}

function refreshWeightsAndResults() {
    updateWeightDisplays();
    updateWeightStatus();
    updateResultsDisplay();
}

function updateWeightDisplays() {
    state.criteria.forEach(criterion => {
        const percentage = (state.weights[criterion.id] * 100).toFixed(1);
        document.getElementById(`weight-${criterion.id}`).value = percentage;
        document.getElementById(`weight-input-${criterion.id}`).value = percentage;
        document.getElementById(`weight-header-${criterion.id}`).textContent = `Peso: ${percentage}%`;
    });
}

function updateWeightStatus() {
    const statusElement = document.getElementById('weightStatus');
    const total = Object.values(state.weights).reduce((sum, weight) => sum + weight, 0);
    const totalPercentage = (total * 100).toFixed(1);

    let html;
    let style;
    if (Math.abs(total - 1) < 0.001) {
        html = `✅ Total dos pesos: ${totalPercentage}% - Perfeito!`;
        style = 'background: #d4edda; color: #155724; border: 1px solid #c7ddc7;';
    } else if (total > 1) {
        html = `⚠️ Total dos pesos: ${totalPercentage}% - Acima de 100%`;
        style = 'background: #fff3cd; color: #856404; border: 1px solid #fce4a6;';
        if (!state.autoNormalize) html += '<br/>💡 Sugestão: Reduza alguns pesos ou ative a normalização automática';
    } else {
        html = `⚠️ Total dos pesos: ${totalPercentage}% - Abaixo de 100%`;
        style = 'background: #f8d7da; color: #721c24; border: 1px solid #f3c6cb;';
        if (!state.autoNormalize) html += '<br/>💡 Sugestão: Aumente alguns pesos ou ative a normalização automática';
    }

    statusElement.innerHTML = html;
    statusElement.style.cssText = style;
}

// Atualiza os resultados sem recriar os controles em uso
function updateResultsDisplay() {
    const { finals, sortedIds } = getResults();

    document.getElementById('dynamicRanking').innerHTML = renderRankingItems(finals, sortedIds);
    document.getElementById('matrixBody').innerHTML = renderMatrixRows(finals, sortedIds);
    document.getElementById('topAlternative').textContent = getRecommendationLabel(finals, sortedIds);
    document.getElementById('resultsMethod').textContent = getResultsMethodLabel();
}

function getWeightingMethodName() {
    const names = {
        ranksum: 'Rank-Sum',
        swingweighting: 'Swing (Swing Weighting)',
    };
    return names[state.weightingMethod] || 'Não selecionado';
}

registerActions({
    updateWeightFromControl: el => {
        const value = parseFloat(el.value);
        if (isNaN(value) || value < 0) {
            updateWeightDisplays();
            return;
        }
        applyWeightChange(el.dataset.id, value);
    },
    toggleAutoNormalize: el => {
        state.autoNormalize = el.checked;
        if (state.autoNormalize) {
            state.weights = normalizeWeights(state.weights);
            updateWeightDisplays();
            updateResultsDisplay();
        }
        updateWeightStatus();
    },
    resetWeights: () => {
        state.weights = { ...state.originalWeights };
        refreshWeightsAndResults();
    },
    equalizeWeights: () => {
        state.criteria.forEach(criterion => {
            state.weights[criterion.id] = 1 / state.criteria.length;
        });
        refreshWeightsAndResults();
    },
    normalizeWeightsManually: () => {
        state.weights = normalizeWeights(state.weights);
        refreshWeightsAndResults();
    },
});
