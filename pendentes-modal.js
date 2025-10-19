// ==================== MODAL DE PONTUAÇÕES PENDENTES ====================

const pendentesModal = document.getElementById('pendentes-modal');
const closePendentesModal = document.getElementById('close-pendentes-modal');
const btnProcessarAgora = document.getElementById('btn-processar-agora');
const pendentesList = document.getElementById('pendentes-list');
const pendentesEmpty = document.getElementById('pendentes-empty');

// Fechar modal
closePendentesModal?.addEventListener('click', () => {
    pendentesModal.classList.remove('show');
    setTimeout(() => {
        pendentesModal.classList.add('hidden');
    }, 300);
});

// Função para abrir modal e carregar pendentes
async function abrirModalPendentes() {
    pendentesModal.classList.remove('hidden');
    pendentesModal.offsetHeight;
    requestAnimationFrame(() => {
        pendentesModal.classList.add('show');
    });

    await carregarPendentes();
}

// Função para carregar lista de pendentes
async function carregarPendentes() {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/sql/pontuacoes-pendentes`);
        const data = await response.json();

        if (data.success && data.count > 0) {
            pendentesEmpty.classList.add('hidden');
            pendentesList.classList.remove('hidden');

            pendentesList.innerHTML = data.data.map(pendente => {
                const dataCriacao = new Date(pendente.data_criacao).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const ultimaTentativa = pendente.ultima_tentativa ?
                    new Date(pendente.ultima_tentativa).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }) : null;

                return `
                    <div class="pendente-item">
                        <div class="pendente-header">
                            <div class="pendente-nota">Nota: ${pendente.numero_nota}</div>
                            <div>
                                <span class="pendente-badge badge-tentativas">
                                    🔄 ${pendente.tentativas}/5 tentativas
                                </span>
                            </div>
                        </div>

                        <div class="pendente-details">
                            <div class="detail-item">
                                <span class="detail-label">Cliente</span>
                                <span class="detail-value">${formatCPFDisplay(pendente.cpf_telefone)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Valor</span>
                                <span class="detail-value">${formatCurrency(pendente.valor)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Data do Erro</span>
                                <span class="detail-value">${dataCriacao}</span>
                            </div>
                            ${ultimaTentativa ? `
                            <div class="detail-item">
                                <span class="detail-label">Última Tentativa</span>
                                <span class="detail-value">${ultimaTentativa}</span>
                            </div>
                            ` : ''}
                        </div>

                        ${pendente.erro_mensagem ? `
                        <div class="pendente-erro">
                            <div class="pendente-erro-label">❌ Erro:</div>
                            <div class="pendente-erro-text">${pendente.erro_mensagem}</div>
                        </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        } else {
            pendentesList.classList.add('hidden');
            pendentesEmpty.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Erro ao carregar pendentes:', error);
        showNotification('Erro ao carregar pontuações pendentes', 'error');
    }
}

// Processar todas agora
btnProcessarAgora?.addEventListener('click', async () => {
    const confirmacao = confirm(
        'Deseja tentar processar TODAS as pontuações pendentes agora?\n\n' +
        'Isso pode levar alguns segundos...'
    );

    if (!confirmacao) return;

    try {
        btnProcessarAgora.disabled = true;
        btnProcessarAgora.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" opacity="0.3"/></svg> Processando...';

        showNotification('Processando pontuações pendentes...', 'info');

        const response = await fetch(`${API_CONFIG.baseUrl}/sql/processar-pendentes`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            showNotification(
                `✅ Processamento concluído! ${data.resultados.sucesso} sucesso(s), ${data.resultados.falha} falha(s)`,
                data.resultados.sucesso > 0 ? 'success' : 'error'
            );

            // Recarregar lista
            await carregarPendentes();

            // Atualizar contador
            setTimeout(atualizarContadorPendentes, 1000);
        }
    } catch (error) {
        showNotification('Erro ao processar pendentes', 'error');
    } finally {
        btnProcessarAgora.disabled = false;
        btnProcessarAgora.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Processar Todas Agora';
    }
});
