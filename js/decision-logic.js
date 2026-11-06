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

// ---- Cartão de recomendação ----

function renderRecommendation(finals, sortedIds) {
    const winners = topAlternatives(finals, sortedIds);
    const tie = winners.length > 1;
    const winner = winners[0];

    let margin = '';
    if (!tie && sortedIds.length > 1) {
        const second = sortedIds[1];
        margin = `<p class="recommendation-margin">+${(finals[winner] - finals[second]).toFixed(2)} sobre <strong>${escapeHtml(alternativeName(second))}</strong>, em 2º lugar.</p>`;
    } else if (tie) {
        margin = '<p class="recommendation-margin">Empate no 1º lugar. A análise de sensibilidade e os cenários ajudam a desempatar.</p>';
    }

    const analysis = analyzeSensitivity(criterionIds(), alternativeIds(), state.comparisonData, state.weights);
    let robustness = '';
    if (analysis.status === 'ok') {
        robustness = analysis.closest
            ? `Menor mudança que troca a vencedora: <strong>${escapeHtml(criterionName(analysis.closest.id))}</strong> de ${formatPercent(analysis.closest.from)} para ${formatPercent(analysis.closest.to)} (${(analysis.closest.change * 100).toFixed(1)} pontos percentuais).`
            : 'A vencedora se mantém alterando qualquer peso, um de cada vez.';
    }

    let attention = '';
    if (!tie) {
        const weaknesses = findWeaknesses(criterionIds(), alternativeIds(), state.comparisonData, winner);
        const items = weaknesses.map(w => `
            <li><strong>${escapeHtml(criterionName(w.id))}</strong>: score ${w.score}, ${w.kind === 'worst' ? 'o pior entre as alternativas' : `abaixo da média (${w.average.toFixed(1)})`}</li>
        `).join('');
        attention = `
            <div class="recommendation-attention">
                <h4>${icon('triangle-alert')} Pontos de atenção</h4>
                ${weaknesses.length
                    ? `<p>Antes de decidir, o livro recomenda avaliar os critérios em que a vencedora foi pior:</p><ul>${items}</ul>`
                    : '<p>A vencedora não fica abaixo da média em nenhum critério.</p>'}
            </div>
        `;
    }

    return `
        <div class="recommendation-header">
            <span class="recommendation-label">Recomendação</span>
            <div class="export-menu results-export-actions">
                <button type="button" class="btn btn-secondary btn-small" id="exportMenuButton" data-action="toggleExportMenu" aria-haspopup="menu" aria-expanded="false" aria-controls="exportMenuList">${icon('download')} Exportar</button>
                <div class="export-menu-list" id="exportMenuList" role="menu" hidden>
                    <button type="button" role="menuitem" data-action="printReport">${icon('printer')} Relatório em PDF</button>
                    <button type="button" role="menuitem" data-action="saveResultsImage">${icon('image')} Imagem (PNG)</button>
                    <button type="button" role="menuitem" data-action="saveResults">${icon('braces')} Dados (JSON)</button>
                </div>
            </div>
        </div>
        <p class="recommendation-name"><span id="topAlternative">${escapeHtml(getRecommendationLabel(finals, sortedIds))}</span><span class="recommendation-score">${finals[winner].toFixed(2)}</span></p>
        ${margin}
        ${robustness ? `<p class="recommendation-robustness">${icon('search')}<span>${robustness}</span></p>` : ''}
        ${attention}
        <p class="recommendation-meta">Método: <span id="resultsMethod">${escapeHtml(getResultsMethodLabel())}</span> · ${state.criteria.length} critérios · ${state.alternatives.length} alternativas</p>
    `;
}

// ---- Abas do resultado ----

const RESULT_TABS = [
    { id: 'ranking', label: 'Ranking', icon: 'trophy' },
    { id: 'matrix', label: 'Matriz', icon: 'table' },
    { id: 'contribution', label: 'Contribuição', icon: 'chart-bar' },
    { id: 'sensitivity', label: 'Sensibilidade', icon: 'search' },
    { id: 'scenarios', label: 'Cenários', icon: 'flask-conical' },
];
let activeResultTab = 'ranking';

function renderResultTabs() {
    return RESULT_TABS.map(tab => {
        const selected = tab.id === activeResultTab;
        return `<button type="button" role="tab" class="result-tab" id="tab-${tab.id}" aria-controls="panel-${tab.id}" aria-selected="${selected}" tabindex="${selected ? 0 : -1}" data-action="selectResultTab" data-tab="${tab.id}">${icon(tab.icon)} ${tab.label}</button>`;
    }).join('');
}

function resultPanel(id, title, content) {
    const tab = RESULT_TABS.find(t => t.id === id);
    return `
        <section class="result-panel" role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}" tabindex="0" ${id === activeResultTab ? '' : 'hidden'}>
            <h3 class="panel-heading">${icon(tab.icon)} ${title}</h3>
            ${content}
        </section>
    `;
}

function selectResultTab(id, focus = false) {
    activeResultTab = id;
    RESULT_TABS.forEach(tab => {
        const button = document.getElementById(`tab-${tab.id}`);
        const selected = tab.id === id;
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
        document.getElementById(`panel-${tab.id}`).hidden = !selected;
    });
    if (focus) document.getElementById(`tab-${id}`).focus();
}

function closeExportMenu() {
    const list = document.getElementById('exportMenuList');
    if (!list || list.hidden) return;
    list.hidden = true;
    document.getElementById('exportMenuButton').setAttribute('aria-expanded', 'false');
}

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !document.getElementById('exportMenuList')?.hidden) {
        closeExportMenu();
        document.getElementById('exportMenuButton')?.focus();
        return;
    }
    const tab = event.target.closest?.('.result-tab');
    if (!tab) return;
    const ids = RESULT_TABS.map(t => t.id);
    const index = ids.indexOf(tab.dataset.tab);
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: ids.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    selectResultTab(ids[(next + ids.length) % ids.length], true);
});

document.addEventListener('click', event => {
    if (!event.target.closest?.('.export-menu')) closeExportMenu();
});

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
        <div class="results-layout">
            <div class="results-main">
                <section class="recommendation-card" id="recommendationCard" aria-label="Recomendação">${renderRecommendation(finals, sortedIds)}</section>

                <div class="result-tabs" role="tablist" aria-label="Análises do resultado">${renderResultTabs()}</div>

                ${resultPanel('ranking', 'Ranking final das alternativas', `
                    <ul class="ranking" id="dynamicRanking">${renderRankingItems(finals, sortedIds)}</ul>
                    ${renderDominanceNotice()}
                `)}
                ${resultPanel('matrix', 'Matriz de decisão', `
                    <div class="table-scroll"><table class="matrix-table" id="dynamicMatrix">${renderMatrixContent(finals, sortedIds)}</table></div>
                    ${MATRIX_LEGEND}
                `)}
                ${resultPanel('contribution', 'Contribuição de cada critério', `<div id="contributionChart">${renderContributionChart()}</div>`)}
                ${resultPanel('sensitivity', 'Análise de sensibilidade', `<div id="sensitivityPanel">${renderSensitivity()}</div>`)}
                ${resultPanel('scenarios', 'Comparação de cenários', `
                    <p class="hint">Salve os pesos atuais como um cenário, ajuste os pesos e compare os rankings. Útil para discutir pontos de vista diferentes sobre a mesma decisão.</p>
                    <div class="scenario-form scenario-controls">
                        <input type="text" id="scenarioName" aria-label="Nome do cenário" placeholder="Ex: Foco em custo" maxlength="${MAX_SCENARIO_NAME_LENGTH}" data-enter="saveScenario">
                        <button type="button" class="btn btn-primary btn-small" data-action="saveScenario">Salvar cenário</button>
                    </div>
                    <div id="scenarioPanel">${renderScenarioContent()}</div>
                `)}
            </div>

            <aside class="weights-adjust" aria-labelledby="weightsAdjustTitle">
                <h3 id="weightsAdjustTitle">${icon('sliders-horizontal')} Ajustar pesos</h3>
                <p class="hint">Mude os pesos e veja a recomendação e as análises se atualizarem.</p>
                <label class="checkbox-label">
                    <input class="checkbox" type="checkbox" id="autoNormalizeCheckbox" ${state.autoNormalize ? 'checked' : ''} data-change="toggleAutoNormalize" />
                    Manter a soma em 100%
                </label>
                <div class="status-line" id="weightStatus"></div>
                <div class="weight-controls">${weightControls}</div>
                <div class="weight-action-buttons">
                    <button class="btn btn-secondary btn-small" data-action="resetWeights">${icon('rotate-ccw')} Restaurar pesos do método</button>
                    <button class="btn btn-secondary btn-small" data-action="equalizeWeights">${icon('scale')} Igualar</button>
                    <button class="btn btn-secondary btn-small" data-action="normalizeWeightsManually">${icon('gauge')} Normalizar</button>
                </div>
            </aside>
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

    document.getElementById('recommendationCard').innerHTML = renderRecommendation(finals, sortedIds);
    document.getElementById('dynamicRanking').innerHTML = renderRankingItems(finals, sortedIds);
    document.getElementById('dynamicMatrix').innerHTML = renderMatrixContent(finals, sortedIds);
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
    selectResultTab: el => selectResultTab(el.dataset.tab),
    toggleExportMenu: el => {
        const list = document.getElementById('exportMenuList');
        list.hidden = !list.hidden;
        el.setAttribute('aria-expanded', String(!list.hidden));
        if (!list.hidden) list.querySelector('[role="menuitem"]').focus();
    },
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
