// Painéis do resultado: gráfico de contribuição, comparação de cenários e relatório

// Cores por posição do critério, nesta ordem fixa, para cada um manter a sua. A partir
// do limite, os demais somam em "Outros", em vez de gerar cores indistinguíveis.
const CHART_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6'];
const CHART_OTHERS_COLOR = '#8a8a86';
const CHART_BASE_SCALE = 10;
const MAX_SCENARIOS = 8;
const MAX_SCENARIO_NAME_LENGTH = 60;

const CURRENT_SET_ID = 'atuais';
const METHOD_SET_ID = 'metodo';

// Séries do gráfico: um critério por cor, com "Outros" somando os excedentes
function getChartSeries() {
    const named = state.criteria.length > CHART_COLORS.length + 1
        ? state.criteria.slice(0, CHART_COLORS.length)
        : state.criteria;
    const series = named.map((criterion, index) => ({
        name: criterion.name,
        color: CHART_COLORS[index] ?? CHART_OTHERS_COLOR,
        ids: [criterion.id],
    }));

    const others = state.criteria.slice(named.length);
    if (others.length > 0) {
        series.push({ name: `Outros (${others.length})`, color: CHART_OTHERS_COLOR, ids: others.map(c => c.id) });
    }
    return series;
}

function renderChartSegment(alternativeId, serie, contributions, scale) {
    const parts = contributions.filter(part => serie.ids.includes(part.id));
    const value = parts.reduce((sum, part) => sum + part.value, 0);
    if (value <= 0) return '';

    const detail = parts.length === 1
        ? `${parts[0].score} × ${formatPercent(parts[0].weight)} = ${value.toFixed(2)}`
        : `${value.toFixed(2)} pontos`;
    const label = `${alternativeName(alternativeId)} · ${serie.name}: ${detail}`;

    return `<span class="chart-segment" style="width: ${(value / scale) * 100}%; background: ${serie.color};" data-tooltip="${escapeHtml(label)}"></span>`;
}

function renderContributionChart() {
    const { finals, sortedIds } = getResults();
    const series = getChartSeries();
    // Só passa de 10 se a normalização estiver desligada e os pesos somarem mais de 100%
    const scale = Math.max(CHART_BASE_SCALE, ...Object.values(finals));

    const rows = sortedIds.map(alternativeId => {
        const contributions = computeContributions(criterionIds(), alternativeId, state.comparisonData, state.weights);
        const name = escapeHtml(alternativeName(alternativeId));
        const summary = series
            .map(serie => {
                const value = contributions
                    .filter(part => serie.ids.includes(part.id))
                    .reduce((sum, part) => sum + part.value, 0);
                return `${serie.name} ${value.toFixed(2)}`;
            })
            .join(', ');
        const description = `${alternativeName(alternativeId)}: nota final ${finals[alternativeId].toFixed(2)}. ${summary}.`;

        return `
            <div class="chart-row">
                <div class="chart-row-name">${name}</div>
                <div class="chart-track" role="img" aria-label="${escapeHtml(description)}">
                    <div class="chart-bar">${series.map(serie => renderChartSegment(alternativeId, serie, contributions, scale)).join('')}</div>
                </div>
                <div class="chart-row-total">${finals[alternativeId].toFixed(2)}</div>
            </div>
        `;
    }).join('');

    const legend = series.map(serie => `
        <span class="chart-legend-item"><span class="chart-legend-swatch" style="background: ${serie.color};"></span>${escapeHtml(serie.name)}</span>
    `).join('');

    return `
        <p class="chart-subtitle">O comprimento da barra é a nota final. Cada trecho é quanto o critério soma a ela: nota × peso.</p>
        <div class="chart-legend">${legend}</div>
        <div class="chart-rows">${rows}</div>
        <div class="chart-axis" aria-hidden="true">
            <span>0</span><span>${(scale / 2).toFixed(scale === CHART_BASE_SCALE ? 0 : 1)}</span><span>${scale.toFixed(scale === CHART_BASE_SCALE ? 0 : 1)}</span>
        </div>
    `;
}

// Dica ao passar o mouse sobre um trecho do gráfico
function setupChartTooltip() {
    const tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.hidden = true;
    document.body.appendChild(tooltip);

    document.addEventListener('pointermove', event => {
        const segment = event.target.closest?.('[data-tooltip]');
        tooltip.hidden = !segment;
        if (!segment) return;

        tooltip.textContent = segment.dataset.tooltip;
        const left = Math.min(event.clientX + 12, window.innerWidth - tooltip.offsetWidth - 8);
        tooltip.style.left = `${Math.max(8, left)}px`;
        tooltip.style.top = `${event.clientY + 14}px`;
    });
}

document.addEventListener('DOMContentLoaded', setupChartTooltip);

// ---- Cenários ----

function getUsableScenarios() {
    return state.scenarios
        .map(scenario => ({ scenario, weights: scenarioWeightsFor(scenario, criterionIds()) }))
        .filter(item => item.weights);
}

function saveScenario() {
    const input = document.getElementById('scenarioName');
    const name = input.value.trim();

    if (!name) {
        showError('Dê um nome ao cenário, como "Foco em custo".');
        return;
    }
    if (name.length > MAX_SCENARIO_NAME_LENGTH) {
        showError(`O nome do cenário pode ter até ${MAX_SCENARIO_NAME_LENGTH} caracteres.`);
        return;
    }
    if (state.scenarios.some(scenario => scenario.name === name)) {
        showError('Já existe um cenário com este nome.');
        return;
    }
    if (state.scenarios.length >= MAX_SCENARIOS) {
        showError(`Só é possível comparar até ${MAX_SCENARIOS} cenários. Exclua um para salvar outro.`);
        return;
    }

    const weights = normalizeWeights(Object.fromEntries(criterionIds().map(id => [id, state.weights[id]])));
    if (Object.values(weights).every(weight => weight === 0)) {
        showError('Defina pelo menos um peso maior que zero para salvar o cenário.');
        return;
    }

    state.scenarios.push({ id: createId('s'), name, weights });
    input.value = '';
    renderScenarioPanel();
    showSuccess(`Cenário "${name}" salvo.`);
}

function renderScenarioList() {
    if (state.scenarios.length === 0) return '';

    const rows = state.scenarios.map(scenario => {
        const weights = scenarioWeightsFor(scenario, criterionIds());
        const name = escapeHtml(scenario.name);
        const description = weights
            ? state.criteria.map(c => `${escapeHtml(c.name)} ${formatPercent(weights[c.id])}`).join(' · ')
            : 'Os critérios mudaram depois deste cenário. Exclua-o e salve novamente.';

        return `
            <div class="scenario-item">
                <div class="scenario-item-info">
                    <strong>${name}</strong>
                    <small>${description}</small>
                </div>
                <div class="scenario-item-actions scenario-controls">
                    ${weights ? `<button type="button" class="btn btn-secondary btn-small" data-action="applyScenario" data-id="${scenario.id}" aria-label="Aplicar ${name}">Aplicar</button>` : ''}
                    <button type="button" class="remove-btn" data-action="deleteScenario" data-id="${scenario.id}" aria-label="Excluir ${name}">Excluir</button>
                </div>
            </div>
        `;
    }).join('');

    return `<div class="scenario-list">${rows}</div>`;
}

function renderScenarioTable() {
    const usable = getUsableScenarios();
    if (usable.length === 0) {
        return '<p class="scenario-empty">Ajuste os pesos e salve um cenário para comparar os rankings lado a lado.</p>';
    }

    const columns = [
        { id: CURRENT_SET_ID, name: 'Pesos atuais', weights: normalizeWeights(Object.fromEntries(criterionIds().map(id => [id, state.weights[id]]))) },
        { id: METHOD_SET_ID, name: `Método (${getWeightingMethodName()})`, weights: normalizeWeights(state.originalWeights) },
        ...usable.map(({ scenario, weights }) => ({ id: scenario.id, name: scenario.name, weights })),
    ];
    const results = compareWeightSets(criterionIds(), alternativeIds(), state.comparisonData, columns);
    const current = results[0];
    const rowOrder = sortByFinalScore(alternativeIds(), current.finals);

    const header = columns.map(column => `<th scope="col">${escapeHtml(column.name)}</th>`).join('');
    const rows = rowOrder.map(alternativeId => {
        const cells = results.map(result => {
            const isWinner = result.winners.includes(alternativeId);
            const text = `${result.positions[alternativeId]}º · ${result.finals[alternativeId].toFixed(2)}`;
            return `<td${isWinner ? ' class="scenario-winner"' : ''}>${isWinner ? `🏆 <strong>${text}</strong>` : text}</td>`;
        }).join('');
        return `<tr><th scope="row">${escapeHtml(alternativeName(alternativeId))}</th>${cells}</tr>`;
    }).join('');

    const winnerSets = new Set(results.map(result => [...result.winners].sort().join('|')));
    const conclusion = winnerSets.size === 1
        ? '<p class="scenario-conclusion">A vencedora é a mesma em todos os cenários.</p>'
        : '<p class="scenario-conclusion"><strong>A vencedora muda entre os cenários:</strong> a escolha depende de quais prioridades forem adotadas.</p>';

    return `
        ${conclusion}
        <div class="table-scroll">
            <table class="matrix-table scenario-table">
                <thead><tr><th scope="col">Alternativa</th>${header}</tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

function renderScenarioContent() {
    return renderScenarioTable() + renderScenarioList();
}

function renderScenarioPanel() {
    document.getElementById('scenarioPanel').innerHTML = renderScenarioContent();
}

// ---- Relatório ----

function renderReportWeights() {
    const rows = state.criteria.map(criterion => `
        <tr><td>${escapeHtml(criterion.name)}</td><td>${formatPercent(state.weights[criterion.id])}</td></tr>
    `).join('');
    return `
        <table class="matrix-table">
            <thead><tr><th scope="col">Critério</th><th scope="col">Peso</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function buildReport() {
    const { finals, sortedIds } = getResults();
    const positions = computeRankPositions(finals, sortedIds);
    const dominance = renderDominanceNotice();

    const ranking = sortedIds.map((id, index) => `
        <tr><td>${positions[index]}º</td><td>${escapeHtml(alternativeName(id))}</td><td>${finals[id].toFixed(2)}</td></tr>
    `).join('');

    document.getElementById('printReport').innerHTML = `
        <header class="report-header">
            <h1>${escapeHtml(state.problemTitle)}</h1>
            ${state.problemDescription ? `<p>${escapeHtml(state.problemDescription)}</p>` : ''}
            <p class="report-meta">Matriz de Preferência · Gerado em ${new Date().toLocaleString('pt-BR')}</p>
        </header>

        <section class="report-section report-summary">
            <h2>Recomendação</h2>
            <p class="report-recommendation">${escapeHtml(getRecommendationLabel(finals, sortedIds))}</p>
            <p>Método de pesagem: ${escapeHtml(getResultsMethodLabel())}. ${state.criteria.length} critérios e ${state.alternatives.length} alternativas.</p>
        </section>

        <section class="report-section">
            <h2>Ranking</h2>
            <table class="matrix-table">
                <thead><tr><th scope="col">Posição</th><th scope="col">Alternativa</th><th scope="col">Nota final</th></tr></thead>
                <tbody>${ranking}</tbody>
            </table>
        </section>

        <section class="report-section">
            <h2>Contribuição de cada critério</h2>
            ${renderContributionChart()}
        </section>

        <section class="report-section">
            <h2>Pesos utilizados</h2>
            ${renderReportWeights()}
        </section>

        <section class="report-section">
            <h2>Matriz de decisão</h2>
            <table class="matrix-table">${renderMatrixContent(finals, sortedIds)}</table>
            ${MATRIX_LEGEND}
        </section>

        ${dominance ? `<section class="report-section">${dominance}</section>` : ''}

        <section class="report-section">
            <h2>Análise de sensibilidade</h2>
            ${renderSensitivity()}
        </section>

        ${getUsableScenarios().length > 0 ? `
            <section class="report-section">
                <h2>Comparação de cenários</h2>
                ${renderScenarioContent()}
            </section>
        ` : ''}
    `;
}

function printReport() {
    buildReport();
    showSuccess('Na janela de impressão, escolha "Salvar como PDF".');
    window.print();
}

registerActions({
    saveScenario,
    applyScenario: el => {
        const scenario = state.scenarios.find(item => item.id === el.dataset.id);
        const weights = scenario && scenarioWeightsFor(scenario, criterionIds());
        if (!weights) return;
        state.weights = weights;
        refreshWeightsAndResults();
        showSuccess(`Pesos do cenário "${scenario.name}" aplicados.`);
    },
    deleteScenario: el => {
        state.scenarios = state.scenarios.filter(item => item.id !== el.dataset.id);
        renderScenarioPanel();
    },
    printReport,
});
