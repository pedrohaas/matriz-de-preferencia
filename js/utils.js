// Funções de utilidade — exibição de mensagens

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

/**
 * Mostra uma mensagem informativa como toast.
 */
function showInfo(message) {
    _showToast(message, 'info', 4000);
}

function _showToast(message, type, duration) {
    // Remove toast anterior do mesmo tipo
    document.querySelectorAll(`.toast-notification.toast-${type}`).forEach(el => el.remove());

    const icons = { error: '⛔', success: '✅', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-text">${message}</span>`;

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