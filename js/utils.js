// Utilidades de interface: escape de texto, delegação de eventos e mensagens

/** Escapa um texto para uso seguro em HTML, inclusive em valores de atributos. */
function escapeHtml(value) {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value).replace(/[&<>"']/g, char => entities[char]);
}

// Delegação de eventos: o HTML gerado declara data-action (clique), data-change ou
// data-input com o nome de uma ação, e passa dados por data-*, nunca em código inline.
const uiActions = {};

function registerActions(actions) {
    Object.assign(uiActions, actions);
}

function dispatchUiAction(event, attribute) {
    const element = event.target.closest?.(`[data-${attribute}]`);
    if (!element) return;
    const handler = uiActions[element.dataset[attribute]];
    if (!handler) return;
    handler(element);
    scheduleAutoSave();
}

document.addEventListener('click', event => dispatchUiAction(event, 'action'));
document.addEventListener('change', event => dispatchUiAction(event, 'change'));
document.addEventListener('input', event => dispatchUiAction(event, 'input'));
document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || !event.target.dataset?.enter) return;
    event.preventDefault();
    dispatchUiAction(event, 'enter');
});

/**
 * Mostra uma mensagem de erro como toast fixo no topo da tela.
 * Remove automaticamente após 5 segundos.
 */
function showError(message) {
    _showToast(message, 'error', 5000);
}

/**
 * Mostra uma mensagem de sucesso como toast fixo no topo da tela.
 * Remove automaticamente após 3 segundos.
 */
function showSuccess(message) {
    _showToast(message, 'success', 3000);
}

function _showToast(message, type, duration) {
    // Remove toast anterior do mesmo tipo
    document.querySelectorAll(`.toast-notification.toast-${type}`).forEach(el => el.remove());

    const icons = { error: '⛔', success: '✅' };
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.textContent = icons[type];

    const text = document.createElement('span');
    text.className = 'toast-text';
    text.textContent = message;

    toast.append(icon, text);
    document.body.appendChild(toast);

    // Slide in
    requestAnimationFrame(() => {
        toast.classList.add('toast-visible');
    });

    // Auto-remove
    setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => toast.remove(), 400);
    }, duration);
}
