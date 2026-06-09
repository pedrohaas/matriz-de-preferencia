# 🎯 Matriz de Decisão Automatizada

![Licença](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-concluído-green.svg)


Este projeto tem como objetivo desenvolver uma **ferramenta web interativa** para **análise de decisões multicritério**, permitindo ao usuário inserir um problema de decisão, definir critérios e alternativas, escolher métodos de ponderação e visualizar os resultados finais automaticamente.

**[➡️ Acessar a Demonstração](https://lauraimai.github.io/Decision-Matrix/)**


---

## 📚 Tabela de Conteúdo

- [Objetivo do Projeto](#-objetivo-do-projeto)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias Utilizadas](#️-tecnologias-utilizadas)
- [Organização do Projeto](#-organização-do-projeto)
- [Como Executar Localmente](#️-como-executar-localmente)
- [Licença](#licença)
- [Autores](#autores)

---

## 📌 Objetivo do Projeto

A **Matriz de Decisão Automatizada** busca facilitar a tomada de decisões complexas ao guiar o usuário em um processo estruturado, com etapas claras e intuitivas. O sistema é baseado em métodos consagrados de apoio à decisão e pode ser utilizado em contextos acadêmicos, empresariais ou pessoais.

---

## 🧩 Funcionalidades

- Definição de problemas de decisão personalizados
- Cadastro de critérios e alternativas
- Métodos de ponderação:
  - Ad-hoc
  - Rank Sum
  - ROC (Rank Order Centroid)
  - Swing
  - Swing Weighting
- Avaliação comparativa de alternativas
- Exibição automática do ranking final
- Salvamento automático das escolhas
- Sugestões com IA para auxiliar nas definições
- Exportação visual da matriz final (via `html2canvas`)

---

## 🛠️ Tecnologias Utilizadas

- **HTML5**
- **CSS3**
- **JavaScript Vanilla**
- **html2canvas.js**
- **Arquitetura modular JS (com múltiplos arquivos separados por responsabilidade)**

---

## 📂 Organização do Projeto
```
Decision-Matrix/ # Diretório principal do projeto
│
├── index.html # Página principal da aplicação
├── style.css # Estilos da interface
│
├── js/ # Scripts principais
│ ├── main.js # Script principal que inicializa a aplicação
│ ├── utils.js # Gerencia o fluxo de dados
│ ├── auto-save.js # Gerencia o salvamento automático dos dados
│ ├── ai-suggestions.js # Gerencia as sugestões de IA
│ ├── data-input.js # Gerencia a entrada de dados do usuário
│ ├── swing-weighting.js # Métodos de ponderação 
│ ├── comparison.js # Comparação de alternativas
│ ├── decision-logic.js # Lógica de decisão
│ └── export-utils.js # Exportação visual da matriz final
│
├── libs/ # Bibliotecas externas
│ └── html2canvas.min.js # Biblioteca para exportação visual
```
---

## ▶️ Como Executar Localmente

1. **Clone o repositório**
   ```bash
   git clone https://github.com/LauraImai/Decision-Matrix.git
   cd Decision-Matrix
   ```

2. **Abra o arquivo index.html em seu navegador (basta dar duplo clique).**

   Nenhum servidor ou dependência é necessária. O projeto é 100% front-end.

3. **Configure sua Chave de API do Gemini**
    - Gere sua chave de API gratuita no [Google AI Studio](https://aistudio.google.com/app/apikey).
    - Configure-a como uma variável de ambiente. **Não cole a chave diretamente no código.**
      - No Windows (Prompt de Comando):
        ```sh
        setx GOOGLE_API_KEY "SUA_CHAVE_DE_API_AQUI"
        ```
        (Lembre-se de fechar e reabrir o terminal após executar este comando).
      - No macOS/Linux:
        ```sh
        export GOOGLE_API_KEY="SUA_CHAVE_DE_API_AQUI"
        ```
     
---

## Licença

Este projeto está licenciado sob a Licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## Autores

- **Pedro Henrique Alves de Araujo Silva** - [LinkedIn](https://www.linkedin.com/in/opedroalves/)
- **Laura Rieko Marçal Imai** - [LinkedIn](https://www.linkedin.com/in/laura-rieko-imai/)
