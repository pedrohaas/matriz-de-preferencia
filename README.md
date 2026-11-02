# 🎯 Matriz de Preferência

![Licença](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-concluído-green.svg)

Este projeto tem como objetivo desenvolver uma **ferramenta web interativa** para **análise de decisões multicritério**, guiando o usuário em um processo estruturado para inserir um problema, definir critérios e alternativas, avaliar desempenhos e escolher o melhor método de ponderação. Os resultados finais são exibidos através de um ranking dinâmico com matrizes completas.

**[➡️ Acessar a Demonstração](https://matriz-de-preferencia.vercel.app/)**

---

## 📚 Tabela de Conteúdo

- [Objetivo do Projeto](#-objetivo-do-projeto)
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Métodos de Ponderação](#-métodos-de-ponderação)
- [Sugestões com IA (Gemini)](#-sugestões-com-ia-gemini)
- [Tecnologias Utilizadas](#️-tecnologias-utilizadas)
- [Organização do Projeto](#-organização-do-projeto)
- [Como Executar Localmente](#️-como-executar-localmente)
- [Licença](#-licença)
- [Autores](#-autores)

---

## 📌 Objetivo do Projeto

A **Matriz de Preferência** busca facilitar a tomada de decisões complexas. O sistema é baseado em métodos consagrados de apoio à decisão multicritério e foi desenhado para ser utilizado em contextos acadêmicos, empresariais ou até mesmo em decisões pessoais (ex: escolha de software, compra de imóveis, seleção de candidatos, etc).

Através de uma interface passo a passo, o usuário divide o problema em partes menores, reduzindo o viés cognitivo e garantindo maior transparência e consistência matemática na escolha final.

---

## 🧩 Funcionalidades Principais

- **Wizard Passo a Passo**: Processo guiado estruturado em passos claros (Apresentação, Critérios, Alternativas, Scores, Pesos e Resultado).
- **Avaliação de Desempenho Visual (Scores)**: Sistema inteligente que solicita a definição da melhor alternativa (âncora superior), da pior alternativa (âncora inferior) e o posicionamento das demais em relação a elas.
- **Ajuste Dinâmico de Pesos**: Na tela de resultados, é possível utilizar _sliders_ interativos para alterar o peso dos critérios em tempo real e visualizar imediatamente como isso afeta o ranking, com suporte opcional a **Normalização Automática**.
- **Gráfico de Contribuição**: Mostra quanto cada critério soma à nota final de cada alternativa, ajudando a explicar por que uma venceu.
- **Comparação de Cenários**: Salva conjuntos de pesos, como "foco em custo" e "foco em prazo", e compara os rankings lado a lado.
- **Alternativas Dominadas**: O resultado aponta alternativas que nenhuma combinação de pesos pode colocar à frente de outra.
- **Análise de Sensibilidade**: Mostra, para cada critério, a partir de qual peso a alternativa vencedora muda e qual passa à frente, variando um peso por vez.
- **Salvamento Automático**: Cada alteração é salva no `localStorage` do navegador. A seção "Análises salvas", na tela inicial, permite retomar uma análise de onde parou ou excluí-la.
- **Exportação de Resultados**:
  - Gerar um **relatório em PDF** pela impressão do navegador, com o texto selecionável e paginação própria.
  - Salvar o relatório completo (matriz e ranking) como **Imagem (PNG)**.
  - Exportar os dados da decisão para **JSON**, que pode ser **importado** de volta, inclusive em outro navegador. Os ajustes feitos nos sliders não são importados: os pesos são recalculados pelo método.
- **Acessível e Responsiva**: Funciona por teclado, com rótulos para leitores de tela, e se adapta a telas de celular.
- **Sugestões Inteligentes com IA**: Integração direta com a API do Google Gemini para sugerir critérios relevantes com base no título e na descrição do problema de decisão.

---

## ⚖️ Métodos de Ponderação

A ferramenta suporta múltiplos métodos para definição do grau de importância dos critérios:

1. **Rank-Sum**: O usuário apenas ordena os critérios por grau de importância (do 1º ao último). Os pesos exatos são calculados matematicamente com base nessa ordenação posicional.
2. **Swing Weighting (Recomendado)**: Um método mais rigoroso onde o usuário analisa uma alternativa hipotética que apresenta o pior cenário possível em todos os critérios. O usuário escolhe qual critério, ao ser melhorado para o nível máximo, traria o maior benefício. Esse critério recebe peso 100, e as melhorias dos demais critérios são comparadas proporcionalmente a este impacto máximo. Ao final, os valores são normalizados.

---

## 🤖 Sugestões com IA (Gemini)

Para ajudar a superar a "síndrome da página em branco" durante a definição dos critérios, a ferramenta oferece uma IA como co-piloto.

**Como utilizar:**
1. Expanda a aba **"🤖 Configuração da IA"** no topo da página inicial.
2. Insira sua chave de acesso gratuita da API do **Google Gemini** (que pode ser gerada no [Google AI Studio](https://aistudio.google.com/app/apikey)).
3. Preencha a descrição do problema e clique para avançar. O sistema consumirá a API e apresentará uma lista de critérios sugeridos que você pode optar por adicionar automaticamente.

*Nota: Sua chave da API é salva exclusivamente de forma local no seu navegador via `localStorage` e é enviada diretamente aos servidores do Google, garantindo sua privacidade.*

---

## 🛠️ Tecnologias Utilizadas

- **Frontend Core**: HTML5, CSS3, e JavaScript Vanilla moderno (sem frameworks como React ou Angular, garantindo alta performance e simplicidade).
- **Bibliotecas**: `html2canvas` 1.4.1, incluída em `libs/` para funcionar sem depender de CDN (conversão da árvore DOM em imagens PNG).
- **Integrações em Nuvem**: REST API do Google Gemini (acesso direto assíncrono).
- **Arquitetura**: Sistema modular, com scripts divididos por responsabilidades e domínios.

---

## 📂 Organização do Projeto

```text
matriz-de-preferencia/
│
├── index.html           # Página principal com a estrutura SPA
├── style.css            # Folha de estilos e variáveis do design system
│
├── js/                  # Scripts e lógicas modulares
│   ├── canonical-site.js   # Redireciona o endereço antigo para o site oficial
│   ├── main.js             # Inicialização, eventos gerais e state reset
│   ├── utils.js            # Escape de texto, delegação de eventos e notificações Toast
│   ├── state.js            # Objeto único com o estado da análise
│   ├── decision-core.js    # Regras de cálculo, sem acesso ao DOM
│   ├── data-input.js       # Gestão do array de critérios e alternativas
│   ├── comparison.js       # Lógica do assistente de definição de scores (âncoras)
│   ├── swing-weighting.js  # Formulários de pesagem (Rank-Sum, Swing)
│   ├── decision-logic.js   # Controle de fluxo, validações e cálculo dos resultados
│   ├── ai-suggestions.js   # Comunicação via Fetch com o Google Gemini
│   ├── report.js           # Gráfico de contribuição, cenários e relatório
│   ├── auto-save.js        # Salvamento automático e análises salvas (localStorage)
│   └── export-utils.js     # Exportação (JSON e imagem) e importação de JSON
│
├── tests/               # Testes de regressão executados em navegador real
│   ├── regression.html     # Cenários, que dirigem o index.html por um iframe
│   └── run.py              # Executa os cenários em navegador headless
│
└── libs/                # Dependências locais
    └── html2canvas.min.js
```

---

## ▶️ Como Executar Localmente

Como o projeto possui uma arquitetura 100% *client-side* (estática), nenhuma instalação, compilador de build ou servidor complexo são necessários.

1. Clone o repositório em sua máquina local:
   ```bash
   git clone https://github.com/pedrohaas/matriz-de-preferencia.git
   cd matriz-de-preferencia
   ```
2. Abra o arquivo `index.html` em qualquer navegador web moderno (duplo clique no arquivo já será suficiente).

---

## 🧪 Testes

Os testes de regressão não têm dependências além de Python 3 e de um navegador:

```bash
python3 tests/run.py                   # Firefox
python3 tests/run.py --browser chrome  # Chrome
```

Os dois navegadores também rodam automaticamente em cada pull request, pelo GitHub Actions.

Também é possível vê-los no navegador: rode `python3 -m http.server` na raiz do projeto e abra `http://localhost:8000/tests/regression.html`.

---

## 📜 Licença

Este projeto está licenciado sob a Licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes de permissões e uso.

---

## 👥 Autores

- **Pedro Henrique Alves de Araujo Silva** - [LinkedIn](https://www.linkedin.com/in/opedroalves/)
- **Laura Rieko Marçal Imai** - [LinkedIn](https://www.linkedin.com/in/laura-rieko-imai/)
