// Navegação entre os passos e tela de resultados

let aiModalResolver = null;

function showAiModal(suggestions) {
    return new Promise(resolve => {
        const modal = document.getElementById('aiSuggestionModal');
        const container = document.getElementById('aiCriteriaContainer');
        container.innerHTML = '';

        suggestions.forEach(suggestion => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'ai-chip selected';
            chip.textContent = suggestion.trim();
            chip.setAttribute('aria-pressed', 'true');
            chip.onclick = () => {
                const selected = chip.classList.toggle('selected');
                chip.setAttribute('aria-pressed', String(selected));
            };
            container.appendChild(chip);
        });

        aiModalResolver = resolve;
        modal.classList.add('active');
        container.querySelector('.ai-chip')?.focus();
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

// Com o modal aberto, Esc equivale a ignorar e Tab não sai dele
document.addEventListener('keydown', event => {
    const modal = document.getElementById('aiSuggestionModal');
    if (!modal.classList.contains('active')) return;

    if (event.key === 'Escape') {
        closeAiModal(false);
    } else if (event.key === 'Tab') {
        const buttons = [...modal.querySelectorAll('button')];
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
});

// Mostra um passo e prepara a interface dele, sem alterar os dados já informados
function showStep(step) {
    setView('wizard');
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
        displayResults();
    }

    updateProgressBar();
    updateContextBanner();
    moveToStepStart(step);
    if (step === 1) {
        flushAutoSave();
        renderSavedAnalyses();
    } else {
        scheduleAutoSave();
    }
    refreshShell();
}

// Ao trocar de passo, leva a leitura e o foco do teclado para o início dele
function moveToStepStart(step) {
    const stepElement = document.getElementById(`step${step}`);
    if (stepElement.getBoundingClientRect().top < 0) stepElement.scrollIntoView();

    const title = stepElement.querySelector('.step-title');
    title.setAttribute('tabindex', '-1');
    title.focus({ preventScroll: true });
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

// Sai de um passo já validado para o seguinte. Os pesos do método são guardados aqui
// para que os sliders do resultado possam ser comparados e restaurados.
function advanceFrom(step) {
    if (step === 5) state.originalWeights = { ...state.weights };
    showStep(step + 1);
}

async function nextStep() {
    const step = state.currentStep;
    if (step >= 6 || !validateStep(step)) return;

    if (step === 1) await offerAiSuggestions();

    advanceFrom(step);
}

function prevStep() {
    if (state.currentStep > 1) showStep(state.currentStep - 1);
}

// Navegação direta pela barra de progresso. Para avançar, valida cada passo do caminho
// e para no primeiro incompleto, onde o erro explica o que falta.
function goToStep(targetStep) {
    if (targetStep < state.currentStep) {
        showStep(targetStep);
        return;
    }
    while (state.currentStep < targetStep) {
        if (!validateStep(state.currentStep)) return;
        advanceFrom(state.currentStep);
    }
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
        if (i === activeIndex) {
            item.setAttribute('aria-current', 'step');
        } else {
            item.removeAttribute('aria-current');
        }
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

    document.getElementById('contextTitle').textContent = state.problemTitle;
    document.getElementById('contextDesc').textContent = state.problemDescription;
    banner.classList.add('visible');
}


// ---- Resultados ----

function getResults() {
    const finals = computeFinalScores(criterionIds(), alternativeIds(), state.comparisonData, state.weights);
    return { finals, sortedIds: sortByFinalScore(alternativeIds(), finals) };
}

function renderRankingItems(finals, sortedIds) {
    const positions = computeRankPositions(finals, sortedIds);
    return sortedIds.map((id, index) => {
        const tied = positions.filter(position => position === positions[index]).length > 1;
        return `
        <li>
            <div class="ranking-row">
                <div class="ranking-position">${positions[index]}</div>
                <div class="grow">
                    <strong>${escapeHtml(alternativeName(id))}</strong>
                    ${tied ? '<span class="tie-badge">Empate</span>' : ''}
                </div>
                <div class="score">${finals[id].toFixed(2)}</div>
            </div>
        </li>
        `;
    }).join('');
}

// Pontos de swing por critério, ou null se não se aplicarem aos pesos em uso:
// outro método, formulário incompleto ou pesos alterados pelos sliders
function getSwingPoints() {
    if (state.weightingMethod !== 'swingweighting' || hasManualWeightAdjustment()) return null;

    const { mostImportant, swing } = state.weightingInputs;
    const points = {};
    for (const id of criterionIds()) {
        points[id] = id === mostImportant ? 100 : parseFloat(swing[id]);
        if (!Number.isFinite(points[id])) return null;
    }
    return points;
}

// Matriz de decisão no formato do livro: critérios nas linhas, alternativas nas colunas
// em ordem de ranking, com o melhor e o pior score de cada critério em destaque
function renderMatrixContent(finals, sortedIds) {
    const swingPoints = getSwingPoints();
    const swingHeader = swingPoints ? '<th scope="col" rowspan="2">Swing</th>' : '';
    const alternativeHeaders = sortedIds.map(id => `<th scope="col">${escapeHtml(alternativeName(id))}</th>`).join('');

    const rows = state.criteria.map(criterion => {
        const entry = state.comparisonData[criterion.id];
        const scores = sortedIds.map(id => getScore(entry, id));
        const best = Math.max(...scores);
        const worst = Math.min(...scores);

        const cells = scores.map(score => {
            // Sem diferença entre as alternativas, não há melhor nem pior
            if (best === worst) return `<td>${score}</td>`;
            if (score === best) return `<td class="matrix-best" title="Melhor score do critério">${score}</td>`;
            if (score === worst) return `<td class="matrix-worst" title="Pior score do critério">${score}</td>`;
            return `<td>${score}</td>`;
        }).join('');

        const swingCell = swingPoints ? `<td>${swingPoints[criterion.id]}</td>` : '';
        return `<tr><th scope="row">${escapeHtml(criterion.name)}</th>${swingCell}<td>${(state.weights[criterion.id] * 100).toFixed(1)}%</td>${cells}</tr>`;
    }).join('');

    const totalWeight = criterionIds().reduce((sum, id) => sum + state.weights[id], 0);
    const swingTotal = swingPoints
        ? `<td><strong>${Object.values(swingPoints).reduce((sum, value) => sum + value, 0)}</strong></td>`
        : '';
    const totals = sortedIds.map(id => `<td><strong>${finals[id].toFixed(2)}</strong></td>`).join('');

    return `
        <thead>
            <tr>
                <th scope="col" rowspan="2">Critério</th>
                ${swingHeader}
                <th scope="col" rowspan="2">Peso</th>
                <th scope="colgroup" colspan="${sortedIds.length}">Alternativas</th>
            </tr>
            <tr>${alternativeHeaders}</tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
            <tr>
                <th scope="row">TOTAL (Somatória)</th>
                ${swingTotal}
                <td><strong>${(totalWeight * 100).toFixed(0)}%</strong></td>
                ${totals}
            </tr>
        </tfoot>
    `;
}

const MATRIX_LEGEND = `
    <p class="matrix-legend">
        <span class="matrix-legend-item"><span class="matrix-legend-swatch matrix-best"></span>Melhor score do critério</span>
        <span class="matrix-legend-item"><span class="matrix-legend-swatch matrix-worst"></span>Pior score do critério</span>
    </p>
`;

// Alternativa(s) em 1º lugar, deixando claro quando há empate. Devolve texto puro.
function getRecommendationLabel(finals, sortedIds) {
    const names = topAlternatives(finals, sortedIds).map(alternativeName);
    if (names.length === 1) return names[0];
    return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]} (empate)`;
}

// Nome do método, indicando quando os sliders alteraram os pesos calculados por ele
function hasManualWeightAdjustment() {
    return criterionIds().some(id =>
        Math.abs(state.weights[id] - state.originalWeights[id]) > FLOAT_TOLERANCE
    );
}

function getResultsMethodLabel() {
    return getWeightingMethodName() + (hasManualWeightAdjustment() ? ' (pesos ajustados manualmente)' : '');
}

function renderDominanceNotice() {
    const dominated = findDominatedAlternatives(criterionIds(), alternativeIds(), state.comparisonData);
    if (dominated.length === 0) return '';

    const items = dominated.map(({ id, dominatedBy }) => {
        const names = dominatedBy.map(other => `<strong>${escapeHtml(alternativeName(other))}</strong>`).join(', ');
        return `<li><strong>${escapeHtml(alternativeName(id))}</strong> é dominada por ${names}</li>`;
    }).join('');

    return `
        <div class="insight-box insight-warning" id="dominanceNotice">
            <h4>${icon('triangle-alert')} Alternativas dominadas</h4>
            <p>Nenhuma combinação de pesos pode colocá-las à frente da alternativa que as domina, que é pelo menos tão boa em todos os critérios e melhor em algum. Podem ser eliminadas da análise.</p>
            <ul>${items}</ul>
        </div>
    `;
}

const formatPercent = weight => `${(weight * 100).toFixed(1)}%`;

function renderSensitivityLimit(limit) {
    if (!limit) return '<span class="sensitivity-none">Não muda</span>';
    return `${formatPercent(limit.weight)} <small>→ ${escapeHtml(alternativeName(limit.challenger))}</small>`;
}

function renderSensitivity() {
    const analysis = analyzeSensitivity(criterionIds(), alternativeIds(), state.comparisonData, state.weights);

    if (analysis.status === 'noWeights') {
        return '<p>Defina pelo menos um peso maior que zero para analisar a sensibilidade.</p>';
    }
    if (analysis.status === 'tie') {
        return '<p>Há empate no 1º lugar: não existe uma única vencedora para analisar. Ajuste os pesos ou os scores para desempatar.</p>';
    }

    const winner = escapeHtml(alternativeName(analysis.winner));
    const summary = analysis.closest
        ? `<p>A menor mudança que troca a vencedora <strong>${winner}</strong> é levar <strong>${escapeHtml(criterionName(analysis.closest.id))}</strong> de ${formatPercent(analysis.closest.from)} para ${formatPercent(analysis.closest.to)} (${(analysis.closest.change * 100).toFixed(1)} pontos percentuais): ${escapeHtml(alternativeName(analysis.closest.challenger))} passa à frente.</p>`
        : `<p><strong>${winner}</strong> continua em 1º lugar qualquer que seja o peso de cada critério, alterando um de cada vez.</p>`;

    const rows = analysis.criteria.map(criterion => `
        <tr>
            <td>${escapeHtml(criterionName(criterion.id))}</td>
            <td>${formatPercent(criterion.weight)}</td>
            <td>${renderSensitivityLimit(criterion.low)}</td>
            <td>${renderSensitivityLimit(criterion.high)}</td>
        </tr>
    `).join('');

    const total = criterionIds().reduce((sum, id) => sum + state.weights[id], 0);
    const normalizationNote = Math.abs(total - 1) < 0.001
        ? ''
        : '<p class="sensitivity-note">Os pesos atuais não somam 100%: esta análise usa os valores normalizados.</p>';

    return `
        ${summary}
        <div class="table-scroll">
            <table class="matrix-table sensitivity-table">
                <thead>
                    <tr>
                        <th>Critério</th>
                        <th>Peso atual</th>
                        <th>Vencedora muda abaixo de</th>
                        <th>Vencedora muda acima de</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        ${normalizationNote}
        <p class="sensitivity-note">Cada linha varia um peso e mantém a proporção entre os demais. A seta indica qual alternativa passa à frente.</p>
    `;
}

function displayResults() {
    const { finals, sortedIds } = getResults();

    const weightControls = state.criteria.map(criterion => {
        const percentage = (state.weights[criterion.id] * 100).toFixed(1);
        return `
            <div class="weight-control-item">
                <div class="weight-control-label">${escapeHtml(criterion.name)}</div>
                <div class="weight-control-inputs">
                    <input class="grow" type="range" id="weight-${criterion.id}" aria-label="Peso de ${escapeHtml(criterion.name)}" min="0" max="100" value="${percentage}" step="0.1"
                           data-input="updateWeightFromControl" data-id="${criterion.id}" />
                    <div class="weight-control-number">
                        <input class="input-compact" type="number" id="weight-input-${criterion.id}" aria-label="Peso de ${escapeHtml(criterion.name)} em porcentagem" min="0" max="100" step="0.1" value="${percentage}"
                              
                               data-change="updateWeightFromControl" data-id="${criterion.id}" />
                        <span class="hint">%</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('resultsInterface').innerHTML = `
        <div class="results">
            <h3>${icon('trophy')} Ranking final das alternativas</h3>
            <ul class="ranking" id="dynamicRanking">${renderRankingItems(finals, sortedIds)}</ul>
        </div>

        ${renderDominanceNotice()}

        <!-- Painel de Ajuste Dinâmico de Pesos -->
        <div class="insight-box section-gap">
            <h3>${icon('sliders-horizontal')} Ajuste dinâmico dos pesos</h3>
            <p class="muted">Ajuste os pesos abaixo e veja os resultados atualizarem em tempo real:</p>

            <!-- Controles de Normalização -->
            <div class="subpanel">
                <div class="row-center">
                    <label class="checkbox-label">
                        <input class="checkbox" type="checkbox" id="autoNormalizeCheckbox" ${state.autoNormalize ? 'checked' : ''}
                               data-change="toggleAutoNormalize" />
                        <span class="fw-500">Normalização Automática</span>
                    </label>
                </div>
                <div class="hint">
                    <strong>Ativado:</strong> Os pesos são automaticamente ajustados para somar 100%<br/>
                    <strong>Desativado:</strong> Você controla os pesos manualmente (recomendado que somem 100%)
                </div>
                <div class="status-line" id="weightStatus"></div>
            </div>

            <div class="weight-controls">${weightControls}</div>

            <div class="weight-action-buttons">
                <button class="btn btn-outline-primary" data-action="resetWeights">${icon('rotate-ccw')} Restaurar pesos originais</button>
                <button class="btn btn-outline-success" data-action="equalizeWeights">${icon('scale')} Equalizar pesos</button>
                <button class="btn btn-outline-warning" data-action="normalizeWeightsManually">${icon('gauge')} Normalizar agora</button>
            </div>
        </div>

        <div class="section-gap">
            <h3>${icon('table')} Matriz de decisão</h3>
            <div class="table-scroll">
                <table class="matrix-table" id="dynamicMatrix">${renderMatrixContent(finals, sortedIds)}</table>
            </div>
            ${MATRIX_LEGEND}
        </div>

        <div class="insight-box section-gap">
            <h3>${icon('chart-bar')} Contribuição de cada critério</h3>
            <div id="contributionChart">${renderContributionChart()}</div>
        </div>

        <div class="insight-box section-gap">
            <h3>${icon('search')} Análise de sensibilidade</h3>
            <div id="sensitivityPanel">${renderSensitivity()}</div>
        </div>

        <div class="insight-box section-gap">
            <h3>${icon('flask-conical')} Comparação de cenários</h3>
            <p>Salve os pesos atuais como um cenário, ajuste os sliders e compare os rankings. Útil para discutir pontos de vista diferentes sobre a mesma decisão.</p>
            <div class="scenario-form scenario-controls">
                <input type="text" id="scenarioName" aria-label="Nome do cenário" placeholder="Ex: Foco em custo" maxlength="${MAX_SCENARIO_NAME_LENGTH}" data-enter="saveScenario">
                <button type="button" class="btn btn-primary btn-small" data-action="saveScenario">Salvar cenário</button>
            </div>
            <div id="scenarioPanel">${renderScenarioContent()}</div>
        </div>

        <div class="section-gap">
            <h3>${icon('list')} Resumo da análise</h3>
            <div class="items-list">
                <div class="item"><span><strong>Problema:</strong> ${escapeHtml(state.problemTitle)}</span></div>
                <div class="item"><span><strong>Critérios:</strong> ${state.criteria.length}</span></div>
                <div class="item"><span><strong>Alternativas:</strong> ${state.alternatives.length}</span></div>
                <div class="item"><span><strong>Método de Pesagem:</strong> <span id="resultsMethod">${escapeHtml(getResultsMethodLabel())}</span></span></div>
                <div class="item"><span><strong>Alternativa Recomendada:</strong> <span id="topAlternative">${escapeHtml(getRecommendationLabel(finals, sortedIds))}</span></span></div>
            </div>
        </div>

        <!-- Exportação dos resultados -->
        <div class="results-export-actions">
            <button class="btn btn-secondary" data-action="saveResults">${icon('braces')} Salvar JSON</button>
            <button class="btn btn-secondary" data-action="saveResultsImage">${icon('image')} Salvar imagem</button>
            <button class="btn btn-secondary" data-action="printReport">${icon('printer')} Relatório em PDF</button>
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
    });
}

function updateWeightStatus() {
    const statusElement = document.getElementById('weightStatus');
    const total = Object.values(state.weights).reduce((sum, weight) => sum + weight, 0);
    const totalPercentage = (total * 100).toFixed(1);

    let html;
    let tone;
    if (Math.abs(total - 1) < 0.001) {
        html = `${icon('circle-check')} Total dos pesos: ${totalPercentage}%`;
        tone = 'status-ok';
    } else if (total > 1) {
        html = `${icon('triangle-alert')} Total dos pesos: ${totalPercentage}%, acima de 100%`;
        tone = 'status-warn';
        if (!state.autoNormalize) html += '<br/>Reduza alguns pesos ou ative a normalização automática.';
    } else {
        html = `${icon('triangle-alert')} Total dos pesos: ${totalPercentage}%, abaixo de 100%`;
        tone = 'status-error';
        if (!state.autoNormalize) html += '<br/>Aumente alguns pesos ou ative a normalização automática.';
    }

    statusElement.innerHTML = html;
    statusElement.className = `status-line ${tone}`;
}

// Atualiza os resultados sem recriar os controles em uso
function updateResultsDisplay() {
    const { finals, sortedIds } = getResults();

    document.getElementById('dynamicRanking').innerHTML = renderRankingItems(finals, sortedIds);
    document.getElementById('dynamicMatrix').innerHTML = renderMatrixContent(finals, sortedIds);
    document.getElementById('topAlternative').textContent = getRecommendationLabel(finals, sortedIds);
    document.getElementById('resultsMethod').textContent = getResultsMethodLabel();
    document.getElementById('contributionChart').innerHTML = renderContributionChart();
    document.getElementById('sensitivityPanel').innerHTML = renderSensitivity();
    renderScenarioPanel();
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
