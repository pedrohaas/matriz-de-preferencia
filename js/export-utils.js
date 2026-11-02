// Dados da decisão legíveis fora da aplicação: nomes no lugar dos ids internos
function buildExportData() {
    const { finals, sortedIds } = getResults();
    const byCriterionName = mapValue => Object.fromEntries(
        state.criteria.map(criterion => [criterion.name, mapValue(criterion.id)])
    );

    return {
        versao: 1,
        problema: state.problemTitle,
        descricao: state.problemDescription,
        metodo: getWeightingMethodName(),
        metodoId: state.weightingMethod,
        entradas: {
            posicoes: byCriterionName(id => state.weightingInputs.ranks[id]),
            piorCenario: byCriterionName(id => state.weightingInputs.worst[id]),
            maisImportante: criterionName(state.weightingInputs.mostImportant),
            impactos: byCriterionName(id => state.weightingInputs.swing[id]),
        },
        criterios: state.criteria.map(c => c.name),
        alternativas: state.alternatives.map(a => a.name),
        pesos: byCriterionName(id => state.weights[id]),
        resultadosBrutos: byCriterionName(id => {
            const entry = state.comparisonData[id];
            return {
                best: alternativeName(entry.best),
                bestScore: entry.bestScore,
                worst: alternativeName(entry.worst),
                worstScore: entry.worstScore,
                scores: Object.fromEntries(
                    Object.entries(entry.scores ?? {}).map(([altId, score]) => [alternativeName(altId), score])
                ),
            };
        }),
        scoresFinais: Object.fromEntries(state.alternatives.map(a => [a.name, finals[a.id]])),
        ordenacao: sortedIds.map(alternativeName),
    };
}

function saveResults() {
    const jsonString = JSON.stringify(buildExportData(), null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
    a.download = `resultados-matriz-preferencia-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function saveResultsImage() {
    const container = document.getElementById('resultsInterface');
    if (!container || container.innerHTML.trim() === '') {
        alert('Execute a análise antes de salvar a imagem.');
        return;
    }

    // O botão de "loading" para dar feedback ao usuário
    const btnSalvar = document.querySelector('[data-action="saveResultsImage"]');
    const originalBtnText = btnSalvar ? btnSalvar.innerHTML : '';
    if (btnSalvar) {
        btnSalvar.innerHTML = '⏳ Gerando...';
        btnSalvar.disabled = true;
    }

    // Criar um clone do container para não afetar a interface original durante a injeção
    const exportWrapper = document.createElement('div');
    exportWrapper.style.position = 'absolute';
    exportWrapper.style.left = '-9999px';
    exportWrapper.style.top = '0';
    exportWrapper.style.width = '1000px'; // Largura agradável e fixa para não quebrar tabelas
    exportWrapper.style.background = '#f8fafc'; // Fundo suave do site
    exportWrapper.style.padding = '40px';
    exportWrapper.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
    
    const clone = container.cloneNode(true);
    exportWrapper.appendChild(clone);
    document.body.appendChild(exportWrapper);

    // Substituir os sliders por barras puras no CLONE (html2canvas não lê ranges direito)
    const weightItems = clone.querySelectorAll('.weight-control-item');
    weightItems.forEach((item) => {
        const slider = item.querySelector('input[type="range"]');
        const label  = item.querySelector('.weight-control-label');
        if (slider && label) {
            const pct = parseFloat(slider.value).toFixed(1);
            item.innerHTML = `
                <div style="min-width: 150px; font-weight: 600; color: #153557;">${escapeHtml(label.textContent)}</div>
                <div style="flex: 1; display: flex; align-items: center; gap: 10px;">
                    <div style="flex: 1; height: 10px; background: #d4cdd0; border-radius: 5px; overflow: hidden;">
                        <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #2596be, #153557); border-radius: 5px;"></div>
                    </div>
                    <span style="min-width: 45px; font-size: 0.85rem; font-weight: 700; color: #153557; text-align: right;">${pct}%</span>
                </div>
            `;
        }
    });

    // Esconder na imagem os botões de ajuste de pesos e de exportação
    clone.querySelectorAll('.weight-action-buttons, .results-export-actions').forEach(element => {
        element.style.display = 'none';
    });

    // Injetar o CSS Inline para o html2canvas ler corretamente em ambiente local (file://)
    const styleEl = document.createElement('style');
    try {
        const cssResponse = await fetch('style.css?v=' + new Date().getTime());
        styleEl.textContent = await cssResponse.text();
    } catch (e) {
        console.warn('Fallback: lendo cssRules diretamente', e);
        let css = '';
        for (let i = 0; i < document.styleSheets.length; i++) {
            try {
                const rules = document.styleSheets[i].cssRules;
                if (rules) {
                    for (let j = 0; j < rules.length; j++) css += rules[j].cssText + '\n';
                }
            } catch(err) {}
        }
        styleEl.textContent = css;
    }
    exportWrapper.insertBefore(styleEl, exportWrapper.firstChild);

    try {
        const canvas = await html2canvas(exportWrapper, {
            backgroundColor: '#f8fafc',
            scale: 2,
            useCORS: true,
            logging: false,
        });

        canvas.toBlob(function(blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
            a.download = `matriz-preferencia-resultados-${timestamp}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    } catch (err) {
        console.error('Erro ao gerar imagem:', err);
        alert('Não foi possível gerar a imagem dos resultados.');
    } finally {
        document.body.removeChild(exportWrapper);
        if (btnSalvar) {
            btnSalvar.innerHTML = originalBtnText;
            btnSalvar.disabled = false;
        }
    }
}

registerActions({
    saveResults,
    saveResultsImage,
});

// ---- Importação ----

const MAX_IMPORT_BYTES = 1024 * 1024;
const MAX_IMPORT_ITEMS = 100;
const WEIGHTING_METHODS = ['ranksum', 'swingweighting'];

function parseNameList(value, label) {
    if (!Array.isArray(value) || value.length > MAX_IMPORT_ITEMS) {
        throw new Error(`Lista de ${label} inválida.`);
    }
    const names = value.map(name => (typeof name === 'string' ? name.trim() : ''));
    if (names.some(name => !name)) throw new Error(`Há ${label} sem nome.`);
    if (new Set(names).size !== names.length) throw new Error(`Há ${label} com nomes repetidos.`);
    return names;
}

function parseScore(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10) {
        throw new Error('Há scores fora da escala de 0 a 10.');
    }
    return value;
}

// Converte os dados de um critério, identificados por nome, para ids.
// Âncora que aponta para alternativa inexistente invalida o critério, que deve ser refeito.
function buildComparisonEntry(raw, alternativeIdByName) {
    if (raw === undefined || raw === null) return {};
    if (typeof raw !== 'object') throw new Error('Dados de scores inválidos.');

    const entry = {};
    if (!raw.best) return entry;

    const bestId = alternativeIdByName.get(raw.best);
    if (!bestId) return entry;
    entry.best = bestId;
    if (raw.bestScore === undefined || raw.bestScore === null) return entry;
    entry.bestScore = parseScore(raw.bestScore);

    if (!raw.worst) return entry;
    const worstId = alternativeIdByName.get(raw.worst);
    if (!worstId) return {};
    if (worstId === bestId) throw new Error('A melhor e a pior alternativa de um critério são a mesma.');
    entry.worst = worstId;
    if (raw.worstScore === undefined || raw.worstScore === null) return entry;
    entry.worstScore = parseScore(raw.worstScore);
    if (entry.worstScore > entry.bestScore) throw new Error('Há critério com a pior nota acima da melhor.');

    entry.scores = {};
    if (raw.scores !== undefined && (raw.scores === null || typeof raw.scores !== 'object')) {
        throw new Error('Dados de scores inválidos.');
    }
    Object.entries(raw.scores ?? {}).forEach(([name, value]) => {
        const id = alternativeIdByName.get(name);
        if (!id || id === bestId || id === worstId || value === null) return;
        const score = parseScore(value);
        if (score < entry.worstScore || score > entry.bestScore) {
            throw new Error('Há score fora da faixa definida pelas âncoras do critério.');
        }
        entry.scores[id] = score;
    });

    return entry;
}

function buildWeightingInputs(raw, criterionIdByName, criteriaCount) {
    const inputs = { ranks: {}, worst: {}, mostImportant: null, swing: {} };
    if (!raw || typeof raw !== 'object') return inputs;

    const copyValid = (source, target, isValid, convert) => {
        if (!source || typeof source !== 'object') return;
        Object.entries(source).forEach(([name, value]) => {
            const id = criterionIdByName.get(name);
            if (id && isValid(value)) target[id] = convert(value);
        });
    };

    copyValid(raw.posicoes, inputs.ranks,
        value => Number.isInteger(value) && value >= 1 && value <= criteriaCount, value => value);
    copyValid(raw.piorCenario, inputs.worst,
        value => Number.isFinite(parseFloat(value)), value => String(value));
    copyValid(raw.impactos, inputs.swing,
        value => parseFloat(value) >= 0 && parseFloat(value) <= 100, value => String(value));
    inputs.mostImportant = criterionIdByName.get(raw.maisImportante) ?? null;

    return inputs;
}

// Monta uma análise a partir de dados identificados por nome. Lança erro se forem inválidos.
function buildStateFromNames({ title, description, criteria, alternatives, comparison, method, inputs }) {
    if (typeof title !== 'string' || !title.trim()) throw new Error('O título do problema está ausente.');

    const analysis = createInitialState();
    const createItems = (names, prefix) => names.map(name => ({ id: `${prefix}${analysis.nextId++}`, name }));

    analysis.problemTitle = title.trim();
    analysis.problemDescription = typeof description === 'string' ? description.trim() : '';
    analysis.criteria = createItems(parseNameList(criteria, 'critérios'), 'c');
    analysis.alternatives = createItems(parseNameList(alternatives, 'alternativas'), 'a');

    const alternativeIdByName = new Map(analysis.alternatives.map(a => [a.name, a.id]));
    const criterionIdByName = new Map(analysis.criteria.map(c => [c.name, c.id]));

    analysis.criteria.forEach(criterion => {
        const hasData = comparison && typeof comparison === 'object' && Object.hasOwn(comparison, criterion.name);
        analysis.comparisonData[criterion.id] = hasData
            ? buildComparisonEntry(comparison[criterion.name], alternativeIdByName)
            : {};
    });

    analysis.weightingMethod = WEIGHTING_METHODS.includes(method) ? method : '';
    analysis.weightingInputs = buildWeightingInputs(inputs, criterionIdByName, analysis.criteria.length);

    return analysis;
}

function importAnalysisText(text) {
    let data;
    try {
        data = JSON.parse(text);
    } catch (error) {
        throw new Error('O arquivo não é um JSON válido.');
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('O arquivo não contém uma análise.');
    }

    const analysis = buildStateFromNames({
        title: data.problema,
        description: data.descricao,
        criteria: data.criterios,
        alternatives: data.alternativas,
        comparison: data.resultadosBrutos,
        method: data.metodoId,
        inputs: data.entradas,
    });

    // Os pesos são recalculados pelo formulário ao avançar para o resultado
    flushAutoSave();
    loadAnalysis(analysis, 5);
    lastSavedSnapshot = null;
    flushAutoSave();
    return analysis.problemTitle;
}

async function importAnalysisFile(input) {
    const file = input.files[0];
    input.value = '';
    if (!file) return;

    try {
        if (file.size > MAX_IMPORT_BYTES) throw new Error('O arquivo é grande demais (limite de 1 MB).');
        const title = importAnalysisText(await file.text());
        showSuccess(`Análise "${title}" importada. Confira os pesos para ver o resultado.`);
    } catch (error) {
        showError(`Não foi possível importar: ${error.message}`);
    }
}

registerActions({
    chooseImportFile: () => document.getElementById('importFile').click(),
    importAnalysisFile,
});
