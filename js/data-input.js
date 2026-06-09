// Gerenciamento de critérios
function addCriterion() {
    const input = document.getElementById('criterionInput');
    const value = input.value.trim();
    
    if (!value) {
        showError('Digite o nome do critério.');
        return;
    }
    
    if (criteria.includes(value)) {
        showError('Este critério já foi adicionado.');
        return;
    }
    
    criteria.push(value);
    input.value = '';
    updateCriteriaList();
    showSuccess('Critério adicionado com sucesso!');
}

function removeCriterion(index) {
    criteria.splice(index, 1);
    updateCriteriaList();
}

function updateCriteriaList() {
    const list = document.getElementById('criteriaList');
    
    if (criteria.length === 0) {
        list.innerHTML = '<p style="color: #64748b; text-align: center;">Nenhum critério adicionado ainda</p>';
        return;
    }
    
    let html = '';
    criteria.forEach((criterion, index) => {
        html += `
            <div class="item">
                <span><strong>${index + 1}.</strong> ${criterion}</span>
                <button class="remove-btn" onclick="removeCriterion(${index})">Remover</button>
            </div>
        `;
    });
    
    list.innerHTML = html;
}

// Função para adicionar critérios da IA (compatível com o sistema existente)
function addCriteriaFromAI(aiCriteria) {
    let addedCount = 0;
    
    aiCriteria.forEach(criterio => {
        const cleanCriterio = criterio.trim();
        if (cleanCriterio && !criteria.includes(cleanCriterio)) {
            criteria.push(cleanCriterio);
            addedCount++;
        }
    });
    
    updateCriteriaList();
    
    if (addedCount > 0) {
        showSuccess(`${addedCount} critério(s) da IA adicionado(s) com sucesso!`);
    }
    
    return addedCount;
}


// Gerenciamento de alternativas
function addAlternative() {
    const input = document.getElementById('alternativeInput');
    const value = input.value.trim();
    
    if (!value) {
        showError('Digite o nome da alternativa.');
        return;
    }
    
    if (alternatives.includes(value)) {
        showError('Esta alternativa já foi adicionada.');
        return;
    }
    
    alternatives.push(value);
    input.value = '';
    updateAlternativesList();
    showSuccess('Alternativa adicionada com sucesso!');
}

function removeAlternative(index) {
    alternatives.splice(index, 1);
    updateAlternativesList();
}

function updateAlternativesList() {
    const list = document.getElementById('alternativesList');
    
    if (alternatives.length === 0) {
        list.innerHTML = '<p style="color: #64748b; text-align: center;">Nenhuma alternativa adicionada ainda</p>';
        return;
    }
    
    let html = '';
    alternatives.forEach((alternative, index) => {
        html += `
            <div class="item">
                <span><strong>${index + 1}.</strong> ${alternative}</span>
                <button class="remove-btn" onclick="removeAlternative(${index})">Remover</button>
            </div>
        `;
    });
    
    list.innerHTML = html;
}
