// Configuração da interface de comparação
function setupComparisonInterface() {
    currentCriterionIndex = 0;
    comparisonData = {};
    
    criteria.forEach(criterion => {
        comparisonData[criterion] = {};
    });
    
    showComparisonForCriterion();
}

function showComparisonForCriterion() {
    const interface_ = document.getElementById('comparisonInterface');
    const criterion = criteria[currentCriterionIndex];
    
    // --- Painel de navegação entre critérios ---
    let navHtml = `<div class="criterion-nav" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:1.25rem;">`;
    criteria.forEach((c, i) => {
        const done = comparisonData[c] &&
            comparisonData[c].best &&
            comparisonData[c].worst &&
            comparisonData[c].bestScore !== undefined &&
            comparisonData[c].worstScore !== undefined &&
            alternatives.every(a => getScoreForAlternative(c, a) !== null && getScoreForAlternative(c, a) !== undefined);
        const isCurrent = i === currentCriterionIndex;
        const btnStyle = isCurrent
            ? `background:var(--primary);color:#fff;border:2px solid var(--primary);`
            : done
                ? `background:var(--success, #22c55e);color:#fff;border:2px solid var(--success, #22c55e);`
                : `background:var(--bg);color:var(--text-dark);border:2px solid var(--border);`;
        navHtml += `<button onclick="goToCriterion(${i})" style="${btnStyle} padding:5px 12px; border-radius:20px; font-size:0.82rem; font-weight:600; cursor:pointer; transition:all 0.2s;" title="${c}">${i+1}. ${c.length > 15 ? c.slice(0,13)+'…' : c}${done && !isCurrent ? ' ✓' : ''}</button>`;
    });
    navHtml += `</div>`;

    let html = navHtml + `
        <div class="comparison-question">
            <div class="question-text">
                Critério: ${criterion} (${currentCriterionIndex + 1} de ${criteria.length})
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(currentCriterionIndex / criteria.length) * 100}%"></div>
            </div>
        </div>
    `;
    
    // Passo 1: Escolher melhor alternativa e já pedir seu score
    if (!comparisonData[criterion].best) {
        html += `
            <div style="margin: 20px 0;">
                <h4>1. Qual alternativa é a MELHOR para o critério "${criterion}"?</h4>
                <p style="color: var(--text-soft); font-size: 0.9rem; margin-bottom: 10px;">Selecione a alternativa com melhor desempenho neste critério.</p>
                <div class="alternatives-grid">
        `;
        alternatives.forEach((alt, index) => {
            html += `
                <div class="alternative-card" onclick="selectBest('${criterion}', '${alt}', ${index})">
                    ${alt}
                </div>
            `;
        });
        html += `
                </div>
            </div>
        `;
    }
    // Passo 2: Definir score da melhor (âncora superior) — logo após selecionar
    else if (comparisonData[criterion].bestScore === null || comparisonData[criterion].bestScore === undefined) {
        html += `
            <div style="margin: 20px 0;">
                <div class="success-message">✅ Melhor alternativa selecionada: <strong>${comparisonData[criterion].best}</strong></div>
                <h4>2. Defina o score da melhor alternativa — Âncora Superior:</h4>
                <p style="color: var(--text-soft); font-size: 0.9rem; margin-bottom: 10px;">
                    Atribua um score máximo (entre 0 e 10) para <strong>${comparisonData[criterion].best}</strong>, que representa o melhor desempenho neste critério.
                </p>
                <div class="form-group">
                    <label>Score para "${comparisonData[criterion].best}" (0 a 10):</label>
                    <input type="number" id="bestScore" min="0" max="10" placeholder="Ex: 10" step="0.1">
                    <button class="btn btn-primary" style="margin-top: 8px;" onclick="setBestScore('${criterion}')">Confirmar</button>
                </div>
            </div>
        `;
    }
    // Passo 3: Escolher pior alternativa
    else if (!comparisonData[criterion].worst) {
        html += `
            <div style="margin: 20px 0;">
                <div class="success-message">✅ Melhor: ${comparisonData[criterion].best} → Score ${comparisonData[criterion].bestScore}</div>
                <h4>3. Qual alternativa é a PIOR para o critério "${criterion}"?</h4>
                <p style="color: var(--text-soft); font-size: 0.9rem; margin-bottom: 10px;">Selecione a alternativa com pior desempenho neste critério.</p>
                <div class="alternatives-grid">
        `;
        alternatives.forEach((alt, index) => {
            if (alt !== comparisonData[criterion].best) {
                html += `
                    <div class="alternative-card" onclick="selectWorst('${criterion}', '${alt}', ${index})">
                        ${alt}
                    </div>
                `;
            }
        });
        html += `
                </div>
            </div>
        `;
    }
    // Passo 4: Definir score da pior — logo após selecionar
    else if (comparisonData[criterion].worstScore === null || comparisonData[criterion].worstScore === undefined) {
        html += `
            <div style="margin: 20px 0;">
                <div class="success-message">✅ Melhor: ${comparisonData[criterion].best} → Score ${comparisonData[criterion].bestScore}</div>
                <div class="success-message">✅ Pior alternativa selecionada: <strong>${comparisonData[criterion].worst}</strong></div>
                <h4>4. Defina o score da pior alternativa — Âncora Inferior:</h4>
                <p style="color: var(--text-soft); font-size: 0.9rem; margin-bottom: 10px;">
                    Atribua um score mínimo (entre 0 e ${comparisonData[criterion].bestScore}) para <strong>${comparisonData[criterion].worst}</strong>.
                </p>
                <div class="form-group">
                    <label>Score para "${comparisonData[criterion].worst}" (0 a ${comparisonData[criterion].bestScore}):</label>
                    <input type="number" id="worstScore" min="0" max="${comparisonData[criterion].bestScore}" placeholder="Ex: 0" step="0.1">
                    <button class="btn btn-primary" style="margin-top: 8px;" onclick="setWorstScore('${criterion}')">Confirmar</button>
                </div>
            </div>
        `;
    }
    // Passo 5: Avaliar alternativas restantes com comparação sequencial visual
    else {
        // Verificar se há uma posição selecionada esperando input de score
        if (comparisonData[criterion].selectedPosition) {
            const position = comparisonData[criterion].selectedPosition;
            const avgScore = Math.round((position.minScore + position.maxScore) / 2 * 10) / 10;
            
            html += `
                <div style="margin: 20px 0;">
                    <div class="success-message">✅ Posição selecionada: Entre "${position.higherAlt}" e "${position.lowerAlt}"</div>
                    <h4>Defina o score para "${position.alternative}":</h4>
                    <div class="form-group">
                        <label>Score para "${position.alternative}" (${position.minScore} - ${position.maxScore}):</label>
                        <input type="number" 
                               id="positionScore" 
                               min="${position.minScore}" 
                               max="${position.maxScore}" 
                               placeholder="Ex: ${avgScore}" 
                               step="0.1"
                               value="${avgScore}">
                        <button class="btn btn-primary" onclick="setPositionBetweenScore('${criterion}')">Definir Score</button>
                    </div>
                </div>
            `;
        } else {
            const remaining = alternatives.filter(alt => {
                const score = getScoreForAlternative(criterion, alt);
                return score === null || score === undefined;
            });
            
            if (remaining.length > 0) {
                const currentAlt = remaining[0];
                
                // Obter alternativas já avaliadas e ordenar por score
                const evaluated = getEvaluatedAlternatives(criterion);
                
                html += `
                    <div style="margin: 20px 0;">
                        <div class="ranking-display">
                            <h4>🏆 Ranking atual para "${criterion}"</h4>
                            ${evaluated.map((item, index) => `
                                <div class="ranking-item">
                                    <span class="rank">${index + 1}º</span>
                                    <span class="alt-name">${item.name}</span>
                                    <span class="alt-score">${item.score}</span>
                                </div>
                            `).join('')}
                        </div>
                        
                        <h4>📍 Onde posicionar "${currentAlt}"?</h4>
                        <p>Escolha a posição mais adequada comparando com as alternativas já avaliadas:</p>
                        
                        <div class="position-options">
                            ${generatePositionOptions(criterion, currentAlt, evaluated)}
                        </div>
                    </div>
                `;
            } else {
                // Todos os scores foram definidos para este critério
                const isLastCriterion = currentCriterionIndex >= criteria.length - 1;
                html += `
                    <div style="margin: 20px 0;">
                        <div class="success-message">✅ Avaliação completa para "${criterion}"!</div>
                        <div class="final-ranking">
                            <h4>🏆 Ranking final para "${criterion}"</h4>
                `;

                const finalRanking = getFinalRanking(criterion);
                finalRanking.forEach((item, index) => {
                    html += `
                        <div class="ranking-item final">
                            <span class="rank">${index + 1}º</span>
                            <span class="alt-name">${item.name}</span>
                            <span class="alt-score">${item.score}</span>
                        </div>
                    `;
                });

                // Verificar se TODOS os critérios foram concluídos (não só o atual)
                const allDone = criteria.every(c => {
                    if (!comparisonData[c] || !comparisonData[c].best || !comparisonData[c].worst ||
                        comparisonData[c].bestScore === undefined || comparisonData[c].worstScore === undefined) {
                        return false;
                    }
                    return alternatives.every(a => {
                        const s = getScoreForAlternative(c, a);
                        return s !== null && s !== undefined;
                    });
                });

                // Critérios ainda pendentes (para listar ao usuário)
                const pending = criteria.filter((c, idx) => {
                    if (idx === currentCriterionIndex) return false; // ignora o atual
                    if (!comparisonData[c] || !comparisonData[c].best || !comparisonData[c].worst ||
                        comparisonData[c].bestScore === undefined || comparisonData[c].worstScore === undefined) {
                        return true;
                    }
                    return alternatives.some(a => {
                        const s = getScoreForAlternative(c, a);
                        return s === null || s === undefined;
                    });
                });

                if (allDone) {
                    // Todos os critérios realmente concluídos
                    html += `
                        </div>
                        <div style="margin-top: 16px; padding: 16px; background: linear-gradient(135deg, #edf7f2, #d8f0e4); border-left: 4px solid var(--success); border-radius: var(--radius-sm);">
                            <strong style="color: var(--success); display: block; margin-bottom: 4px;">🎉 Todos os critérios foram avaliados!</strong>
                            Use o botão <strong>"Passo 4 →"</strong> abaixo para continuar para a atribuição de pesos.
                        </div>
                        <div style="margin-top:10px;">
                            <button class="btn btn-secondary" onclick="resetCriterion('${criterion}')" title="Refazer os scores deste critério">
                                ↺ Reiniciar este Critério
                            </button>
                        </div>
                    </div>
                    `;
                } else if (pending.length > 0) {
                    // Ainda há critérios incompletos — guiar o usuário
                    const pendingLinks = pending.map(c => {
                        const idx = criteria.indexOf(c);
                        return `<button onclick="goToCriterion(${idx})" style="background:var(--secondary);color:#fff;border:none;padding:4px 10px;border-radius:12px;font-size:0.82rem;font-weight:600;cursor:pointer;margin:2px;">${idx+1}. ${c}</button>`;
                    }).join(' ');

                    html += `
                        </div>
                        <div style="margin-top: 14px; padding: 14px; background: linear-gradient(135deg, #fef9ec, #fef3c7); border-left: 4px solid #f59e0b; border-radius: var(--radius-sm);">
                            <strong style="color: #92400e; display: block; margin-bottom: 6px;">⚠️ Critério concluído, mas ainda faltam outros:</strong>
                            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px;">${pendingLinks}</div>
                            <span style="font-size:0.82rem; color:#92400e;">Clique em um critério pendente acima ou use o painel de navegação no topo.</span>
                        </div>
                        <div style="display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;">
                            <button class="btn btn-primary" onclick="goToCriterion(${criteria.indexOf(pending[0])})">
                                Ir para próximo pendente →
                            </button>
                            <button class="btn btn-secondary" onclick="resetCriterion('${criterion}')" title="Refazer os scores deste critério">
                                ↺ Reiniciar este Critério
                            </button>
                        </div>
                    </div>
                    `;
                } else {
                    // Há próximo critério em sequência
                    html += `
                        </div>
                        <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
                            <button class="btn btn-primary" onclick="nextCriterion()">
                                Próximo Critério →
                            </button>
                            <button class="btn btn-secondary" onclick="resetCriterion('${criterion}')" title="Refazer os scores deste critério">
                                ↺ Reiniciar este Critério
                            </button>
                        </div>
                    </div>
                    `;
                }

            }
        }
    }
    
    interface_.innerHTML = html;
}

// Funções de seleção e comparação sequencial
function selectBest(criterion, alternative, index) {
    comparisonData[criterion].best = alternative;
    showComparisonForCriterion();
}

function selectWorst(criterion, alternative, index) {
    comparisonData[criterion].worst = alternative;
    showComparisonForCriterion();
}

function setBestScore(criterion) {
    const score = parseFloat(document.getElementById('bestScore').value);
    if (score >= 0 && score <= 10) {
        comparisonData[criterion].bestScore = score;
        showComparisonForCriterion();
    } else {
        showError('Score deve estar entre 0 e 10.');
    }
}

function setWorstScore(criterion) {
    const score = parseFloat(document.getElementById('worstScore').value);
    const maxScore = comparisonData[criterion].bestScore;
    if (score >= 0 && score <= maxScore) {
        comparisonData[criterion].worstScore = score;
        if (!comparisonData[criterion].scores) {
            comparisonData[criterion].scores = {};
        }
        showComparisonForCriterion();
    } else {
        showError(`Score deve estar entre 0 e ${maxScore}.`);
    }
}

// Função principal para obter alternativas já avaliadas ordenadas por score
function getEvaluatedAlternatives(criterion) {
    const evaluated = [];
    const addedAlternatives = new Set(); // Para evitar duplicatas
    
    // Inicializar scores se não existir
    if (!comparisonData[criterion].scores) {
        comparisonData[criterion].scores = {};
    }
    
    // Adicionar melhor alternativa
    if (comparisonData[criterion].best && comparisonData[criterion].bestScore !== null) {
        evaluated.push({
            name: comparisonData[criterion].best,
            score: comparisonData[criterion].bestScore
        });
        addedAlternatives.add(comparisonData[criterion].best);
    }
    
    // Adicionar pior alternativa
    if (comparisonData[criterion].worst && comparisonData[criterion].worstScore !== null) {
        evaluated.push({
            name: comparisonData[criterion].worst,
            score: comparisonData[criterion].worstScore
        });
        addedAlternatives.add(comparisonData[criterion].worst);
    }
    
    // Adicionar alternativas já avaliadas (que não sejam best/worst)
    Object.entries(comparisonData[criterion].scores).forEach(([alt, score]) => {
        if (!addedAlternatives.has(alt) && score !== null && score !== undefined) {
            evaluated.push({
                name: alt,
                score: score
            });
            addedAlternatives.add(alt);
        }
    });
    
    // Ordenar por score (decrescente)
    return evaluated.sort((a, b) => b.score - a.score);
}

// Função para gerar opções de posicionamento visual (MODIFICADA)
function generatePositionOptions(criterion, currentAlt, evaluated) {
    let options = '';
    
    // Opções: Entre duas alternativas consecutivas
    for (let i = 0; i < evaluated.length - 1; i++) {
        const higher = evaluated[i];
        const lower = evaluated[i + 1];
        
        // Só adicionar se houver diferença entre os scores
        if (higher.score !== lower.score) {
            const avgScore = Math.round((higher.score + lower.score) / 2 * 10) / 10;
            const minScore = lower.score;
            const maxScore = higher.score;
            const positionId = `between_${i}`;
            
            options += `
                <div class="alternative-card" onclick="selectPositionBetween('${criterion}', '${currentAlt}', '${positionId}', ${minScore}, ${maxScore}, '${higher.name}', '${lower.name}')">
                    <div class="position-label">📊 Entre "${higher.name}" e "${lower.name}" </div>
                    <div class="position-description">Range: ${minScore} - ${maxScore}</div>
                </div>
            `;
        }
    }
    
    // Opções: Mesmo nível de cada alternativa já avaliada
    evaluated.forEach(item => {
        options += `
            <div class="alternative-card" onclick="setPositionScore('${criterion}', '${currentAlt}', ${item.score})">
                <div class="position-label">⚖️ Mesmo nível de "${item.name}"</div>
                <div class="position-description">Score igual: ${item.score}</div>
            </div>
        `;
    });
    
    return options;
}

// Nova função para selecionar posição entre duas alternativas
function selectPositionBetween(criterion, alternative, positionId, minScore, maxScore, higherAlt, lowerAlt) {
    // Salvar informações da posição selecionada
    if (!comparisonData[criterion].selectedPosition) {
        comparisonData[criterion].selectedPosition = {};
    }
    
    comparisonData[criterion].selectedPosition = {
        alternative: alternative,
        positionId: positionId,
        minScore: minScore,
        maxScore: maxScore,
        higherAlt: higherAlt,
        lowerAlt: lowerAlt
    };
    
    // Atualizar interface para mostrar o input de score
    showComparisonForCriterion();
}

// Nova função para definir score da posição entre alternativas
function setPositionBetweenScore(criterion) {
    const score = parseFloat(document.getElementById('positionScore').value);
    const position = comparisonData[criterion].selectedPosition;
    
    if (score >= position.minScore && score <= position.maxScore) {
        if (!comparisonData[criterion].scores) {
            comparisonData[criterion].scores = {};
        }
        
        comparisonData[criterion].scores[position.alternative] = score;
        
        // Limpar posição selecionada
        delete comparisonData[criterion].selectedPosition;
        
        console.log(`Score definido para ${position.alternative}: ${score}`);
        console.log('Estado atual dos scores:', comparisonData[criterion].scores);
        
        showComparisonForCriterion();
    } else {
        showError(`Score deve estar entre ${position.minScore} e ${position.maxScore}.`);
    }
}

// Função para definir score baseado na posição escolhida
function setPositionScore(criterion, alternative, score) {
    if (!comparisonData[criterion].scores) {
        comparisonData[criterion].scores = {};
    }
    
    // Salvar o score da alternativa
    comparisonData[criterion].scores[alternative] = score;
    
    console.log(`Score definido para ${alternative}: ${score}`);
    console.log('Estado atual dos scores:', comparisonData[criterion].scores);
    
    // Atualizar interface para próxima alternativa
    showComparisonForCriterion();
}

// Função para obter ranking final de um critério
function getFinalRanking(criterion) {
    const ranking = [];
    
    // Adicionar apenas alternativas que foram avaliadas
    alternatives.forEach(alt => {
        const score = getScoreForAlternative(criterion, alt);
        if (score !== null && score !== undefined) {
            ranking.push({
                name: alt,
                score: score
            });
        }
    });
    
    // Ordenar por score (decrescente)
    return ranking.sort((a, b) => b.score - a.score);
}

// Função auxiliar para obter score de uma alternativa
function getScoreForAlternative(criterion, alternative) {
    if (alternative === comparisonData[criterion].best) {
        return comparisonData[criterion].bestScore;
    }
    if (alternative === comparisonData[criterion].worst) {
        return comparisonData[criterion].worstScore;
    }
    return comparisonData[criterion].scores?.[alternative] || null;
}

function goToCriterion(index) {
    currentCriterionIndex = index;
    showComparisonForCriterion();
}

function resetCriterion(criterion) {
    comparisonData[criterion] = {};
    showComparisonForCriterion();
}

function nextCriterion() {
    currentCriterionIndex++;
    if (currentCriterionIndex < criteria.length) {
        showComparisonForCriterion();
    } else {
        // Todos os critérios foram avaliados — re-renderizar para mostrar banner de conclusão
        currentCriterionIndex = criteria.length - 1;
        showComparisonForCriterion();
    }
}

// Função legacy mantida por compat (não mais utilizada no fluxo principal)
function calculateAndShowFinalResults() {
    // Fluxo correto: o usuário usa o botão "Passo 4 →" da navegação
    // Esta função não é mais chamada
}

function validateAllComparisons() {
    for (let criterion of criteria) {
        if (!comparisonData[criterion] || 
            !comparisonData[criterion].best || 
            !comparisonData[criterion].worst ||
            comparisonData[criterion].bestScore === undefined ||
            comparisonData[criterion].worstScore === undefined) {
            showError('Complete todas as comparações antes de continuar.');
            return false;
        }
        
        // Verificar se todas as alternativas têm scores
        for (let alt of alternatives) {
            const score = getScoreForAlternative(criterion, alt);
            if (score === null || score === undefined) {
                showError('Complete todas as avaliações antes de continuar.');
                return false;
            }
        }
    }
    return true;
}