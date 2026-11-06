// Preferências de exibição deste navegador. Aplicadas antes da primeira pintura,
// para a página não piscar ao abrir com o painel oculto ou o modo de apresentação ativo.

const PREFERENCES_KEY = 'mp.preferencias';
// Abaixo desta largura, o painel da matriz vira uma gaveta e começa fechado
const MATRIX_PANEL_DOCK_QUERY = '(min-width: 1180px)';
// A partir desta área, a tela inicial cabe inteira na janela, sem rolar a página
const HOME_FIT_QUERY = '(min-width: 760px) and (min-height: 600px)';

function readPreferences() {
    try {
        return JSON.parse(localStorage.getItem(PREFERENCES_KEY)) || {};
    } catch (error) {
        return {};
    }
}

function writePreference(key, value) {
    try {
        const preferences = readPreferences();
        preferences[key] = value;
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
        // Sem armazenamento, a preferência vale só até recarregar a página
    }
}

function isMatrixPanelVisible() {
    const choice = readPreferences().matriz;
    if (typeof choice === 'boolean') return choice;
    return window.matchMedia(MATRIX_PANEL_DOCK_QUERY).matches;
}

function applyDisplayPreferences() {
    const root = document.documentElement;
    root.classList.toggle('matrix-panel-off', !isMatrixPanelVisible());
    root.classList.toggle('presentation-mode', readPreferences().apresentacao === true);
    root.classList.toggle('stepper-collapsed', readPreferences().passosRecolhidos === true);
}

applyDisplayPreferences();
