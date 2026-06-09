// Variáveis globais
        let currentStep = 1;
        let criteria = [];
        let alternatives = [];
        let weights = {};
        let scores = {};
        let currentCriterionIndex = 0;
        let comparisonData = {};
        let autoSaveTimeout;


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
    currentStep = 1;
    criteria = [];
    alternatives = [];
    weights = {};
    scores = {};
    currentCriterionIndex = 0;
    comparisonData = {};
    
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
    
    showSuccess('Sistema reiniciado! Você pode começar uma nova análise.');
}