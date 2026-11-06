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
        scheduleAutoSave();
    });

    document.getElementById('problemTitle').addEventListener('input', function(e) {
        state.problemTitle = e.target.value.trim();
        scheduleAutoSave();
    });

    document.getElementById('problemDescription').addEventListener('input', function(e) {
        state.problemDescription = e.target.value.trim();
        scheduleAutoSave();
    });

    receiveMigratedAnalyses(location.hash);
    migrateLegacyAnalyses();
    renderSavedAnalyses();
    renderExamples();
    syncDisplayToggles();
    refreshShell();
});

function resetApp() {
    clearTimeout(autoSaveTimeout);
    state = createInitialState();
    lastSavedSnapshot = null;

    syncFixedFields();
    document.getElementById('criterionInput').value = '';
    document.getElementById('alternativeInput').value = '';
    ['weightingInterface', 'comparisonInterface', 'resultsInterface'].forEach(id => {
        document.getElementById(id).innerHTML = '';
    });

    updateCriteriaList();
    updateAlternativesList();
    showStep(1);
    setSaveStatus('Defina um título para salvar automaticamente');
}

function restart() {
    if (!confirm('Iniciar uma nova análise? A análise atual continuará disponível em "Análises salvas".')) {
        return;
    }

    flushAutoSave();
    resetApp();
    showSuccess('Sistema reiniciado! Você pode começar uma nova análise.');
}
