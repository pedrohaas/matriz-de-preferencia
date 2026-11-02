// O site oficial é a Vercel. O endereço antigo redireciona para lá, levando as análises
// salvas, que o navegador guarda separadamente por domínio. A chave de API não é enviada.

const CANONICAL_SITE = 'https://matriz-de-preferencia.vercel.app/';
const LEGACY_SITE_HOSTNAME = 'pedrohaas.github.io';
const MIGRATION_HASH_PREFIX = '#migrar=';
const MIGRATION_DONE_KEY = 'analisesMigradasParaVercel';
const MAX_MIGRATION_URL_LENGTH = 1000000;

function redirectToCanonicalSite(location, storage) {
    if (location.hostname !== LEGACY_SITE_HOSTNAME) return;

    let target = CANONICAL_SITE;
    try {
        const analyses = storage.getItem('analisesSalvas');
        const legacy = storage.getItem('matrizesSalvas');
        if ((analyses || legacy) && !storage.getItem(MIGRATION_DONE_KEY)) {
            const url = CANONICAL_SITE + MIGRATION_HASH_PREFIX + encodeURIComponent(JSON.stringify({ analyses, legacy }));
            if (url.length <= MAX_MIGRATION_URL_LENGTH) {
                target = url;
                storage.setItem(MIGRATION_DONE_KEY, '1');
            }
        }
    } catch (error) {
        // Sem acesso ao armazenamento, apenas redireciona
    }
    location.replace(target);
}

redirectToCanonicalSite(window.location, window.localStorage);
