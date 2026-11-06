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

// Erro mostrado junto ao campo, onde o usuário está olhando, em vez de num aviso no canto
function setFieldError(kind, message) {
    const input = document.getElementById(ITEM_KINDS[kind].inputId);
    const error = document.getElementById(`${ITEM_KINDS[kind].inputId}-error`);
    error.textContent = message;
    if (message) {
        input.setAttribute('aria-invalid', 'true');
    } else {
        input.removeAttribute('aria-invalid');
    }
}

function addItem(kind) {
    const config = ITEM_KINDS[kind];
    const input = document.getElementById(config.inputId);
    const name = input.value.trim();

    if (!name) {
        setFieldError(kind, config.messages.empty);
        input.focus();
        return;
    }
    if (nameExists(kind, name)) {
        setFieldError(kind, config.messages.duplicate);
        input.focus();
        return;
    }

    setFieldError(kind, '');
    config.items().push({ id: createId(config.idPrefix), name });
    input.value = '';
    renderItemList(kind);
    showSuccess(config.messages.added);
    scheduleAutoSave();
}

// Remove marcadores de lista e numeração de linhas coladas ("1. Custo", "- Prazo")
function cleanPastedName(line) {
    return line.trim().replace(/^(?:[-*+•]+\s+|\d+[.)]\s+)/, '').trim();
}

// Colar várias linhas adiciona um item por linha
function addPastedItems(kind, text) {
    const config = ITEM_KINDS[kind];
    const names = text.split(/\r?\n/).map(cleanPastedName).filter(Boolean);
    const added = [];
    const skipped = [];

    names.forEach(name => {
        if (nameExists(kind, name)) {
            skipped.push(name);
        } else {
            config.items().push({ id: createId(config.idPrefix), name });
            added.push(name);
        }
    });

    renderItemList(kind);
    setFieldError(kind, skipped.length ? `Já existiam e não foram repetidos: ${skipped.join(', ')}.` : '');
    if (added.length) {
        showSuccess(`${added.length} ${added.length === 1 ? 'item adicionado' : 'itens adicionados'} a partir da lista colada.`);
        scheduleAutoSave();
    }
    return { added, skipped };
}

function moveItem(kind, id, delta) {
    const items = ITEM_KINDS[kind].items();
    const from = items.findIndex(item => item.id === id);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= items.length) return;

    const [item] = items.splice(from, 1);
    items.splice(to, 0, item);
    renderItemList(kind);
    scheduleAutoSave();

    // O foco acompanha o item movido, para mover várias posições seguidas pelo teclado
    const direction = delta < 0 ? 'up' : 'down';
    const button = document.querySelector(`#${kind}-item-${id} [data-action="moveItem"][data-direction="${direction}"]`);
    (button && !button.disabled ? button : document.querySelector(`#${kind}-item-${id} .item-name-button`))?.focus();
}

function moveItemTo(kind, id, targetId) {
    const items = ITEM_KINDS[kind].items();
    const from = items.findIndex(item => item.id === id);
    const to = items.findIndex(item => item.id === targetId);
    if (from === -1 || to === -1 || from === to) return;
    moveItem(kind, id, to - from);
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
    state.scenarios.forEach(scenario => delete scenario.weights[id]);

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

    const createButton = (className, label, description) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `btn ${className} btn-small`;
        button.innerHTML = label;
        button.setAttribute('aria-label', description);
        return button;
    };
    const saveButton = createButton('btn-primary', icon('check'), 'Salvar nome');
    const cancelButton = createButton('btn-secondary', icon('x'), 'Cancelar edição');

    const confirmEdit = () => {
        const newName = input.value.trim();
        if (!newName) {
            showError(config.messages.emptyName);
            input.focus();
            return;
        }
        if (newName !== item.name && nameExists(kind, newName)) {
            showError(config.messages.duplicateName);
            input.focus();
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
        list.innerHTML = `<p class="empty-state">${config.messages.none}</p>`;
        return;
    }

    list.innerHTML = items.map((item, index) => {
        const name = escapeHtml(item.name);
        const data = `data-kind="${kind}" data-id="${item.id}"`;
        return `
        <div class="item" id="${kind}-item-${item.id}" draggable="true" ${data}>
            <span class="item-handle" title="Arraste para reordenar" aria-hidden="true">${icon('grip-vertical')}</span>
            <span class="item-name-text"><strong>${index + 1}.</strong><button type="button" class="item-name-button" data-action="editItem" ${data} aria-label="Editar ${name}">${name}</button></span>
            <div class="item-actions">
                <button type="button" class="icon-btn" data-action="moveItem" data-direction="up" ${data} aria-label="Mover ${name} para cima" ${index === 0 ? 'disabled' : ''}>${icon('arrow-up')}</button>
                <button type="button" class="icon-btn" data-action="moveItem" data-direction="down" ${data} aria-label="Mover ${name} para baixo" ${index === items.length - 1 ? 'disabled' : ''}>${icon('arrow-down')}</button>
                <button type="button" class="icon-btn edit-btn" data-action="editItem" ${data} aria-label="Editar ${name}">${icon('pencil')}</button>
                <button type="button" class="icon-btn remove-btn" data-action="removeItem" ${data} aria-label="Remover ${name}">${icon('trash-2')}</button>
            </div>
        </div>
    `;
    }).join('');
}

function updateCriteriaList() {
    renderItemList('criterion');
}

function updateAlternativesList() {
    renderItemList('alternative');
}

function removeItemWithUndo(kind, id) {
    const config = ITEM_KINDS[kind];
    const name = config.items().find(item => item.id === id)?.name ?? '';
    const before = JSON.stringify(state);

    (kind === 'criterion' ? removeCriterion : removeAlternative)(id);
    offerUndo(`${kind === 'criterion' ? 'Critério' : 'Alternativa'} "${name}" removid${kind === 'criterion' ? 'o' : 'a'}.`, () => restoreStateSnapshot(before));
}

// Lista: Alt+↑ e Alt+↓ reordenam; arrastar pela alça também
function setupItemListInteractions(kind) {
    const list = document.getElementById(ITEM_KINDS[kind].listId);
    let draggedId = null;

    list.addEventListener('keydown', event => {
        if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
        const item = event.target.closest('.item');
        if (!item) return;
        event.preventDefault();
        moveItem(kind, item.dataset.id, event.key === 'ArrowUp' ? -1 : 1);
    });

    list.addEventListener('dragstart', event => {
        const item = event.target.closest?.('.item');
        if (!item) return;
        draggedId = item.dataset.id;
        item.classList.add('is-dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', draggedId);
    });
    list.addEventListener('dragover', event => {
        const item = event.target.closest?.('.item');
        if (!item || !draggedId) return;
        event.preventDefault();
        list.querySelectorAll('.is-drop-target').forEach(el => el.classList.remove('is-drop-target'));
        if (item.dataset.id !== draggedId) item.classList.add('is-drop-target');
    });
    list.addEventListener('drop', event => {
        const item = event.target.closest?.('.item');
        if (!item || !draggedId) return;
        event.preventDefault();
        moveItemTo(kind, draggedId, item.dataset.id);
    });
    list.addEventListener('dragend', () => {
        draggedId = null;
        list.querySelectorAll('.is-dragging, .is-drop-target').forEach(el => el.classList.remove('is-dragging', 'is-drop-target'));
    });

    const input = document.getElementById(ITEM_KINDS[kind].inputId);
    input.addEventListener('input', () => setFieldError(kind, ''));
    input.addEventListener('paste', event => {
        const text = event.clipboardData?.getData('text') ?? '';
        if (!/\r?\n/.test(text.trim())) return;
        event.preventDefault();
        addPastedItems(kind, text);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupItemListInteractions('criterion');
    setupItemListInteractions('alternative');
});

registerActions({
    editItem: el => startEditingItem(el.dataset.kind, el.dataset.id),
    removeItem: el => removeItemWithUndo(el.dataset.kind, el.dataset.id),
    moveItem: el => moveItem(el.dataset.kind, el.dataset.id, el.dataset.direction === 'up' ? -1 : 1),
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
