// Regras de cálculo da decisão. Funções puras: não acessam o DOM nem o estado global.

const FLOAT_TOLERANCE = 1e-9;

/** Score de uma alternativa em um critério, ou null se ainda não foi definido. */
function getScore(entry, alternativeId) {
    if (!entry) return null;
    if (alternativeId === entry.best) return entry.bestScore ?? null;
    if (alternativeId === entry.worst) return entry.worstScore ?? null;
    return entry.scores?.[alternativeId] ?? null;
}

function isCriterionComplete(entry, alternativeIds) {
    return alternativeIds.every(id => getScore(entry, id) !== null);
}

/** Soma ponderada dos scores de cada alternativa. */
function computeFinalScores(criterionIds, alternativeIds, comparisonData, weights) {
    const finals = {};
    alternativeIds.forEach(alternativeId => {
        finals[alternativeId] = criterionIds.reduce(
            (sum, criterionId) => sum + getScore(comparisonData[criterionId], alternativeId) * weights[criterionId],
            0
        );
    });
    return finals;
}

function sortByFinalScore(alternativeIds, finals) {
    return [...alternativeIds].sort((a, b) => finals[b] - finals[a]);
}

function isTied(finals, a, b) {
    return Math.abs(finals[a] - finals[b]) < FLOAT_TOLERANCE;
}

/** Posições no ranking: alternativas empatadas dividem a posição (1, 1, 3). */
function computeRankPositions(finals, sortedIds) {
    const positions = [];
    sortedIds.forEach((id, index) => {
        const tiedWithPrevious = index > 0 && isTied(finals, id, sortedIds[index - 1]);
        positions.push(tiedWithPrevious ? positions[index - 1] : index + 1);
    });
    return positions;
}

function topAlternatives(finals, sortedIds) {
    return sortedIds.filter(id => isTied(finals, id, sortedIds[0]));
}

/** Rank-Sum: wi = (n - ri + 1) / Σ(n - rj + 1). Recebe a posição por id de critério. */
function computeRankSumWeights(ranks) {
    const ids = Object.keys(ranks);
    const values = Object.values(ranks);

    if (values.some(rank => !Number.isInteger(rank))) {
        return { ok: false, error: 'Defina a posição de todos os critérios no Rank-Sum.' };
    }
    if (new Set(values).size !== values.length) {
        return { ok: false, duplicate: true, error: 'Cada critério deve ter uma posição única.' };
    }

    const n = ids.length;
    const denominator = n * (n + 1) / 2;
    const weights = {};
    ids.forEach(id => {
        weights[id] = (n - ranks[id] + 1) / denominator;
    });
    return { ok: true, weights };
}

/** Normaliza valores brutos para somarem 1. Sem total positivo, devolve-os inalterados. */
function normalizeWeights(rawWeights) {
    const total = Object.values(rawWeights).reduce((sum, weight) => sum + weight, 0);
    if (total <= 0) return { ...rawWeights };

    const normalized = {};
    Object.keys(rawWeights).forEach(id => {
        normalized[id] = rawWeights[id] / total;
    });
    return normalized;
}

/** Fixa o peso de um critério; os demais dividem o restante na proporção atual. */
function redistributeWeights(weights, changedId, newWeight) {
    const otherIds = Object.keys(weights).filter(id => id !== changedId);
    const othersTotal = otherIds.reduce((sum, id) => sum + weights[id], 0);
    const remaining = 1 - newWeight;

    const result = { [changedId]: newWeight };
    otherIds.forEach(id => {
        result[id] = othersTotal > 0
            ? weights[id] * (remaining / othersTotal)
            : remaining / otherIds.length;
    });
    return result;
}

/** Extrai os critérios do texto da IA, sem marcadores de lista nem formatação Markdown. */
function parseCriteriaSuggestions(text) {
    return text
        .split(/[,\n]/)
        .map(s => s
            .trim()
            .replace(/^(?:[-*+•]+\s+|\d+[.)]\s*)/, '')
            .replace(/[*`]/g, '')
            .trim())
        .filter(s => s.length > 0);
}
