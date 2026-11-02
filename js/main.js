// Inicialização: sincroniza os campos fixos da página com o estado

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('criterionInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addCriterion();
    });

    document.getElementById('alternativeInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addAlternative();
    });

    document.getElementById('weightingMethod').addEventListener('change', function(e) {
        state.weightingMethod = e.target.value;
        setupWeightingInterface();
    });

    document.getElementById('problemTitle').addEventListener('input', function(e) {
        state.problemTitle = e.target.value.trim();
        scheduleAutoSave();
    });

    document.getElementById('problemDescription').addEventListener('input', function(e) {
        state.problemDescription = e.target.value.trim();
        scheduleAutoSave();
    });
});

function restart() {
    if (!confirm('Iniciar uma nova análise? A análise atual sairá da tela.')) {
        return;
    }

    state = createInitialState();

    document.getElementById('problemTitle').value = '';
    document.getElementById('problemDescription').value = '';
    document.getElementById('criterionInput').value = '';
    document.getElementById('alternativeInput').value = '';
    document.getElementById('weightingMethod').value = '';

    document.getElementById('weightingInterface').innerHTML = '';
    document.getElementById('comparisonInterface').innerHTML = '';
    document.getElementById('resultsInterface').innerHTML = '';

    updateCriteriaList();
    updateAlternativesList();
    showStep(1);
    document.getElementById('apiConfigSection').classList.remove('collapsed');

    showSuccess('Sistema reiniciado! Você pode começar uma nova análise.');
}
