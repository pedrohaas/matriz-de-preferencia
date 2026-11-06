// Exemplos fictícios, abertos pela tela inicial. Cada abertura cria uma cópia da análise.
const EXAMPLES = [
 {
  "id": "1-swing-escolha-de-fornecedor",
  "dados": {
   "versao": 1,
   "problema": "Escolha de fornecedor",
   "descricao": "Exemplo com pesos definidos pelo método Swing.",
   "metodo": "Swing (Swing Weighting)",
   "metodoId": "swingweighting",
   "entradas": {
    "posicoes": {},
    "piorCenario": {
     "Custo": "3",
     "Qualidade": "4",
     "Prazo de entrega": "4",
     "Atendimento": "3"
    },
    "maisImportante": "Custo",
    "impactos": {
     "Qualidade": "80",
     "Prazo de entrega": "40",
     "Atendimento": "30"
    }
   },
   "criterios": [
    "Custo",
    "Qualidade",
    "Prazo de entrega",
    "Atendimento"
   ],
   "alternativas": [
    "Fornecedor A",
    "Fornecedor B",
    "Fornecedor C",
    "Fornecedor D"
   ],
   "pesos": {
    "Custo": 0.4,
    "Qualidade": 0.32,
    "Prazo de entrega": 0.16,
    "Atendimento": 0.12
   },
   "resultadosBrutos": {
    "Custo": {
     "best": "Fornecedor A",
     "bestScore": 9,
     "worst": "Fornecedor D",
     "worstScore": 3,
     "scores": {
      "Fornecedor B": 5,
      "Fornecedor C": 7
     }
    },
    "Qualidade": {
     "best": "Fornecedor B",
     "bestScore": 9,
     "worst": "Fornecedor C",
     "worstScore": 4,
     "scores": {
      "Fornecedor A": 6,
      "Fornecedor D": 7
     }
    },
    "Prazo de entrega": {
     "best": "Fornecedor C",
     "bestScore": 10,
     "worst": "Fornecedor A",
     "worstScore": 4,
     "scores": {
      "Fornecedor B": 7,
      "Fornecedor D": 5
     }
    },
    "Atendimento": {
     "best": "Fornecedor D",
     "bestScore": 10,
     "worst": "Fornecedor C",
     "worstScore": 3,
     "scores": {
      "Fornecedor A": 5,
      "Fornecedor B": 8
     }
    }
   },
   "scoresFinais": {
    "Fornecedor A": 6.759999999999999,
    "Fornecedor B": 6.96,
    "Fornecedor C": 6.04,
    "Fornecedor D": 5.44
   },
   "ordenacao": [
    "Fornecedor B",
    "Fornecedor A",
    "Fornecedor C",
    "Fornecedor D"
   ],
   "cenarios": []
  }
 },
 {
  "id": "2-rank-sum-localizacao-de-loja",
  "dados": {
   "versao": 1,
   "problema": "Localização de nova loja",
   "descricao": "Exemplo com pesos definidos pelo método Rank-Sum.",
   "metodo": "Rank-Sum",
   "metodoId": "ranksum",
   "entradas": {
    "posicoes": {
     "Fluxo de pessoas": 1,
     "Custo do aluguel": 2,
     "Acesso e estacionamento": 3,
     "Concorrência próxima": 4
    },
    "piorCenario": {},
    "maisImportante": "",
    "impactos": {}
   },
   "criterios": [
    "Fluxo de pessoas",
    "Custo do aluguel",
    "Acesso e estacionamento",
    "Concorrência próxima"
   ],
   "alternativas": [
    "Centro",
    "Shopping",
    "Bairro residencial",
    "Avenida comercial"
   ],
   "pesos": {
    "Fluxo de pessoas": 0.4,
    "Custo do aluguel": 0.3,
    "Acesso e estacionamento": 0.2,
    "Concorrência próxima": 0.1
   },
   "resultadosBrutos": {
    "Fluxo de pessoas": {
     "best": "Shopping",
     "bestScore": 10,
     "worst": "Bairro residencial",
     "worstScore": 3,
     "scores": {
      "Centro": 9,
      "Avenida comercial": 7
     }
    },
    "Custo do aluguel": {
     "best": "Bairro residencial",
     "bestScore": 10,
     "worst": "Shopping",
     "worstScore": 1,
     "scores": {
      "Centro": 3,
      "Avenida comercial": 6
     }
    },
    "Acesso e estacionamento": {
     "best": "Shopping",
     "bestScore": 10,
     "worst": "Centro",
     "worstScore": 2,
     "scores": {
      "Bairro residencial": 7,
      "Avenida comercial": 6
     }
    },
    "Concorrência próxima": {
     "best": "Bairro residencial",
     "bestScore": 10,
     "worst": "Shopping",
     "worstScore": 2,
     "scores": {
      "Centro": 3,
      "Avenida comercial": 6
     }
    }
   },
   "scoresFinais": {
    "Centro": 5.2,
    "Shopping": 6.5,
    "Bairro residencial": 6.6000000000000005,
    "Avenida comercial": 6.4
   },
   "ordenacao": [
    "Bairro residencial",
    "Shopping",
    "Avenida comercial",
    "Centro"
   ],
   "cenarios": []
  }
 },
 {
  "id": "3-cenarios-selecao-de-projeto",
  "dados": {
   "versao": 1,
   "problema": "Seleção de projeto para investimento",
   "descricao": "Exemplo em que a alternativa vencedora muda conforme a prioridade adotada em cada cenário.",
   "metodo": "Swing (Swing Weighting)",
   "metodoId": "swingweighting",
   "entradas": {
    "posicoes": {},
    "piorCenario": {
     "Retorno esperado": "3",
     "Baixo risco": "3",
     "Alinhamento estratégico": "4",
     "Rapidez de execução": "2"
    },
    "maisImportante": "Retorno esperado",
    "impactos": {
     "Baixo risco": "70",
     "Alinhamento estratégico": "80",
     "Rapidez de execução": "30"
    }
   },
   "criterios": [
    "Retorno esperado",
    "Baixo risco",
    "Alinhamento estratégico",
    "Rapidez de execução"
   ],
   "alternativas": [
    "Projeto Alfa",
    "Projeto Beta",
    "Projeto Gama",
    "Projeto Delta"
   ],
   "pesos": {
    "Retorno esperado": 0.35714285714285715,
    "Baixo risco": 0.25,
    "Alinhamento estratégico": 0.2857142857142857,
    "Rapidez de execução": 0.10714285714285714
   },
   "resultadosBrutos": {
    "Retorno esperado": {
     "best": "Projeto Alfa",
     "bestScore": 10,
     "worst": "Projeto Delta",
     "worstScore": 3,
     "scores": {
      "Projeto Beta": 5,
      "Projeto Gama": 7
     }
    },
    "Baixo risco": {
     "best": "Projeto Beta",
     "bestScore": 9,
     "worst": "Projeto Alfa",
     "worstScore": 3,
     "scores": {
      "Projeto Gama": 5,
      "Projeto Delta": 7
     }
    },
    "Alinhamento estratégico": {
     "best": "Projeto Gama",
     "bestScore": 10,
     "worst": "Projeto Delta",
     "worstScore": 4,
     "scores": {
      "Projeto Alfa": 6,
      "Projeto Beta": 7
     }
    },
    "Rapidez de execução": {
     "best": "Projeto Delta",
     "bestScore": 10,
     "worst": "Projeto Gama",
     "worstScore": 2,
     "scores": {
      "Projeto Alfa": 4,
      "Projeto Beta": 6
     }
    }
   },
   "scoresFinais": {
    "Projeto Alfa": 6.464285714285714,
    "Projeto Beta": 6.678571428571429,
    "Projeto Gama": 6.821428571428571,
    "Projeto Delta": 5.035714285714286
   },
   "ordenacao": [
    "Projeto Gama",
    "Projeto Beta",
    "Projeto Alfa",
    "Projeto Delta"
   ],
   "cenarios": [
    {
     "nome": "Foco em retorno",
     "pesos": {
      "Retorno esperado": 0.7,
      "Baixo risco": 0.1,
      "Alinhamento estratégico": 0.1,
      "Rapidez de execução": 0.1
     }
    },
    {
     "nome": "Foco em segurança",
     "pesos": {
      "Retorno esperado": 0.1,
      "Baixo risco": 0.7,
      "Alinhamento estratégico": 0.1,
      "Rapidez de execução": 0.1
     }
    },
    {
     "nome": "Foco em rapidez",
     "pesos": {
      "Retorno esperado": 0.1,
      "Baixo risco": 0.1,
      "Alinhamento estratégico": 0.1,
      "Rapidez de execução": 0.7
     }
    }
   ]
  }
 },
 {
  "id": "4-alternativa-dominada-software",
  "dados": {
   "versao": 1,
   "problema": "Escolha de software de gestão",
   "descricao": "Exemplo com uma alternativa dominada: outra é pelo menos tão boa em todos os critérios e melhor em algum.",
   "metodo": "Rank-Sum",
   "metodoId": "ranksum",
   "entradas": {
    "posicoes": {
     "Facilidade de uso": 1,
     "Funcionalidades": 2,
     "Custo-benefício": 3
    },
    "piorCenario": {},
    "maisImportante": "",
    "impactos": {}
   },
   "criterios": [
    "Facilidade de uso",
    "Funcionalidades",
    "Custo-benefício"
   ],
   "alternativas": [
    "Sistema A",
    "Sistema B",
    "Sistema C"
   ],
   "pesos": {
    "Facilidade de uso": 0.5,
    "Funcionalidades": 0.3333333333333333,
    "Custo-benefício": 0.16666666666666666
   },
   "resultadosBrutos": {
    "Facilidade de uso": {
     "best": "Sistema A",
     "bestScore": 9,
     "worst": "Sistema B",
     "worstScore": 4,
     "scores": {
      "Sistema C": 6
     }
    },
    "Funcionalidades": {
     "best": "Sistema C",
     "bestScore": 9,
     "worst": "Sistema B",
     "worstScore": 5,
     "scores": {
      "Sistema A": 7
     }
    },
    "Custo-benefício": {
     "best": "Sistema C",
     "bestScore": 8,
     "worst": "Sistema B",
     "worstScore": 3,
     "scores": {
      "Sistema A": 6
     }
    }
   },
   "scoresFinais": {
    "Sistema A": 7.833333333333333,
    "Sistema B": 4.166666666666666,
    "Sistema C": 7.333333333333333
   },
   "ordenacao": [
    "Sistema A",
    "Sistema C",
    "Sistema B"
   ],
   "cenarios": []
  }
 },
 {
  "id": "5-empate-plano-de-saude",
  "dados": {
   "versao": 1,
   "problema": "Escolha de plano de saúde",
   "descricao": "Exemplo com empate no 1º lugar, para discutir como desempatar a decisão.",
   "metodo": "Rank-Sum",
   "metodoId": "ranksum",
   "entradas": {
    "posicoes": {
     "Cobertura": 1,
     "Mensalidade": 2
    },
    "piorCenario": {},
    "maisImportante": "",
    "impactos": {}
   },
   "criterios": [
    "Cobertura",
    "Mensalidade"
   ],
   "alternativas": [
    "Plano A",
    "Plano B",
    "Plano C"
   ],
   "pesos": {
    "Cobertura": 0.6666666666666666,
    "Mensalidade": 0.3333333333333333
   },
   "resultadosBrutos": {
    "Cobertura": {
     "best": "Plano A",
     "bestScore": 9,
     "worst": "Plano C",
     "worstScore": 6,
     "scores": {
      "Plano B": 8
     }
    },
    "Mensalidade": {
     "best": "Plano C",
     "bestScore": 7,
     "worst": "Plano A",
     "worstScore": 3,
     "scores": {
      "Plano B": 5
     }
    }
   },
   "scoresFinais": {
    "Plano A": 7,
    "Plano B": 7,
    "Plano C": 6.333333333333333
   },
   "ordenacao": [
    "Plano A",
    "Plano B",
    "Plano C"
   ],
   "cenarios": []
  }
 }
];
