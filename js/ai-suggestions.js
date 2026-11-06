function salvarChaveAPI() {
    const apiKey = document.getElementById('apiKey').value.trim();
    
    if (!apiKey) {
        atualizarStatusAPI('error', 'Insira uma chave da API.');
        return;
    }
    
    // Validação básica do formato da chave (removida verificação de 'AIza' pois o Google pode mudar o prefixo)
    if (apiKey.length < 20) {
        atualizarStatusAPI('error', 'Formato de chave inválido.');
        return;
    }
    
    // Salvar no localStorage
    localStorage.setItem('gemini_api_key', apiKey);
    
    atualizarStatusAPI('success', 'Chave da API salva.');
    
    // Limpar o campo por segurança
    document.getElementById('apiKey').value = '';
}

function limparAPI() {
    localStorage.removeItem('gemini_api_key');
    document.getElementById('apiKey').value = '';
    atualizarStatusAPI('warning', 'Nenhuma chave configurada. As sugestões de critérios por IA estão desligadas.');
}

function atualizarStatusAPI(tipo, mensagem) {
    const statusDiv = document.getElementById('apiStatus');
    
    // Remover classes anteriores
    statusDiv.classList.remove('success', 'error', 'warning');
    
    // Aplicar novo status
    statusDiv.classList.add(tipo);
    statusDiv.textContent = mensagem;
}

// Carregar chave salva ao inicializar
document.addEventListener('DOMContentLoaded', function() {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        atualizarStatusAPI('success', 'Chave da API configurada.');
    }
});

// Função para obter a chave da API
function getApiKey() {
    return localStorage.getItem('gemini_api_key');
}

async function sugerirCritériosGemini(titulo, descricao) {
    
    const API_KEY = getApiKey();
    
    if (!API_KEY) {
        throw new Error('Chave da API não configurada. Configure sua chave da API do Gemini.');
    }
    
    const prompt = `Dado o seguinte problema de decisão:
Título: "${titulo}"
Descrição: "${descricao}"

Sugira obrigatoriamente um mínimo de 2 e no máximo 5 critérios relevantes para avaliar as alternativas deste problema de decisão. 
Responda APENAS com uma lista separada por vírgulas, sem explicações ou formatação adicional.

Exemplo de resposta: Custo, Qualidade, Prazo, Localização, Facilidade de implementação`;

    try {
        
        // Usando a API do Gemini via fetch baseando-se na documentação oficial mais recente
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': API_KEY
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 200,
                    topP: 0.8,
                    topK: 10
                }
            })
        });

        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro na resposta:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            console.error('Estrutura de resposta inválida:', data);
            throw new Error('a IA não retornou uma lista de critérios.');
        }
        
        
        // Processar o texto para extrair os critérios
        const criterios = parseCriteriaSuggestions(text);
        
        
        return criterios;
        
    } catch (error) {
        console.error("Erro detalhado ao buscar critérios com Gemini:", error);
        
        // Mostrar erro mais específico para o usuário
        if (error.message.includes('404')) {
            showError("Erro 404: Verifique se a URL da API está correta e se a chave da API é válida.");
        } else if (error.message.includes('403')) {
            showError("Erro 403: Chave da API inválida ou sem permissão. Verifique sua chave do Gemini.");
        } else if (error.message.includes('400')) {
            showError("Erro 400: Requisição inválida. Verifique os parâmetros enviados.");
        } else if (error.message.includes('429')) {
            showError("Erro 429: Muitas requisições. Tente novamente em alguns minutos.");
        } else if (error.message.includes('Failed to fetch')) {
            showError("Erro de conexão: Verifique sua conexão com a internet.");
        } else {
            showError("Erro ao buscar sugestões de critérios com IA: " + error.message);
        }
        
        return [];
    }
}
