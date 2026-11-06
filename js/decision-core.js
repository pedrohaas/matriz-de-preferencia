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

/**
 * Alternativas dominadas: outra é pelo menos tão boa em todos os critérios e
 * estritamente melhor em algum. Não depende dos pesos.
 * Devolve [{ id, dominatedBy: [ids] }].
 */
function findDominatedAlternatives(criterionIds, alternativeIds, comparisonData) {
    const scoreOf = (criterionId, alternativeId) => getScore(comparisonData[criterionId], alternativeId);

    const dominates = (a, b) => {
        const atLeastAsGood = criterionIds.every(c => scoreOf(c, a) >= scoreOf(c, b) - FLOAT_TOLERANCE);
        const strictlyBetter = criterionIds.some(c => scoreOf(c, a) > scoreOf(c, b) + FLOAT_TOLERANCE);
        return atLeastAsGood && strictlyBetter;
    };

    return alternativeIds
        .map(id => ({ id, dominatedBy: alternativeIds.filter(other => other !== id && dominates(other, id)) }))
        .filter(item => item.dominatedBy.length > 0);
}

/**
 * Sensibilidade do 1º lugar ao peso de cada critério, variando um peso por vez e
 * mantendo a proporção entre os demais (como redistributeWeights).
 *
 * Com o peso t no critério i, a pontuação é linear em t:
 *   V(t) = t · score_i + (1 - t) · Σj≠i (wj / Σk≠i wk) · score_j
 * então cada rival cruza a vencedora em no máximo um valor de t.
 *
 * Status: 'ok', 'tie' (sem vencedora única) ou 'noWeights' (pesos zerados).
 * Em 'ok', cada critério traz `low` e `high`: o peso mais próximo, abaixo e acima do
 * atual, em que outra alternativa passa à frente, ou null se isso nunca ocorre.
 */
function analyzeSensitivity(criterionIds, alternativeIds, comparisonData, weights) {
    const rawWeights = Object.fromEntries(criterionIds.map(id => [id, weights[id]]));
    const total = Object.values(rawWeights).reduce((sum, weight) => sum + weight, 0);
    if (total <= FLOAT_TOLERANCE) return { status: 'noWeights' };

    const normalized = normalizeWeights(rawWeights);
    const finals = computeFinalScores(criterionIds, alternativeIds, comparisonData, normalized);
    const sortedIds = sortByFinalScore(alternativeIds, finals);
    const winners = topAlternatives(finals, sortedIds);
    if (winners.length > 1) return { status: 'tie', winners };

    const winner = winners[0];
    const rivals = alternativeIds.filter(id => id !== winner);
    const scoreOf = (criterionId, alternativeId) => getScore(comparisonData[criterionId], alternativeId);

    const criteria = criterionIds.map(id => {
        const current = normalized[id];
        const otherIds = criterionIds.filter(other => other !== id);
        const otherTotal = otherIds.reduce((sum, other) => sum + normalized[other], 0);
        const share = other => (otherTotal > FLOAT_TOLERANCE ? normalized[other] / otherTotal : 1 / otherIds.length);
        const otherValue = alternativeId =>
            otherIds.reduce((sum, other) => sum + share(other) * scoreOf(other, alternativeId), 0);

        let low = null;
        let high = null;
        rivals.forEach(rival => {
            const gapWithoutCriterion = otherValue(winner) - otherValue(rival);
            const gapOnCriterion = scoreOf(id, winner) - scoreOf(id, rival);
            const denominator = gapWithoutCriterion - gapOnCriterion;
            if (Math.abs(denominator) < FLOAT_TOLERANCE) return;

            const crossing = gapWithoutCriterion / denominator;
            if (crossing <= FLOAT_TOLERANCE || crossing >= 1 - FLOAT_TOLERANCE) return;

            if (crossing > current && (!high || crossing < high.weight)) {
                high = { weight: crossing, challenger: rival };
            } else if (crossing < current && (!low || crossing > low.weight)) {
                low = { weight: crossing, challenger: rival };
            }
        });

        return { id, weight: current, low, high };
    });

    let closest = null;
    criteria.forEach(criterion => {
        [criterion.low, criterion.high].forEach(limit => {
            if (!limit) return;
            const change = Math.abs(limit.weight - criterion.weight);
            if (!closest || change < closest.change) {
                closest = { id: criterion.id, from: criterion.weight, to: limit.weight, change, challenger: limit.challenger };
            }
        });
    });

    return { status: 'ok', winner, criteria, closest };
}

/** Quanto cada critério soma à nota final de uma alternativa: nota × peso. */
function computeContributions(criterionIds, alternativeId, comparisonData, weights) {
    return criterionIds.map(id => {
        const score = getScore(comparisonData[id], alternativeId);
        return { id, score, weight: weights[id], value: score * weights[id] };
    });
}

/**
 * Pesos de um cenário para os critérios atuais, normalizados. Devolve null se o cenário
 * não puder ser usado: critério adicionado depois de salvo ou pesos zerados.
 */
function scenarioWeightsFor(scenario, criterionIds) {
    if (!criterionIds.every(id => Number.isFinite(scenario.weights[id]))) return null;

    const raw = Object.fromEntries(criterionIds.map(id => [id, scenario.weights[id]]));
    const total = Object.values(raw).reduce((sum, weight) => sum + weight, 0);
    return total > FLOAT_TOLERANCE ? normalizeWeights(raw) : null;
}

/** Ranking de cada conjunto de pesos. Recebe [{ id, weights }]. */
function compareWeightSets(criterionIds, alternativeIds, comparisonData, weightSets) {
    return weightSets.map(({ id, weights }) => {
        const finals = computeFinalScores(criterionIds, alternativeIds, comparisonData, weights);
        const sortedIds = sortByFinalScore(alternativeIds, finals);
        const positionList = computeRankPositions(finals, sortedIds);
        const positions = Object.fromEntries(sortedIds.map((alternativeId, index) => [alternativeId, positionList[index]]));
        return { id, finals, positions, winners: topAlternatives(finals, sortedIds) };
    });
}

/** Critérios em que todas as alternativas têm o mesmo score: não ajudam a comparar. */
function findUniformCriteria(criterionIds, alternativeIds, comparisonData) {
    return criterionIds.filter(id => {
        const scores = alternativeIds.map(alternativeId => getScore(comparisonData[id], alternativeId));
        return scores.length > 1
            && scores.every(score => score !== null)
            && scores.every(score => Math.abs(score - scores[0]) < FLOAT_TOLERANCE);
    });
}

/**
 * Faixa em que o score de uma alternativa pode ser alterado sem desfazer as âncoras:
 * a melhor não pode ficar abaixo de nenhuma outra, a pior não pode ficar acima, e as
 * demais ficam entre as duas.
 */
function getScoreBounds(entry, alternativeId, alternativeIds) {
    const others = alternativeIds
        .filter(id => id !== alternativeId)
        .map(id => getScore(entry, id))
        .filter(score => score !== null);

    if (alternativeId === entry.best) return { min: others.length ? Math.max(...others) : 0, max: 10 };
    if (alternativeId === entry.worst) return { min: 0, max: others.length ? Math.min(...others) : 10 };
    return { min: entry.worstScore, max: entry.bestScore };
}

/**
 * Critérios em que a alternativa teve o pior score ou ficou abaixo da média das
 * alternativas: os pontos que o livro pede para examinar antes de decidir.
 * Critérios em que todas empatam são ignorados.
 */
function findWeaknesses(criterionIds, alternativeIds, comparisonData, alternativeId) {
    return criterionIds.map(id => {
        const scores = alternativeIds.map(other => getScore(comparisonData[id], other));
        if (scores.every(score => Math.abs(score - scores[0]) < FLOAT_TOLERANCE)) return null;

        const own = getScore(comparisonData[id], alternativeId);
        const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        if (Math.abs(own - Math.min(...scores)) < FLOAT_TOLERANCE) return { id, score: own, kind: 'worst', average };
        if (own < average - FLOAT_TOLERANCE) return { id, score: own, kind: 'below-average', average };
        return null;
    }).filter(Boolean);
}
