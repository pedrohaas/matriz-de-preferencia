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
    scheduleAutoSave();
}

function removeCriterion(index) {
    const removed = criteria[index];
    criteria.splice(index, 1);
    
    // Limpar dados associados ao critério removido
    if (comparisonData && comparisonData[removed]) {
        delete comparisonData[removed];
    }
    if (weights && weights[removed]) {
        delete weights[removed];
    }
    if (scores && scores[removed]) {
        delete scores[removed];
    }
    
    updateCriteriaList();
    scheduleAutoSave();
}

function editCriterion(index) {
    const oldName = criteria[index];
    const listItem = document.getElementById(`criterion-item-${index}`);
    if (!listItem) return;
    
    // Substituir conteúdo por input de edição inline
    const nameSpan = listItem.querySelector('.item-name-text');
    const actionsDiv = listItem.querySelector('.item-actions');
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = oldName;
    input.className = 'edit-inline-input';
    input.style.cssText = 'flex:1; padding:6px 10px; border:2px solid var(--secondary); border-radius:6px; font-size:0.92rem; font-family:inherit; outline:none;';
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary btn-small';
    saveBtn.textContent = '✓';
    saveBtn.style.cssText = 'padding:6px 12px; min-width:auto;';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary btn-small';
    cancelBtn.textContent = '✕';
    cancelBtn.style.cssText = 'padding:6px 12px; min-width:auto;';
    
    const confirmEdit = () => {
        const newName = input.value.trim();
        if (!newName) {
            showError('O nome do critério não pode estar vazio.');
            return;
        }
        if (newName !== oldName && criteria.includes(newName)) {
            showError('Já existe um critério com este nome.');
            return;
        }
        
        // Atualizar o nome no array
        criteria[index] = newName;
        
        // Atualizar chaves em comparisonData
        if (comparisonData && comparisonData[oldName]) {
            comparisonData[newName] = comparisonData[oldName];
            delete comparisonData[oldName];
        }
        
        // Atualizar chaves em weights
        if (weights && weights[oldName] !== undefined) {
            weights[newName] = weights[oldName];
            delete weights[oldName];
        }
        
        // Atualizar chaves em scores
        if (scores && scores[oldName] !== undefined) {
            scores[newName] = scores[oldName];
            delete scores[oldName];
        }
        
        updateCriteriaList();
        showSuccess('Critério renomeado com sucesso!');
        scheduleAutoSave();
    };
    
    saveBtn.onclick = confirmEdit;
    cancelBtn.onclick = () => updateCriteriaList();
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') confirmEdit();
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') updateCriteriaList();
    });
    
    // Substituir conteúdo
    nameSpan.replaceWith(input);
    actionsDiv.innerHTML = '';
    actionsDiv.appendChild(saveBtn);
    actionsDiv.appendChild(cancelBtn);
    
    input.focus();
    input.select();
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
            <div class="item" id="criterion-item-${index}">
                <span class="item-name-text"><strong>${index + 1}.</strong> ${criterion}</span>
                <div class="item-actions" style="display:flex; gap:6px;">
                    <button class="edit-btn" onclick="editCriterion(${index})">✏️ Editar</button>
                    <button class="remove-btn" onclick="removeCriterion(${index})">Remover</button>
                </div>
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
    scheduleAutoSave();
}

function removeAlternative(index) {
    const removed = alternatives[index];
    alternatives.splice(index, 1);
    
    // Limpar dados associados à alternativa removida em todos os critérios
    if (comparisonData) {
        Object.keys(comparisonData).forEach(criterion => {
            const cd = comparisonData[criterion];
            if (!cd) return;
            
            if (cd.best === removed) {
                // A melhor alternativa foi removida — resetar este critério
                comparisonData[criterion] = {};
                return;
            }
            if (cd.worst === removed) {
                // A pior alternativa foi removida — resetar este critério
                comparisonData[criterion] = {};
                return;
            }
            if (cd.scores && cd.scores[removed] !== undefined) {
                delete cd.scores[removed];
            }
        });
    }
    
    updateAlternativesList();
    scheduleAutoSave();
}

function editAlternative(index) {
    const oldName = alternatives[index];
    const listItem = document.getElementById(`alternative-item-${index}`);
    if (!listItem) return;
    
    // Substituir conteúdo por input de edição inline
    const nameSpan = listItem.querySelector('.item-name-text');
    const actionsDiv = listItem.querySelector('.item-actions');
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = oldName;
    input.className = 'edit-inline-input';
    input.style.cssText = 'flex:1; padding:6px 10px; border:2px solid var(--secondary); border-radius:6px; font-size:0.92rem; font-family:inherit; outline:none;';
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary btn-small';
    saveBtn.textContent = '✓';
    saveBtn.style.cssText = 'padding:6px 12px; min-width:auto;';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary btn-small';
    cancelBtn.textContent = '✕';
    cancelBtn.style.cssText = 'padding:6px 12px; min-width:auto;';
    
    const confirmEdit = () => {
        const newName = input.value.trim();
        if (!newName) {
            showError('O nome da alternativa não pode estar vazio.');
            return;
        }
        if (newName !== oldName && alternatives.includes(newName)) {
            showError('Já existe uma alternativa com este nome.');
            return;
        }
        
        // Atualizar o nome no array
        alternatives[index] = newName;
        
        // Atualizar referências em comparisonData
        if (comparisonData) {
            Object.keys(comparisonData).forEach(criterion => {
                const cd = comparisonData[criterion];
                if (!cd) return;
                
                if (cd.best === oldName) cd.best = newName;
                if (cd.worst === oldName) cd.worst = newName;
                
                if (cd.scores && cd.scores[oldName] !== undefined) {
                    cd.scores[newName] = cd.scores[oldName];
                    delete cd.scores[oldName];
                }
            });
        }
        
        updateAlternativesList();
        showSuccess('Alternativa renomeada com sucesso!');
        scheduleAutoSave();
    };
    
    saveBtn.onclick = confirmEdit;
    cancelBtn.onclick = () => updateAlternativesList();
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') confirmEdit();
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') updateAlternativesList();
    });
    
    // Substituir conteúdo
    nameSpan.replaceWith(input);
    actionsDiv.innerHTML = '';
    actionsDiv.appendChild(saveBtn);
    actionsDiv.appendChild(cancelBtn);
    
    input.focus();
    input.select();
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
            <div class="item" id="alternative-item-${index}">
                <span class="item-name-text"><strong>${index + 1}.</strong> ${alternative}</span>
                <div class="item-actions" style="display:flex; gap:6px;">
                    <button class="edit-btn" onclick="editAlternative(${index})">✏️ Editar</button>
                    <button class="remove-btn" onclick="removeAlternative(${index})">Remover</button>
                </div>
            </div>
        `;
    });
    
    list.innerHTML = html;
}
