function scheduleAutoSave() {
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }
    autoSaveTimeout = setTimeout(() => {
        salvarAutomaticamente();
    }, 2000);
}

function salvarAutomaticamente() {
    const titulo = document.getElementById('problemTitle').value.trim();
    
    if (!titulo) {
        return;
    }
    
    const novaMatriz = {
        problemTitle: titulo,
        problemDescription: document.getElementById('problemDescription').value.trim(),
        criteria,
        alternatives,
        weights,
        scores,
        comparisonData,
        lastSaved: new Date().toISOString()
    };

    const todas = JSON.parse(localStorage.getItem('matrizesSalvas')) || {};
    todas[titulo] = novaMatriz;
    localStorage.setItem('matrizesSalvas', JSON.stringify(todas));

    showAutoSaveIndicator();
}

function showAutoSaveIndicator() {
    const existingIndicator = document.querySelector('.auto-save-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    const indicator = document.createElement('div');
    indicator.className = 'auto-save-indicator';
    indicator.innerHTML = '💾 Salvo automaticamente';
    
    document.body.appendChild(indicator);
    
    setTimeout(() => {
        indicator.style.opacity = '1';
    }, 100);
    
    setTimeout(() => {
        indicator.style.opacity = '0';
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 300);
    }, 2000);
}

function carregarMatrizNomeada() {
    const todas = JSON.parse(localStorage.getItem('matrizesSalvas')) || {};
    const nomes = Object.keys(todas);

    if (nomes.length === 0) {
        showError('⚠️ Nenhuma matriz salva disponível.');
        return;
    }

    const listaFormatada = nomes.map(nome => {
        const matriz = todas[nome];
        const dataSalvamento = matriz.lastSaved ? 
            new Date(matriz.lastSaved).toLocaleString('pt-BR') : 
            'Data não disponível';
        return `${nome} (Salvo em: ${dataSalvamento})`;
    });

    const nomeEscolhido = prompt("Escolha uma matriz para carregar:\n\n" + listaFormatada.join('\n\n'));
    
    if (!nomeEscolhido) return;
    
    const nomeMatriz = nomeEscolhido.split(' (Salvo em:')[0];
    
    if (!todas[nomeMatriz]) {
        showError('❌ Matriz não encontrada.');
        return;
    }

    const data = todas[nomeMatriz];

    document.getElementById('problemTitle').value = data.problemTitle || '';
    document.getElementById('problemDescription').value = data.problemDescription || '';
    criteria = data.criteria || [];
    alternatives = data.alternatives || [];
    weights = data.weights || {};
    scores = data.scores || {};
    comparisonData = data.comparisonData || {};

    updateCriteriaList();
    updateAlternativesList();
    showSuccess(`✅ Matriz "${nomeMatriz}" carregada com sucesso!`);
}

function excluirMatriz() {
    const todas = JSON.parse(localStorage.getItem('matrizesSalvas')) || {};
    const nomes = Object.keys(todas);

    if (nomes.length === 0) {
        showError('⚠️ Nenhuma matriz salva.');
        return;
    }

    const nome = prompt("Digite o nome da matriz que deseja excluir:\n\n" + nomes.join('\n'));
    if (!nome || !todas[nome]) {
        showError('❌ Matriz não encontrada.');
        return;
    }

    delete todas[nome];
    localStorage.setItem('matrizesSalvas', JSON.stringify(todas));
    showSuccess(`🗑️ Matriz "${nome}" excluída.`);
}