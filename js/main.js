// Variáveis globais
        let currentStep = 1;
        let criteria = [];
        let alternatives = [];
        let weights = {};
        let scores = {};
        let currentCriterionIndex = 0;
        let comparisonData = {};
        let autoSaveTimeout;
        // Entradas dos formulários de pesagem, para sobreviverem à navegação entre passos
        let weightingInputs = { ranks: {}, worst: {}, mostImportant: null, swing: {} };
        // Título + descrição que já receberam sugestões da IA
        let aiSuggestionKey = null;


// Event listeners para Enter key
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('criterionInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addCriterion();
        }
    });
    
    document.getElementById('alternativeInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addAlternative();
        }
    });
    
    document.getElementById('weightingMethod').addEventListener('change', function() {
        setupWeightingInterface();
    });

    document.getElementById('problemTitle').addEventListener('input', function() {
        scheduleAutoSave();
    });
    
    document.getElementById('problemDescription').addEventListener('input', function() {
        scheduleAutoSave();
    });
});

// Função para reiniciar
function restart() {
    if (!confirm('Iniciar uma nova análise? A análise atual sairá da tela.')) {
        return;
    }

    currentStep = 1;
    criteria = [];
    alternatives = [];
    weights = {};
    scores = {};
    currentCriterionIndex = 0;
    comparisonData = {};
    weightingInputs = { ranks: {}, worst: {}, mostImportant: null, swing: {} };
    aiSuggestionKey = null;
    originalWeights = {};
    autoNormalize = true;
    lastResultsData = undefined;
    
    // Limpar todos os campos
    document.getElementById('problemTitle').value = '';
    document.getElementById('problemDescription').value = '';
    document.getElementById('criterionInput').value = '';
    document.getElementById('alternativeInput').value = '';
    document.getElementById('weightingMethod').value = '';
    
    // Resetar listas
    updateCriteriaList();
    updateAlternativesList();
    
    // Voltar para o primeiro passo
    document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
    document.getElementById('step1').classList.add('active');
    
    // Limpar interfaces
    document.getElementById('weightingInterface').innerHTML = '';
    document.getElementById('comparisonInterface').innerHTML = '';
    document.getElementById('resultsInterface').innerHTML = '';

    // Restaurar o estado visual inicial
    updateProgressBar();
    updateContextBanner();
    document.getElementById('apiConfigSection').classList.remove('collapsed');
    
    showSuccess('Sistema reiniciado! Você pode começar uma nova análise.');
}