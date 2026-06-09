function saveResults() {
    if (typeof lastResultsData === 'undefined') {
        alert('Nenhum resultado para salvar. Execute a análise antes.');
        return;
    }
    const jsonString = JSON.stringify(lastResultsData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
    a.download = `resultados-matriz-preferencia-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function saveResultsImage() {
    const container = document.getElementById('resultsInterface');
    if (!container || container.innerHTML.trim() === '') {
        alert('Execute a análise antes de salvar a imagem.');
        return;
    }

    // O botão de "loading" para dar feedback ao usuário
    const btnSalvar = document.querySelector('button[onclick="saveResultsImage()"]');
    const originalBtnText = btnSalvar ? btnSalvar.innerHTML : '';
    if (btnSalvar) {
        btnSalvar.innerHTML = '⏳ Gerando...';
        btnSalvar.disabled = true;
    }

    // Criar um clone do container para não afetar a interface original durante a injeção
    const exportWrapper = document.createElement('div');
    exportWrapper.style.position = 'absolute';
    exportWrapper.style.left = '-9999px';
    exportWrapper.style.top = '0';
    exportWrapper.style.width = '1000px'; // Largura agradável e fixa para não quebrar tabelas
    exportWrapper.style.background = '#f8fafc'; // Fundo suave do site
    exportWrapper.style.padding = '40px';
    exportWrapper.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
    
    const clone = container.cloneNode(true);
    exportWrapper.appendChild(clone);
    document.body.appendChild(exportWrapper);

    // Substituir os sliders por barras puras no CLONE (html2canvas não lê ranges direito)
    const weightItems = clone.querySelectorAll('.weight-control-item');
    weightItems.forEach((item) => {
        const slider = item.querySelector('input[type="range"]');
        const label  = item.querySelector('div[style*="min-width: 150px"]');
        if (slider && label) {
            const pct = parseFloat(slider.value).toFixed(1);
            item.innerHTML = `
                <div style="min-width: 150px; font-weight: 600; color: #153557;">${label ? label.textContent : ''}</div>
                <div style="flex: 1; display: flex; align-items: center; gap: 10px;">
                    <div style="flex: 1; height: 10px; background: #d4cdd0; border-radius: 5px; overflow: hidden;">
                        <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #2596be, #153557); border-radius: 5px;"></div>
                    </div>
                    <span style="min-width: 45px; font-size: 0.85rem; font-weight: 700; color: #153557; text-align: right;">${pct}%</span>
                </div>
            `;
        }
    });

    // Esconder os botões de controle de pesos na imagem (Restaurar pesos, Equalizar)
    const controlButtons = clone.querySelector('div[style*="justify-content: center;"]');
    if (controlButtons && controlButtons.querySelector('button')) {
        controlButtons.style.display = 'none';
    }

    // Esconder botões de exportação dentro do clone se eles estiverem lá
    const saveBox = clone.querySelector('div[style*="margin-top: 2rem"]');
    if (saveBox && saveBox.querySelector('button')) {
        saveBox.style.display = 'none';
    }

    // Injetar o CSS Inline para o html2canvas ler corretamente em ambiente local (file://)
    const styleEl = document.createElement('style');
    try {
        const cssResponse = await fetch('style.css?v=' + new Date().getTime());
        styleEl.textContent = await cssResponse.text();
    } catch (e) {
        console.warn('Fallback: lendo cssRules diretamente', e);
        let css = '';
        for (let i = 0; i < document.styleSheets.length; i++) {
            try {
                const rules = document.styleSheets[i].cssRules;
                if (rules) {
                    for (let j = 0; j < rules.length; j++) css += rules[j].cssText + '\\n';
                }
            } catch(err) {}
        }
        styleEl.textContent = css;
    }
    exportWrapper.insertBefore(styleEl, exportWrapper.firstChild);

    try {
        const canvas = await html2canvas(exportWrapper, {
            backgroundColor: '#f8fafc',
            scale: 2,
            useCORS: true,
            logging: false,
        });

        canvas.toBlob(function(blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
            a.download = `matriz-preferencia-resultados-${timestamp}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    } catch (err) {
        console.error('Erro ao gerar imagem:', err);
        alert('Não foi possível gerar a imagem dos resultados.');
    } finally {
        document.body.removeChild(exportWrapper);
        if (btnSalvar) {
            btnSalvar.innerHTML = originalBtnText;
            btnSalvar.disabled = false;
        }
    }
}
