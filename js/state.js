// Estado único da aplicação. Critérios e alternativas têm um id estável, separado
// do nome: todo dado associado a eles (scores, pesos, entradas) é indexado pelo id.

function createInitialState() {
    return {
        currentStep: 1,
        problemTitle: '',
        problemDescription: '',
        criteria: [],      // [{ id, name }]
        alternatives: [],  // [{ id, name }]
        nextId: 1,
        // Por id de critério: { best, bestScore, worst, worstScore, scores, selectedPosition }
        comparisonData: {},
        currentCriterionIndex: 0,
        weightingMethod: '',
        // Entradas dos formulários de pesagem, para sobreviverem à navegação entre passos
        weightingInputs: { ranks: {}, worst: {}, mostImportant: null, swing: {} },
        weights: {},          // Pesos em uso, por id de critério
        originalWeights: {},  // Pesos calculados pelo método, antes dos sliders
        autoNormalize: true,
        aiSuggestionKey: null, // Título + descrição que já receberam sugestões da IA
    };
}

let state = createInitialState();

function createId(prefix) {
    return `${prefix}${state.nextId++}`;
}

function nameOf(list, id) {
    return list.find(item => item.id === id)?.name ?? '';
}

const criterionName = id => nameOf(state.criteria, id);
const alternativeName = id => nameOf(state.alternatives, id);
const criterionIds = () => state.criteria.map(c => c.id);
const alternativeIds = () => state.alternatives.map(a => a.id);
