// Gerenciamento de critérios e alternativas

const ITEM_KINDS = {
    criterion: {
        items: () => state.criteria,
        idPrefix: 'c',
        inputId: 'criterionInput',
        listId: 'criteriaList',
        messages: {
            empty: 'Digite o nome do critério.',
            duplicate: 'Este critério já foi adicionado.',
            added: 'Critério adicionado com sucesso!',
            emptyName: 'O nome do critério não pode estar vazio.',
            duplicateName: 'Já existe um critério com este nome.',
            renamed: 'Critério renomeado com sucesso!',
            none: 'Nenhum critério adicionado ainda',
        },
    },
    alternative: {
        items: () => state.alternatives,
        idPrefix: 'a',
        inputId: 'alternativeInput',
        listId: 'alternativesList',
        messages: {
            empty: 'Digite o nome da alternativa.',
            duplicate: 'Esta alternativa já foi adicionada.',
            added: 'Alternativa adicionada com sucesso!',
            emptyName: 'O nome da alternativa não pode estar vazio.',
            duplicateName: 'Já existe uma alternativa com este nome.',
            renamed: 'Alternativa renomeada com sucesso!',
            none: 'Nenhuma alternativa adicionada ainda',
        },
    },
};

function nameExists(kind, name) {
    return ITEM_KINDS[kind].items().some(item => item.name === name);
}

function addItem(kind) {
    const config = ITEM_KINDS[kind];
    const input = document.getElementById(config.inputId);
    const name = input.value.trim();

    if (!name) {
        showError(config.messages.empty);
        return;
    }
    if (nameExists(kind, name)) {
        showError(config.messages.duplicate);
        return;
    }

    config.items().push({ id: createId(config.idPrefix), name });
    input.value = '';
    renderItemList(kind);
    showSuccess(config.messages.added);
    scheduleAutoSave();
}

function addCriterion() {
    addItem('criterion');
}

function addAlternative() {
    addItem('alternative');
}

function removeCriterion(id) {
    state.criteria = state.criteria.filter(c => c.id !== id);
    delete state.comparisonData[id];
    delete state.weights[id];
    forgetCriterionInputs(id);

    renderItemList('criterion');
    scheduleAutoSave();
}

function removeAlternative(id) {
    state.alternatives = state.alternatives.filter(a => a.id !== id);

    Object.keys(state.comparisonData).forEach(criterionId => {
        const entry = state.comparisonData[criterionId];

        // Sem a melhor ou a pior alternativa, as âncoras do critério deixam de valer
        if (entry.best === id || entry.worst === id) {
            state.comparisonData[criterionId] = {};
            return;
        }
        if (entry.scores) delete entry.scores[id];

        const position = entry.selectedPosition;
        if (position && [position.alternative, position.higher, position.lower].includes(id)) {
            delete entry.selectedPosition;
        }
    });

    renderItemList('alternative');
    scheduleAutoSave();
}

function startEditingItem(kind, id) {
    const config = ITEM_KINDS[kind];
    const item = config.items().find(i => i.id === id);
    const listItem = document.getElementById(`${kind}-item-${id}`);
    if (!item || !listItem) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = item.name;
    input.className = 'edit-inline-input';
    input.setAttribute('aria-label', `Novo nome de ${item.name}`);
    input.style.cssText = 'flex:1; padding:6px 10px; border:2px solid var(--secondary); border-radius:6px; font-size:0.92rem; font-family:inherit; outline:none;';

    const createButton = (className, label, description) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `btn ${className} btn-small`;
        button.textContent = label;
        button.setAttribute('aria-label', description);
        button.style.cssText = 'padding:6px 12px; min-width:auto;';
        return button;
    };
    const saveButton = createButton('btn-primary', '✓', 'Salvar nome');
    const cancelButton = createButton('btn-secondary', '✕', 'Cancelar edição');

    const confirmEdit = () => {
        const newName = input.value.trim();
        if (!newName) {
            showError(config.messages.emptyName);
            return;
        }
        if (newName !== item.name && nameExists(kind, newName)) {
            showError(config.messages.duplicateName);
            return;
        }

        item.name = newName;
        renderItemList(kind);
        showSuccess(config.messages.renamed);
        scheduleAutoSave();
    };

    saveButton.onclick = confirmEdit;
    cancelButton.onclick = () => renderItemList(kind);
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter') confirmEdit();
        if (event.key === 'Escape') renderItemList(kind);
    });

    listItem.querySelector('.item-name-text').replaceWith(input);
    listItem.querySelector('.item-actions').replaceChildren(saveButton, cancelButton);

    input.focus();
    input.select();
}

function renderItemList(kind) {
    const config = ITEM_KINDS[kind];
    const list = document.getElementById(config.listId);
    const items = config.items();

    if (items.length === 0) {
        list.innerHTML = `<p style="color: #64748b; text-align: center;">${config.messages.none}</p>`;
        return;
    }

    list.innerHTML = items.map((item, index) => `
        <div class="item" id="${kind}-item-${item.id}">
            <span class="item-name-text"><strong>${index + 1}.</strong> ${escapeHtml(item.name)}</span>
            <div class="item-actions" style="display:flex; gap:6px;">
                <button class="edit-btn" data-action="editItem" data-kind="${kind}" data-id="${item.id}" aria-label="Editar ${escapeHtml(item.name)}">✏️ Editar</button>
                <button class="remove-btn" data-action="removeItem" data-kind="${kind}" data-id="${item.id}" aria-label="Remover ${escapeHtml(item.name)}">Remover</button>
            </div>
        </div>
    `).join('');
}

function updateCriteriaList() {
    renderItemList('criterion');
}

function updateAlternativesList() {
    renderItemList('alternative');
}

registerActions({
    editItem: el => startEditingItem(el.dataset.kind, el.dataset.id),
    removeItem: el => (el.dataset.kind === 'criterion' ? removeCriterion : removeAlternative)(el.dataset.id),
});

// Adiciona os critérios aceitos das sugestões da IA
function addCriteriaFromAI(suggestions) {
    let addedCount = 0;

    suggestions.forEach(suggestion => {
        const name = suggestion.trim();
        if (name && !nameExists('criterion', name)) {
            state.criteria.push({ id: createId('c'), name });
            addedCount++;
        }
    });

    updateCriteriaList();

    if (addedCount > 0) {
        showSuccess(`${addedCount} critério(s) da IA adicionado(s) com sucesso!`);
        scheduleAutoSave();
    }

    return addedCount;
}
