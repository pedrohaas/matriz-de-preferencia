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

function saveResultsImage() {
    const container = document.getElementById('resultsInterface');
    if (!container || container.innerHTML.trim() === '') {
        alert('Execute a análise antes de salvar a imagem.');
        return;
    }

    // Substituir os sliders por barras CSS puras antes do screenshot
    // (html2canvas não renderiza <input type="range"> corretamente)
    const weightItems = container.querySelectorAll('.weight-control-item');
    const originalHTML = [];

    weightItems.forEach((item, i) => {
        originalHTML[i] = item.innerHTML;
        const slider = item.querySelector('input[type="range"]');
        const label  = item.querySelector('div[style*="min-width: 150px"]');
        const numInput = item.querySelector('input[type="number"]');

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

    html2canvas(container, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
    }).then(canvas => {
        // Restaurar sliders após captura
        weightItems.forEach((item, i) => {
            item.innerHTML = originalHTML[i];
        });

        canvas.toBlob(function(blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
            a.download = `resultados-matriz-preferencia-${timestamp}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }).catch(err => {
        // Restaurar em caso de erro também
        weightItems.forEach((item, i) => {
            item.innerHTML = originalHTML[i];
        });
        console.error('Erro ao gerar imagem:', err);
        alert('Não foi possível gerar a imagem dos resultados.');
    });
}
