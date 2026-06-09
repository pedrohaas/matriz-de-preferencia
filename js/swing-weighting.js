// Configuração da interface de pesagem
function setupWeightingInterface() {
    const method = document.getElementById('weightingMethod').value;
    const interface_ = document.getElementById('weightingInterface');
    
    if (!method) {
        interface_.innerHTML = '';
        return;
    }
    
    let html = '';
    
    switch(method) {
        case 'adhoc':
            html = `
                <div class="form-group">
                    <label>Método Ad-hoc - Atribua pesos diretamente:</label>
                    <p style="color: #64748b; margin: 10px 0;">
                        Atribua pesos de 0 a 100 para cada critério. 
                        <strong>A soma total de todos os pesos deve ser exatamente 100.</strong>
                    </p>
                    <div id="adhoc-sum-display" style="background: #f1f5f9; padding: 10px; border-radius: 5px; margin: 10px 0;">
                        <strong>Soma atual: <span id="current-sum">0</span>/100</strong>
                        <span id="sum-status" style="margin-left: 10px;"></span>
                    </div>
            `;
            criteria.forEach((criterion, index) => {
                html += `
                    <div style="margin: 10px 0;">
                        <label>${criterion}:</label>
                        <input type="number" id="adhoc_${index}" min="0" max="100" step="0.01" 
                               onchange="updateAdhocWeights()" placeholder="0.00 - 100.00">
                    </div>
                `;
            });
            html += '</div>';
            break;
            
        case 'ranksum':
            html = `
                <div class="form-group">
                    <div class="orientation-box" style="margin-bottom: 1rem;">
                        <strong>Método Rank-Sum</strong>
                        Ordene os critérios pela sua importância relativa. O critério mais importante recebe a posição 1, o segundo mais importante a posição 2, e assim por diante. Os pesos são calculados automaticamente usando a fórmula Rank-Sum.
                    </div>
                    <label>Ordene os critérios por importância (1 = mais importante):</label>
            `;
            criteria.forEach((criterion, index) => {
                html += `
                    <div style="margin: 10px 0;">
                        <label>${criterion}:</label>
                        <select id="ranksum_${index}" onchange="updateRankSumWeights()">
                            <option value="">Selecione a posição...</option>
                `;
                for(let i = 1; i <= criteria.length; i++) {
                    html += `<option value="${i}">${i}º posição</option>`;
                }
                html += `
                        </select>
                    </div>
                `;
            });
            html += '</div>';
            break;
            
        case 'swingweighting':
            // Gerar HTML da alternativa hipotética diretamente
            let worstAlternativeHtml = generateWorstAlternativeHtml();
            
            html = `
                <div class="form-group">
                    <div class="orientation-box" style="margin-bottom: 1rem;">
                        <strong>Método Swing (Swing Weighting)</strong>
                        Imagine um cenário em que <em>todos</em> os critérios estão no pior valor possível. Se você pudesse melhorar apenas <em>um</em> critério para o seu melhor valor, qual escolheria? Esse é o critério de maior impacto e recebe 100 pontos. Os demais são comparados relativamente a ele (0–100). Ao final, os pesos são normalizados para somar 100%.
                    </div>
                    
                    <div id="worstAlternativeSummary">${worstAlternativeHtml}</div>
                    
                    <div style="margin: 15px 0;">
                        <label><strong>Passo 2: Qual é o critério mais importante?</strong></label>
                        <p style="color: var(--text-soft); font-size: 13px; margin: 5px 0;">
                            Selecione o critério que causará maior impacto ao ser melhorado do pior cenário para a melhor performance.
                        </p>
                        <select id="mostImportant" onchange="updateSwingWeightingInterface()">
                            <option value="">Selecione o critério de maior impacto...</option>
            `;
            criteria.forEach((criterion, index) => {
                html += `<option value="${index}">${criterion}</option>`;
            });
            html += `
                        </select>
                    </div>
                    <div id="swingWeightingComparisons"></div>
                    <div id="swingWeightingSummary" style="margin-top: 15px;"></div>
                </div>
            `;
            break;
    }
    
    interface_.innerHTML = html;
}

// Funções de atualização de pesos
function updateAdhocWeights() {
    let sum = 0;
    const adhocValues = {};
    
    // Coletar todos os valores dos inputs
    criteria.forEach((criterion, index) => {
        const input = document.getElementById(`adhoc_${index}`);
        const value = parseFloat(input.value) || 0;
        adhocValues[criterion] = value;
        sum += value;
    });
    
    // Atualizar display da soma
    const currentSumElement = document.getElementById('current-sum');
    const statusElement = document.getElementById('sum-status');
    
    if (currentSumElement) {
        currentSumElement.textContent = sum.toFixed(2);
    }
    
    if (statusElement) {
        if (Math.abs(sum - 100) < 0.01) { // Tolerância pequena para decimais
            statusElement.innerHTML = '<span style="color: #22c55e;">✓ Correto!</span>';
            
            // Só atualizar os pesos se a soma estiver correta
            criteria.forEach(criterion => {
                weights[criterion] = adhocValues[criterion] / 100; // Converter para decimal (0-1)
            });
        } else if (sum > 100) {
            statusElement.innerHTML = '<span style="color: #ef4444;">⚠ Soma muito alta</span>';
        } else {
            statusElement.innerHTML = '<span style="color: #f59e0b;">⚠ Soma muito baixa</span>';
        }
    }
}

function updateRankSumWeights() {
    const ranks = {};
    let valid = true;
    
    criteria.forEach((_, index) => {
        const rank = document.getElementById(`ranksum_${index}`).value;
        if (!rank) {
            valid = false;
            return;
        }
        ranks[index] = parseInt(rank);
    });
    
    if (!valid) return;
    
    // Verificar se todos os ranks são únicos
    const rankValues = Object.values(ranks);
    if (new Set(rankValues).size !== rankValues.length) {
        showError('Cada critério deve ter uma posição única.');
        return;
    }
    
    // Calcular pesos usando Rank-Sum: wi = (n - ri + 1) / Σ(n - rj + 1)
    const n = criteria.length;
    let denominator = 0;
    for (let i = 1; i <= n; i++) {
        denominator += (n - i + 1);
    }
    
    criteria.forEach((criterion, index) => {
        const rank = ranks[index];
        weights[criterion] = (n - rank + 1) / denominator;
    });
}

function updateROCWeights() {
    const ranks = {};
    let valid = true;
    
    criteria.forEach((_, index) => {
        const rank = document.getElementById(`roc_${index}`).value;
        if (!rank) {
            valid = false;
            return;
        }
        ranks[index] = parseInt(rank);
    });
    
    if (!valid) return;
    
    // Verificar se todos os ranks são únicos
    const rankValues = Object.values(ranks);
    if (new Set(rankValues).size !== rankValues.length) {
        showError('Cada critério deve ter uma posição única.');
        return;
    }
    
    // Calcular pesos usando ROC: wi = (1/n) * Σ(1/j) para j = ri até n
    const n = criteria.length;
    
    criteria.forEach((criterion, index) => {
        const rank = ranks[index];
        let sum = 0;
        for (let j = rank; j <= n; j++) {
            sum += 1 / j;
        }
        weights[criterion] = sum / n;
    });
}

function updateSwingWeights() {
    let total = 0;
    const swingValues = {};
    let hasMaxValue = false;
    let maxCount = 0;
    
    // Coletar valores e calcular total
    criteria.forEach((criterion, index) => {
        const input = document.getElementById(`swing_${index}`);
        const swing = parseFloat(input.value) || 0;
        swingValues[criterion] = swing;
        total += swing;
        
        if (swing === 100) {
            hasMaxValue = true;
            maxCount++;
        }
    });
    
    // Atualizar display do total
    const totalElement = document.getElementById('swing-total');
    const statusElement = document.getElementById('swing-status');
    
    if (totalElement) {
        totalElement.textContent = total.toFixed(0);
    }
    
    // Validar e mostrar status
    if (statusElement) {
        if (maxCount === 0) {
            statusElement.innerHTML = '<span style="color: #ef4444;">⚠ Nenhum critério com 100 pontos</span>';
        } else if (maxCount > 1) {
            statusElement.innerHTML = '<span style="color: #ef4444;">⚠ Apenas um critério deve ter 100 pontos</span>';
        } else if (total === 0) {
            statusElement.innerHTML = '<span style="color: #f59e0b;">⚠ Atribua pontos aos critérios</span>';
        } else {
            statusElement.innerHTML = '<span style="color: #22c55e;">✓ Configuração válida</span>';
        }
    }
    
    // Calcular e mostrar pesos normalizados apenas se configuração válida
    if (hasMaxValue && maxCount === 1 && total > 0) {
        criteria.forEach((criterion, index) => {
            const normalizedWeight = swingValues[criterion] / total;
            weights[criterion] = normalizedWeight;
            
            // Mostrar peso normalizado ao lado do input
            const weightDisplay = document.getElementById(`swing_weight_${index}`);
            if (weightDisplay) {
                weightDisplay.textContent = `(Peso: ${(normalizedWeight * 100).toFixed(1)}%)`;
            }
        });
    } else {
        // Limpar pesos se configuração inválida
        criteria.forEach((criterion, index) => {
            const weightDisplay = document.getElementById(`swing_weight_${index}`);
            if (weightDisplay) {
                weightDisplay.textContent = '';
            }
        });
    }
}

// Função para criar a interface inicial do Swing Weighting
function initializeSwingWeighting() {
    createWorstHypotheticalAlternative();
    document.getElementById('swingWeightingComparisons').innerHTML = '';
    document.getElementById('swingWeightingSummary').innerHTML = '';
}

// Função para atualizar a interface do Swing Weighting
function updateSwingWeightingInterface() {
    const mostImportantIndex = parseInt(document.getElementById('mostImportant').value);
    if (isNaN(mostImportantIndex)) {
        document.getElementById('swingWeightingComparisons').innerHTML = '';
        document.getElementById('swingWeightingSummary').innerHTML = '';
        return;
    }
    
    // Verificar se a alternativa hipotética foi completamente definida
    if (!isWorstAlternativeComplete()) {
        showError('Complete a definição da alternativa hipotética (Passo 1) antes de prosseguir para o Passo 2.');
        document.getElementById('mostImportant').value = '';
        return;
    }
    
    const mostImportantCriterion = criteria[mostImportantIndex];
    let html = `
        <div style="margin: 15px 0;">
            <h4>Comparações de Impacto (Passos 3-4)</h4>
            <div style="padding: 10px; background: #f0f9ff; border-radius: 5px; margin-bottom: 10px;">
                <strong>${mostImportantCriterion}</strong> = 100 (Critério mais importante - Passo 2)
            </div>
            <p style="color: #64748b; font-size: 12px; margin-bottom: 15px;">
                Para cada critério abaixo, considere o impacto de melhorar da pior para a melhor performance 
                comparado ao mesmo tipo de melhoria no critério mais importante.
            </p>
    `;
    
    criteria.forEach((criterion, index) => {
        if (index !== mostImportantIndex) {
            html += `
                <div style="margin: 10px 0; padding: 10px; border: 1px solid #e5e7eb; border-radius: 5px;">
                    <label><strong>${criterion}</strong></label>
                    <p style="font-size: 12px; color: #6b7280; margin: 5px 0;">
                        Qual o impacto de melhorar "${criterion}" do valor ${getWorstValueForCriterion(criterion)} para a melhor performance, 
                        comparado ao mesmo tipo de melhoria em "${mostImportantCriterion}"?
                    </p>
                    <input type="number" 
                           id="swingweight_${index}" 
                           min="0" 
                           max="100" 
                           step="1"
                           placeholder="0-100"
                           onchange="updateSwingWeightingWeights()"
                           style="width: 80px; padding: 5px;">
                    <span>% do impacto de ${mostImportantCriterion}</span>
                </div>
            `;
        }
    });
    
    html += '</div>';
    document.getElementById('swingWeightingComparisons').innerHTML = html;
    
    // Resetar pesos quando mudar o critério mais importante
    criteria.forEach(criterion => {
        weights[criterion] = 0;
    });
    
    updateSwingWeightingWeights();
}

// Função para gerar HTML da alternativa hipotética
function generateWorstAlternativeHtml() {
    let suggestedValues = {};
    
    // Se existem alternativas, sugerir os piores valores encontrados
    if (alternatives && alternatives.length > 0) {
        criteria.forEach(criterion => {
            let worstValue = null;
            
            alternatives.forEach(alternative => {
                const value = alternative[criterion];
                if (value !== undefined && value !== null && value !== '') {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                        if (worstValue === null || numValue < worstValue) {
                            worstValue = numValue;
                        }
                    }
                }
            });
            
            suggestedValues[criterion] = worstValue;
        });
    }
    
    // Gerar HTML
    let html = `
        <div style="margin: 15px 0; padding: 15px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 5px;">
            <h4>Passo 1: Definir Alternativa Hipotética com Piores Valores</h4>
            <p style="color: #7f1d1d; font-size: 12px; margin-bottom: 15px;">
                Defina os valores que representam o <strong>pior cenário possível</strong> para cada critério. 
                Esta alternativa servirá como base de comparação para estabelecer os pesos.
            </p>
            
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #fee2e2;">
                    <th style="border: 1px solid #fecaca; padding: 8px; text-align: left;">Critério</th>
                    <th style="border: 1px solid #fecaca; padding: 8px; text-align: left;">Valor do Pior Cenário</th>
                    ${alternatives && alternatives.length > 0 ? '<th style="border: 1px solid #fecaca; padding: 8px; text-align: left;">Sugestão</th>' : ''}
                </tr>
    `;
    
    criteria.forEach((criterion, index) => {
        const suggestedValue = suggestedValues[criterion];
        html += `
            <tr>
                <td style="border: 1px solid #fecaca; padding: 8px;">${criterion}</td>
                <td style="border: 1px solid #fecaca; padding: 8px;">
                    <input type="number" 
                           id="worstValue_${index}" 
                           step="any"
                           placeholder="Digite o pior valor"
                           value="${suggestedValue !== null ? suggestedValue : ''}"
                           onchange="validateWorstAlternative()"
                           style="width: 100px; padding: 4px; border: 1px solid #ccc; border-radius: 3px;">
                </td>
                ${suggestedValue !== null ? 
                    `<td style="border: 1px solid #fecaca; padding: 8px; color: #6b7280; font-size: 11px;">
                        Pior encontrado: ${suggestedValue}
                    </td>` : 
                    (alternatives && alternatives.length > 0 ? '<td style="border: 1px solid #fecaca; padding: 8px; color: #6b7280; font-size: 11px;">N/A</td>' : '')
                }
            </tr>
        `;
    });
    
    html += `
            </table>
            <div id="worstAlternativeStatus" style="margin-top: 10px;">
                <div style="padding: 8px; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 3px; color: #92400e;">
                    ⚠ Complete todos os valores antes de prosseguir para o Passo 2.
                </div>
            </div>
        </div>
    `;
    
    return html;
}

// Função para criar a alternativa hipotética com os piores valores (Passo 1)
function createWorstHypotheticalAlternative() {
    let suggestedValues = {};
    
    // Se existem alternativas, sugerir os piores valores encontrados
    if (alternatives && alternatives.length > 0) {
        criteria.forEach(criterion => {
            let worstValue = null;
            
            alternatives.forEach(alternative => {
                const value = alternative[criterion];
                if (value !== undefined && value !== null && value !== '') {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                        if (worstValue === null || numValue < worstValue) {
                            worstValue = numValue;
                        }
                    }
                }
            });
            
            suggestedValues[criterion] = worstValue;
        });
    }
    
    // Criar interface editável para definir a alternativa hipotética
    let html = `
        <div style="margin: 15px 0; padding: 15px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 5px;">
            <h4>Passo 1: Definir Alternativa Hipotética com Piores Valores</h4>
            <p style="color: #7f1d1d; font-size: 12px; margin-bottom: 15px;">
                Defina os valores que representam o <strong>pior cenário possível</strong> para cada critério. 
                Esta alternativa servirá como base de comparação para estabelecer os pesos.
            </p>
            
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #fee2e2;">
                    <th style="border: 1px solid #fecaca; padding: 8px; text-align: left;">Critério</th>
                    <th style="border: 1px solid #fecaca; padding: 8px; text-align: left;">Valor do Pior Cenário</th>
                    ${alternatives && alternatives.length > 0 ? '<th style="border: 1px solid #fecaca; padding: 8px; text-align: left;">Sugestão</th>' : ''}
                </tr>
    `;
    
    criteria.forEach((criterion, index) => {
        const suggestedValue = suggestedValues[criterion];
        html += `
            <tr>
                <td style="border: 1px solid #fecaca; padding: 8px;">${criterion}</td>
                <td style="border: 1px solid #fecaca; padding: 8px;">
                    <input type="number" 
                           id="worstValue_${index}" 
                           step="any"
                           placeholder="Digite o pior valor"
                           value="${suggestedValue !== null ? suggestedValue : ''}"
                           onchange="validateWorstAlternative()"
                           style="width: 100px; padding: 4px; border: 1px solid #ccc; border-radius: 3px;">
                </td>
                ${suggestedValue !== null ? 
                    `<td style="border: 1px solid #fecaca; padding: 8px; color: #6b7280; font-size: 11px;">
                        Pior encontrado: ${suggestedValue}
                    </td>` : 
                    (alternatives && alternatives.length > 0 ? '<td style="border: 1px solid #fecaca; padding: 8px; color: #6b7280; font-size: 11px;">N/A</td>' : '')
                }
            </tr>
        `;
    });
    
    html += `
            </table>
            <div id="worstAlternativeStatus" style="margin-top: 10px;"></div>
        </div>
    `;
    
    document.getElementById('worstAlternativeSummary').innerHTML = html;
    validateWorstAlternative();
}

// Função para validar se a alternativa hipotética está completa
function validateWorstAlternative() {
    let allComplete = true;
    let statusHtml = '';
    
    criteria.forEach((criterion, index) => {
        const input = document.getElementById(`worstValue_${index}`);
        if (!input || input.value.trim() === '' || isNaN(parseFloat(input.value))) {
            allComplete = false;
        }
    });
    
    if (allComplete) {
        statusHtml = `
            <div style="padding: 8px; background: #dcfce7; border: 1px solid #86efac; border-radius: 3px; color: #166534;">
                ✓ Alternativa hipotética completa. Você pode prosseguir para o Passo 2.
            </div>
        `;
    } else {
        statusHtml = `
            <div style="padding: 8px; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 3px; color: #92400e;">
                ⚠ Complete todos os valores antes de prosseguir para o Passo 2.
            </div>
        `;
    }
    
    document.getElementById('worstAlternativeStatus').innerHTML = statusHtml;
    return allComplete;
}

// Função para verificar se a alternativa hipotética está completa
function isWorstAlternativeComplete() {
    let allComplete = true;
    
    criteria.forEach((criterion, index) => {
        const input = document.getElementById(`worstValue_${index}`);
        if (!input || input.value.trim() === '' || isNaN(parseFloat(input.value))) {
            allComplete = false;
        }
    });
    
    return allComplete;
}

// Função para obter o valor do pior cenário para um critério específico
function getWorstValueForCriterion(criterion) {
    const index = criteria.indexOf(criterion);
    if (index === -1) return 'N/A';
    
    const input = document.getElementById(`worstValue_${index}`);
    if (input && input.value.trim() !== '' && !isNaN(parseFloat(input.value))) {
        return parseFloat(input.value);
    }
    
    return 'N/A';
}

// Função para obter os valores da alternativa hipotética
function getWorstAlternativeValues() {
    const worstValues = {};
    
    criteria.forEach((criterion, index) => {
        const input = document.getElementById(`worstValue_${index}`);
        if (input && input.value.trim() !== '' && !isNaN(parseFloat(input.value))) {
            worstValues[criterion] = parseFloat(input.value);
        }
    });
    
    return worstValues;
}

// Função corrigida para calcular pesos do Swing Weighting (Passos 4-5)
function updateSwingWeightingWeights() {
    const mostImportantIndex = parseInt(document.getElementById('mostImportant').value);
    if (isNaN(mostImportantIndex)) return;
    
    const mostImportantCriterion = criteria[mostImportantIndex];
    const rawWeights = {};
    let totalRawWeight = 0;
    let allValid = true;
    
    // Peso do critério mais importante = 100 (Passo 4)
    rawWeights[mostImportantCriterion] = 100;
    totalRawWeight = 100;
    
    // Coletar pesos dos outros critérios
    criteria.forEach((criterion, index) => {
        if (index !== mostImportantIndex) {
            const input = document.getElementById(`swingweight_${index}`);
            const value = input ? parseFloat(input.value) : 0;
            
            if (input && (isNaN(value) || value < 0 || value > 100)) {
                allValid = false;
                return;
            }
            
            rawWeights[criterion] = value || 0;
            totalRawWeight += (value || 0);
        }
    });
    
    if (!allValid || totalRawWeight === 0) {
        // Limpar pesos se inválido
        criteria.forEach(criterion => {
            weights[criterion] = 0;
        });
        updateSwingWeightingSummary(rawWeights, 0);
        return;
    }
    
    // Normalizar os pesos (Passo 5 do método)
    criteria.forEach(criterion => {
        weights[criterion] = rawWeights[criterion] / totalRawWeight;
    });
    
    updateSwingWeightingSummary(rawWeights, totalRawWeight);
}

// Função para mostrar resumo dos pesos
function updateSwingWeightingSummary(rawWeights, totalRawWeight) {
    let html = '<h4>Resumo dos Pesos (Passo 5: Normalização)</h4>';
    html += '<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">';
    html += '<tr style="background: #f8fafc;"><th style="border: 1px solid #ddd; padding: 8px;">Critério</th><th style="border: 1px solid #ddd; padding: 8px;">Peso Bruto</th><th style="border: 1px solid #ddd; padding: 8px;">Peso Normalizado</th></tr>';
    
    criteria.forEach(criterion => {
        const rawWeight = rawWeights[criterion] || 0;
        const normalizedWeight = weights[criterion] || 0;
        
        html += `<tr>
            <td style="border: 1px solid #ddd; padding: 8px;">${criterion}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${rawWeight}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${(normalizedWeight * 100).toFixed(1)}%</td>
        </tr>`;
    });
    
    html += '</table>';
    
    if (totalRawWeight > 0) {
        const totalNormalized = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        html += `<p style="margin-top: 10px; font-weight: bold;">
            Total dos pesos normalizados: ${(totalNormalized * 100).toFixed(1)}%
        </p>`;
        html += `<p style="margin-top: 5px; color: #64748b; font-size: 12px;">
            Passo 6: Utilize estes pesos normalizados para calcular a utilidade total de cada alternativa.
        </p>`;
    }
    
    document.getElementById('swingWeightingSummary').innerHTML = html;
}

function validateWeights() {
    const method = document.getElementById('weightingMethod').value;
    
    if (Object.keys(weights).length !== criteria.length) {
        showError('Complete todas as avaliações de peso dos critérios.');
        return false;
    }
    
    // Validações específicas por método
    switch(method) {
        case 'adhoc':
            let sum = 0;
            let allFilled = true;
            
            criteria.forEach((criterion, index) => {
                const input = document.getElementById(`adhoc_${index}`);
                if (!input || !input.value) {
                    allFilled = false;
                    return;
                }
                sum += parseFloat(input.value);
            });
            
            if (!allFilled) {
                showError('Preencha todos os pesos dos critérios.');
                return false;
            }
            
            if (Math.abs(sum - 100) > 0.01) {
                showError('A soma dos pesos deve ser exatamente 100.');
                return false;
            }
            break;
            

            
        case 'swingweighting':
            // Verificar se a alternativa hipotética foi completamente definida
            if (!isWorstAlternativeComplete()) {
                showError('Complete a definição da alternativa hipotética no Passo 1 antes de prosseguir.');
                return false;
            }
            
            const mostImportant = document.getElementById('mostImportant').value;
            if (!mostImportant) {
                showError('Selecione o critério mais importante para o Swing Weighting (Passo 2).');
                return false;
            }
            
            // Verificar se todos os outros critérios têm pesos atribuídos
            const mostImportantIndex = parseInt(mostImportant);
            let allWeightsValid = true;
            let hasNonZeroWeight = false;
            
            criteria.forEach((criterion, index) => {
                if (index !== mostImportantIndex) {
                    const input = document.getElementById(`swingweight_${index}`);
                    const value = input ? parseFloat(input.value) : NaN;
                    
                    if (!input || isNaN(value) || value < 0 || value > 100) {
                        allWeightsValid = false;
                    } else if (value > 0) {
                        hasNonZeroWeight = true;
                    }
                }
            });
            
            if (!allWeightsValid) {
                showError('Atribua pesos válidos (0-100) para todos os critérios no Swing Weighting (Passo 4).');
                return false;
            }
            
            // Verificar se pelo menos um peso foi definido (além do mais importante que sempre é 100)
            if (!hasNonZeroWeight) {
                showError('Defina pelo menos um peso maior que zero para os outros critérios no Swing Weighting (Passo 4).');
                return false;
            }
            break;    
    }
    
    return true;
}