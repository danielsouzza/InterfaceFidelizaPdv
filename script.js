// Detectar se está rodando no Electron
const isElectron = navigator.userAgent.toLowerCase().includes('electron');

console.log(`🔧 Ambiente: ${isElectron ? 'Electron (Desktop)' : 'Web (Navegador)'}`);

// Configuração da API
const API_CONFIG = {
    baseUrl: 'http://localhost:3001/api',
    endpoints: {
        searchClient: '/buscar-cliente',
        addPoints: '/pontuar-cliente',
        registerClient: '/cadastrar-cliente',
        updateClient: '/atualizar-cliente',
        getClientData: '/dados-cliente',
        getExtrato: '/extrato-cliente'
    }
};

// URL direta da API Fidelimax
const FIDELIMAX_API = {
    baseUrl: 'https://api.fidelimax.com.br/api/Integracao',
    consultClient: '/ConsultaConsumidor',
    addPoints: '/PontuaConsumidor'
};

// Elementos do DOM
const cpfInput = document.getElementById('cpf');
const valueInput = document.getElementById('value');
const notaFiscalInput = document.getElementById('nota-fiscal');
const searchBtn = document.getElementById('search-btn');
const registerScoreBtn = document.getElementById('register-score-btn');
const registerClientBtn = document.getElementById('register-client-btn');
const historyClientBtn = document.getElementById('history-client-btn');

// Sidebars
const sidebarNotFound = document.getElementById('sidebar-not-found');
const sidebarIdentified = document.getElementById('sidebar-identified');
const closeNotFound = document.getElementById('close-not-found');
const closeIdentified = document.getElementById('close-identified');
const btnOpenRegister = document.getElementById('btn-open-register');
const btnEditCustomer = document.getElementById('btn-edit-customer');
const mainContent = document.querySelector('.main-content');

// Mobile Customer Card
const mobileCustomerCard = document.getElementById('mobile-customer-card');
const closeMobileCard = document.getElementById('close-mobile-card');
const mobileDetailsBtn = document.getElementById('mobile-details-btn');

// Modal de Detalhes do Cliente (Mobile)
const customerDetailsModal = document.getElementById('customer-details-modal');
const closeCustomerDetailsModal = document.getElementById('close-customer-details-modal');
const btnEditCustomerModal = document.getElementById('btn-edit-customer-modal');

// Modal Cadastro
const registerModal = document.getElementById('register-modal');
const closeRegisterModalBtn = document.getElementById('close-register-modal');
const btnCancelRegister = document.getElementById('btn-cancel-register');
const registerForm = document.getElementById('register-form');
const regDocument = document.getElementById('reg-document');

// Modal Histórico
const historyModal = document.getElementById('history-modal');
const closeHistoryModalBtn = document.getElementById('close-history-modal');

// Modal Sucesso
const successModal = document.getElementById('success-modal');
const btnCloseSuccess = document.getElementById('btn-close-success');

let selectedCustomer = null;
let searchedInput = ''; // CPF ou telefone buscado

// Função para formatar CPF
function formatCPF(cpf) {
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Função para limpar formatação
function cleanInput(input) {
    return input.replace(/\D/g, '');
}

// Função para formatar moeda
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Função para formatar número de pontos
function formatPoints(points) {
    return new Intl.NumberFormat('pt-BR').format(points);
}

// Função para detectar tipo de entrada (CPF ou telefone) usando regex
function detectInputType(input) {
    const cleaned = cleanInput(input);

    // Se não tem 11 dígitos, retorna null
    if (cleaned.length !== 11) {
        return null;
    }

    // Para 11 dígitos, verificar se é telefone celular
    // Telefone celular: DDD (11-99) + 9 + 8 dígitos
    // Exemplo: 11999998888 (terceiro dígito é 9)
    const thirdDigit = cleaned.charAt(2);

    if (thirdDigit === '9') {
        // É um telefone celular (DDD + 9 + 8 dígitos)
        return 'telefone';
    } else {
        // É um CPF
        return 'cpf';
    }
}

// Função para buscar/consultar cliente via proxy local
async function searchClients(query) {
    const cleaned = cleanInput(query);

    if (cleaned.length !== 11) {
        return [];
    }

    const inputType = detectInputType(query);
    if (!inputType) {
        return [];
    }

    try {
        const requestBody = {};

        if (inputType === 'cpf') {
            requestBody.cpf = cleaned;
        } else {
            requestBody.telefone = cleaned;
        }

        console.log('Consultando consumidor:', requestBody);

        // Usar o proxy local para evitar CORS
        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.searchClient}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }

        const data = await response.json();

        console.log('Resposta ConsultaConsumidor:', data);

        // Normalizar resposta da API Fidelimax ConsultaConsumidor
        if (data && data.CodigoResposta === 100 && data.consumidor_existente) {
            return [{
                id: cleaned,
                name: data.nome,
                cpf: inputType === 'cpf' ? cleaned : '',
                phone: inputType === 'telefone' ? cleaned : '',
                points: data.saldo || 0,
                pointsToExpire: data.pontos_expirar || 0,
                cashback: data.cashback || 0,
                category: data.categoria || 'Padrão',
                frozen: data.congelado || false,
                products: data.produtos || [],
                config: data.configuracao_programa || {},
                email: '',
                dataCadastro: '',
                dataUltimaCompra: ''
            }];
        }

        return [];
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        showNotification('Erro ao buscar clientes. Verifique a conexão.', 'error');
        return [];
    }
}

// Função para pontuar consumidor
async function addPointsToCustomer(customer, purchaseValue, numero_nota, options = {}) {
    try {
        const requestBody = {
            pontuacao_reais: purchaseValue,
            numero_nota: numero_nota
        };

        // Adicionar CPF ou telefone (obrigatório se cartao não for enviado)
        if (customer.cpf) {
            requestBody.cpf = cleanInput(customer.cpf);
        } else if (customer.phone) {
            requestBody.telefone = cleanInput(customer.phone);
        }

        // Campos opcionais
        if (options.cartao) {
            requestBody.cartao = options.cartao;
        }
        if (options.tipo_compra) {
            requestBody.tipo_compra = options.tipo_compra;
        }
        if (options.verificador) {
            requestBody.verificador = options.verificador;
        }
        if (options.estorno !== undefined) {
            requestBody.estorno = options.estorno;
        }

        console.log('Enviando pontuação:', requestBody);

        // Usar o proxy local para evitar CORS
        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.addPoints}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro na API: ${errorData.user_message}`);
        }

        const data = await response.json();

        console.log('Resposta da pontuação:', data);

        // Verificar se a pontuação foi bem sucedida
        if (data && data.CodigoResposta === 100) {
            return {
                success: true,
                message: data.Mensagem || 'Pontos adicionados com sucesso!',
                data: data
            };
        } else {
            return {
                success: false,
                message: data.Mensagem || 'Erro ao adicionar pontos',
                data: data
            };
        }
    } catch (error) {
        console.error('Erro ao pontuar cliente:', error);
        return {
            success: false,
            message: error,
            error: error
        };
    }
}

// Função para selecionar cliente
function selectCustomer(client) {
    selectedCustomer = client;

    // Mostrar painel lateral de cliente identificado
    showIdentifiedSidebar(client);

    // Habilitar campo de valor e botão
    valueInput.disabled = false;
    registerScoreBtn.disabled = false;
}

// Função para mostrar sidebar de cliente identificado
function showIdentifiedSidebar(client) {
    // Fechar outros painéis
    closeSidebarNotFound();

    // Preencher dados do cliente no SIDEBAR (Desktop)
    document.getElementById('identified-name').textContent = client.name.toUpperCase();
    document.getElementById('identified-points').textContent = formatPoints(client.points);
    document.getElementById('identified-cashback').textContent = formatCurrency(client.cashback);
    document.getElementById('identified-document').textContent = client.cpf ? formatCPF(client.cpf) : client.phone;
    document.getElementById('identified-category').textContent = client.category || 'Padrão';

    // Preencher dados do cliente no CARD MOBILE
    document.getElementById('mobile-identified-name').textContent = client.name.toUpperCase();
    document.getElementById('mobile-identified-points').textContent = 'Pontos: '+formatPoints(client.points);
    document.getElementById('mobile-identified-cashback').textContent = formatCurrency(client.cashback);
    document.getElementById('mobile-identified-document').textContent = client.cpf ? formatCPF(client.cpf) : client.phone;

    // Preencher dados do cliente no MODAL DE DETALHES (Mobile)
    document.getElementById('modal-customer-name').textContent = client.name.toUpperCase();
    document.getElementById('modal-customer-points').textContent = formatPoints(client.points);
    document.getElementById('modal-customer-cashback').textContent = formatCurrency(client.cashback);
    document.getElementById('modal-customer-document').textContent = client.cpf ? formatCPF(client.cpf) : client.phone;
    document.getElementById('modal-customer-category').textContent = client.category || 'Padrão';

    console.log('Cliente selecionado:', {
        nome: client.name,
        pontos: client.points,
        pontos_expirar: client.pointsToExpire,
        cashback: client.cashback,
        categoria: client.category,
        congelado: client.frozen,
        produtos_disponiveis: client.products?.length || 0
    });

    // Mostrar sidebar (Desktop)
    sidebarIdentified.classList.remove('hidden');
    setTimeout(() => {
        sidebarIdentified.classList.add('show');
        mainContent.classList.add('with-sidebar');
    }, 10);

    // Mostrar card mobile
    mobileCustomerCard.classList.remove('hidden');
}

// Função para fechar sidebar identificado
function closeSidebarIdentified() {
    sidebarIdentified.classList.remove('show');
    mainContent.classList.remove('with-sidebar');
    setTimeout(() => {
        sidebarIdentified.classList.add('hidden');
    }, 300);

    // Fechar também o card mobile
    mobileCustomerCard.classList.add('hidden');
}

// Função para mostrar sidebar de cliente não encontrado
function showNotFoundSidebar(input) {
    // Fechar outros painéis
    closeSidebarIdentified();

    searchedInput = input;

    // Mostrar sidebar
    sidebarNotFound.classList.remove('hidden');
    setTimeout(() => {
        sidebarNotFound.classList.add('show');
        mainContent.classList.add('with-sidebar');
    }, 10);
}

// Função para fechar sidebar não encontrado
function closeSidebarNotFound() {
    sidebarNotFound.classList.remove('show');
    mainContent.classList.remove('with-sidebar');
    setTimeout(() => {
        sidebarNotFound.classList.add('hidden');
    }, 300);
}

// Função para mostrar modal de cadastro
function showRegisterModal(input = '', mode = 'create') {
    // Definir o modo do modal
    document.getElementById('modal-mode').value = mode;

    // Atualizar título e botão de acordo com o modo
    const modalTitle = document.getElementById('modal-title');
    const submitBtn = document.getElementById('btn-submit-register');

    if (mode === 'edit') {
        modalTitle.textContent = 'Editar Cliente';
        submitBtn.textContent = 'Atualizar Cliente';
    } else {
        modalTitle.textContent = 'Cadastrar Cliente';
        submitBtn.textContent = 'Cadastrar Cliente';
    }

    // Preencher campo correto se fornecido (detectar se é CPF ou telefone)
    if (input && mode === 'create') {
        const inputType = detectInputType(input);

        if (inputType === 'cpf') {
            // É CPF - preencher campo de documento
            regDocument.value = formatCPF(input);
        } else if (inputType === 'telefone') {
            // É telefone - preencher campo de telefone
            const phoneInput = document.getElementById('reg-phone');
            phoneInput.value = input;
            applyPhoneMask(phoneInput);
        } else {
            // Se não conseguir detectar, preencher no documento mesmo
            regDocument.value = input;
        }
    }

    // Mostrar modal
    registerModal.classList.remove('hidden');
    setTimeout(() => {
        registerModal.classList.add('show');
    }, 10);
}

// Função para abrir modal de edição com dados do cliente
async function showEditModal(customer) {
    if (!customer) {
        showNotification('Nenhum cliente selecionado', 'error');
        return;
    }

    // Mostrar loading
    showNotification('Buscando dados do cliente...', 'info');

    // Buscar dados completos do cliente
    const cpf = customer.cpf || customer.document;
    const telefone = customer.telefone || customer.phone;

    const result = await getCustomerData(cpf, telefone);

    if (!result.success) {
        showNotification(result.message || 'Erro ao buscar dados do cliente', 'error');
        return;
    }

    const clientData = result.data;

    // Abrir modal em modo de edição
    showRegisterModal('', 'edit');

    // Preencher os campos do formulário com os dados completos da API
    document.getElementById('reg-name').value = clientData.nome || '';

    // Preencher documento (CPF)
    if (clientData.documento) {
        document.getElementById('reg-document').value = formatCPF(clientData.documento);
    }

    // Preencher telefone formatado
    if (clientData.telefone) {
        const phoneInput = document.getElementById('reg-phone');
        phoneInput.value = clientData.telefone;
        applyPhoneMask(phoneInput);
    }

    // Preencher e-mail (se for apenas "@", deixar vazio)
    const email = clientData.email || '';
    document.getElementById('reg-email').value = email.trim() === '@' ? '' : email;

    // Preencher sexo (se tiver)
    if (clientData.sexo) {
        const genderRadio = document.querySelector(`input[name="gender"][value="${clientData.sexo}"]`);
        if (genderRadio) {
            genderRadio.checked = true;
        }
    }

    // Preencher data de nascimento (se tiver)
    if (clientData.data_nascimento) {
        const birthdateInput = document.getElementById('reg-birthdate');
        // Converter de YYYY-MM-DDTHH:mm:ss para DD/MM/YYYY
        const dateStr = clientData.data_nascimento.split('T')[0]; // Pega apenas YYYY-MM-DD
        const [year, month, day] = dateStr.split('-');
        birthdateInput.value = `${day}/${month}/${year}`;
    }

    showNotification('Dados do cliente carregados', 'success');
}

// Função para fechar modal de cadastro
function closeRegisterModal() {
    registerModal.classList.remove('show');
    setTimeout(() => {
        registerModal.classList.add('hidden');
        // Limpar formulário
        registerForm.reset();
        // Resetar para modo de criação
        document.getElementById('modal-mode').value = 'create';
        document.getElementById('modal-title').textContent = 'Cadastrar Cliente';
        document.getElementById('btn-submit-register').textContent = 'Cadastrar Cliente';
    }, 300);
}

// Função para mostrar modal de histórico
async function showHistoryModal(client) {
    if (!client) {
        showNotification('Selecione um cliente primeiro', 'error');
        return;
    }

    // Preencher dados do cliente
    document.getElementById('history-client-name').textContent = client.name;
    document.getElementById('history-points').textContent = formatPoints(client.points);
    document.getElementById('history-points-expire').textContent = formatPoints(client.pointsToExpire || 0);
    document.getElementById('history-cashback').textContent = formatCurrency(client.cashback);

    // Mostrar modal com loading
    historyModal.classList.remove('hidden');
    setTimeout(() => {
        historyModal.classList.add('show');
    }, 10);

    // Buscar extrato do cliente
    const extratoContainer = document.getElementById('extrato-container');
    const extratoList = document.getElementById('extrato-list');
    const noExtrato = document.getElementById('no-extrato');

    extratoList.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">Carregando histórico...</div>';

    try {
        const requestBody = {};
        if (client.cpf) requestBody.cpf = cleanInput(client.cpf);
        if (client.phone) requestBody.telefone = cleanInput(client.phone);

        const response = await fetch(`${API_CONFIG.baseUrl}/extrato-cliente`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (data.CodigoResposta === 100 && data.extrato && data.extrato.length > 0) {
            noExtrato.classList.add('hidden');
            extratoList.classList.remove('hidden');

            extratoList.innerHTML = data.extrato.map(item => {
                const dataFormatada = new Date(item.data_pontuacao).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const validadeFormatada = item.data_expiracao ?
                    new Date(item.data_expiracao).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    }) : null;

                // Determinar tipo: crédito ou débito
                const isCredito = item.credito > 0;
                const pontos = isCredito ? item.credito : item.debito;

                return `
                    <div class="extrato-item ${isCredito ? 'credito' : 'debito'}">
                        <div class="extrato-icon">
                            ${isCredito ?
                                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/></svg>' :
                                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 12V22H4V12M2 7H22M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
                            }
                        </div>
                        <div class="extrato-content">
                            <div class="extrato-header">
                                <span class="extrato-title">${isCredito ? 'Cliente Pontuado' : (item.premio_nome || 'Resgate de Prêmio')}</span>
                                <span class="extrato-points ${isCredito ? 'green' : 'red'}">
                                    ${isCredito ? '+' : '-'} ${formatPoints(pontos)} Pontos
                                </span>
                            </div>
                            <div class="extrato-details">
                                ${isCredito ? `
                                    <div class="extrato-detail">Pontos de Compra</div>
                                    ${validadeFormatada ? `<div class="extrato-detail">Validade: ${validadeFormatada}</div>` : ''}
                                    ${item.verificador ? `<div class="extrato-detail">Nota: ${item.verificador}</div>` : ''}
                                    ${item.tipo_compra ? `<div class="extrato-detail">Tipo: ${item.tipo_compra}</div>` : ''}
                                    ${item.loja ? `<div class="extrato-detail">Loja: ${item.loja}</div>` : ''}
                                ` : `
                                    ${item.premio_nome ? `<div class="extrato-detail">Prêmio: ${item.premio_nome}</div>` : ''}
                                    ${item.voucher ? `<div class="extrato-detail">Voucher: ${item.voucher} ${item.voucher_resgatado ? '✅ Resgatado' : '⏳ Pendente'}</div>` : ''}
                                    ${item.loja ? `<div class="extrato-detail">Loja: ${item.loja}</div>` : ''}
                                `}
                            </div>
                            <div class="extrato-date">${dataFormatada}</div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            extratoList.classList.add('hidden');
            noExtrato.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Erro ao buscar extrato:', error);
        extratoList.innerHTML = '<div style="text-align: center; padding: 40px; color: #ef4444;">Erro ao carregar histórico</div>';
    }
}

// Função para fechar modal de histórico
function closeHistoryModal() {
    historyModal.classList.remove('show');
    setTimeout(() => {
        historyModal.classList.add('hidden');
    }, 300);
}

// Função para mostrar modal de sucesso
function showSuccessModal(data) {
    const { purchaseValue, pointsEarned, customerName, currentPoints } = data;

    // Preencher dados
    document.getElementById('success-value').textContent = formatCurrency(purchaseValue);
    document.getElementById('success-points-earned').textContent = formatPoints(pointsEarned) + ' pontos';
    document.getElementById('success-current-points').textContent = formatPoints(currentPoints) + ' pontos';
    document.getElementById('success-client-name').textContent = customerName.toUpperCase();

    // Mostrar modal
    successModal.classList.remove('hidden');
    setTimeout(() => {
        successModal.classList.add('show');
    }, 15);
}

// Função para fechar modal de sucesso
function closeSuccessModal() {
    successModal.classList.remove('show');
    setTimeout(() => {
        successModal.classList.add('hidden');
    }, 300);
}

// Função para mostrar notificação
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Event Listeners

// Buscar cliente ao clicar no botão
searchBtn.addEventListener('click', async () => {
    const query = cpfInput.value.trim();

    if (!query) {
        showNotification('Digite um CPF ou telefone para buscar', 'error');
        return;
    }

    const cleaned = cleanInput(query);

    if (cleaned.length < 3) {
        showNotification('Digite pelo menos 3 dígitos', 'error');
        return;
    }

    // Mostrar loading
    searchBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" opacity="0.3"/></svg> Buscando...';
    searchBtn.disabled = true;

    try {
        const clients = await searchClients(query);

        if (clients.length > 0) {
            // Cliente encontrado
            selectCustomer(clients[0]);
            showNotification('Cliente encontrado!', 'success');
        } else {
            // Cliente não encontrado
            showNotFoundSidebar(cleaned);
            showNotification('Cliente não encontrado', 'error');
        }
    } catch (error) {
        showNotification('Erro ao buscar cliente', 'error');
    } finally {
        // Restaurar botão
        searchBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM18 18l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Buscar Clientes';
        searchBtn.disabled = false;
    }
});

// Buscar ao pressionar Enter no campo CPF
cpfInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        searchBtn.click();
    }
});

// Buscar automaticamente quando campo estiver completo (11 dígitos)
cpfInput.addEventListener('input', async (e) => {
    const query = e.target.value;
    const cleaned = cleanInput(query);

    // Se tiver exatamente 11 dígitos, buscar automaticamente
    if (cleaned.length === 11) {
        searchBtn.click();
    }
});

// Botões de fechar sidebars
closeNotFound.addEventListener('click', closeSidebarNotFound);
closeIdentified.addEventListener('click', closeSidebarIdentified);

// Botão para abrir modal de cadastro do sidebar "não encontrado"
btnOpenRegister.addEventListener('click', () => {
    closeSidebarNotFound();
    showRegisterModal(searchedInput);
});

// Botão "Cadastrar Cliente" da tela principal
registerClientBtn.addEventListener('click', () => {
    const input = cleanInput(cpfInput.value);
    showRegisterModal(input);
});

// Botão "Editar Cadastro" do sidebar identificado
btnEditCustomer.addEventListener('click', () => {
    if (selectedCustomer) {
        showEditModal(selectedCustomer);
    }
});

// Botões do modal de cadastro
closeRegisterModalBtn.addEventListener('click', closeRegisterModal);
btnCancelRegister.addEventListener('click', closeRegisterModal);

// Fechar modal de cadastro ao clicar fora
registerModal.addEventListener('click', (e) => {
    if (e.target === registerModal) {
        closeRegisterModal();
    }
});

// Botão "Histórico do Cliente"
historyClientBtn.addEventListener('click', () => {
    if (selectedCustomer) {
        showHistoryModal(selectedCustomer);
    } else {
        showNotification('Busque e selecione um cliente primeiro', 'error');
    }
});

// Botões do modal de histórico
closeHistoryModalBtn.addEventListener('click', closeHistoryModal);

// Fechar modal de histórico ao clicar fora
historyModal.addEventListener('click', (e) => {
    if (e.target === historyModal) {
        closeHistoryModal();
    }
});

// Botão do modal de sucesso
btnCloseSuccess.addEventListener('click', closeSuccessModal);

// Fechar modal de sucesso ao clicar fora
successModal.addEventListener('click', (e) => {
    if (e.target === successModal) {
        closeSuccessModal();
    }
});

// ==================== EVENT LISTENERS - MOBILE CARD ====================

// Fechar card mobile
// closeMobileCard.addEventListener('click', () => {
//     mobileCustomerCard.classList.add('hidden');
// });

// Abrir modal de detalhes do cliente (Mobile)
mobileDetailsBtn.addEventListener('click', () => {
    customerDetailsModal.classList.remove('hidden');
    setTimeout(() => {
        customerDetailsModal.classList.add('show');
    }, 10);
});

// Fechar modal de detalhes do cliente
closeCustomerDetailsModal.addEventListener('click', () => {
    customerDetailsModal.classList.remove('show');
    setTimeout(() => {
        customerDetailsModal.classList.add('hidden');
    }, 300);
});

// Fechar modal de detalhes ao clicar fora
customerDetailsModal.addEventListener('click', (e) => {
    if (e.target === customerDetailsModal) {
        customerDetailsModal.classList.remove('show');
        setTimeout(() => {
            customerDetailsModal.classList.add('hidden');
        }, 300);
    }
});

// Botão editar do modal de detalhes (Mobile)
btnEditCustomerModal.addEventListener('click', () => {
    // Fechar modal de detalhes
    customerDetailsModal.classList.remove('show');
    setTimeout(() => {
        customerDetailsModal.classList.add('hidden');
    }, 300);

    // Abrir modal de edição de cadastro (mesma função do desktop)
    if (selectedCustomer) {
        showEditModal(selectedCustomer);
    }
});

// Função para cadastrar consumidor
async function registerConsumer(data) {
    try {
        console.log('Enviando cadastro:', data);

        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.registerClient}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }

        const result = await response.json();

        console.log('Resposta do cadastro:', result);

        // Verificar se o cadastro foi bem sucedido
        if (result && result.CodigoResposta === 100) {
            return {
                success: true,
                message: result.Mensagem || 'Cliente cadastrado com sucesso!',
                data: result
            };
        } else {
            return {
                success: false,
                message: result.MensagemErro || result.Mensagem || 'Erro ao cadastrar cliente',
                data: result
            };
        }
    } catch (error) {
        console.error('Erro ao cadastrar consumidor:', error);
        return {
            success: false,
            message: 'Erro ao conectar com o servidor',
            error: error
        };
    }
}

// Função para atualizar consumidor
async function updateConsumer(data) {
    try {
        console.log('Enviando atualização:', data);

        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.updateClient}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }

        const result = await response.json();

        console.log('Resposta da atualização:', result);

        // Verificar se a atualização foi bem sucedida
        if (result && result.CodigoResposta === 100) {
            return {
                success: true,
                message: result.Mensagem || 'Cliente atualizado com sucesso!',
                data: result
            };
        } else {
            return {
                success: false,
                message: result.MensagemErro || result.Mensagem || 'Erro ao atualizar cliente',
                data: result
            };
        }
    } catch (error) {
        console.error('Erro ao atualizar consumidor:', error);
        return {
            success: false,
            message: 'Erro ao conectar com o servidor',
            error: error
        };
    }
}

// Função para buscar dados completos do cliente
async function getCustomerData(cpf, telefone) {
    try {
        console.log('Buscando dados completos do cliente:', { cpf, telefone });

        const requestBody = {};
        if (cpf) requestBody.cpf = cpf;
        if (telefone) requestBody.telefone = telefone;

        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.getClientData}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }

        const result = await response.json();

        console.log('Resposta RetornaDadosCliente:', result);

        // Verificar se a busca foi bem sucedida
        if (result && result.CodigoResposta === 100) {
            return {
                success: true,
                data: result
            };
        } else {
            return {
                success: false,
                message: result.MensagemErro || 'Erro ao buscar dados do cliente',
                data: result
            };
        }
    } catch (error) {
        console.error('Erro ao buscar dados do cliente:', error);
        return {
            success: false,
            message: 'Erro ao conectar com o servidor',
            error: error
        };
    }
}

// Função para formatar telefone para (XX)XXXXX-XXXX
function formatPhoneForAPI(phone) {
    const cleaned = cleanInput(phone);
    if (cleaned.length === 11) {
        // Formato: (XX)9XXXX-XXXX
        return `(${cleaned.substring(0, 2)})${cleaned.substring(2, 7)}-${cleaned.substring(7, 11)}`;
    } else if (cleaned.length === 10) {
        // Formato: (XX)XXXX-XXXX
        return `(${cleaned.substring(0, 2)})${cleaned.substring(2, 6)}-${cleaned.substring(6, 10)}`;
    }
    return cleaned;
}

// Função para formatar data - agora já está no formato DD/MM/YYYY
function formatDateForAPI(dateString) {
    if (!dateString) return '';
    // Remove qualquer caractere que não seja número ou barra
    return dateString.replace(/[^\d\/]/g, '');
}

// Função para aplicar máscara de data DD/MM/YYYY
function applyDateMask(input) {
    let value = input.value.replace(/\D/g, ''); // Remove tudo que não é número

    if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2);
    }
    if (value.length >= 5) {
        value = value.substring(0, 5) + '/' + value.substring(5, 9);
    }

    input.value = value;
}

// Função para aplicar máscara de telefone (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
function applyPhoneMask(input) {
    let value = input.value.replace(/\D/g, ''); // Remove tudo que não é número

    if (value.length <= 10) {
        // Telefone fixo: (XX) XXXX-XXXX
        if (value.length > 6) {
            value = '(' + value.substring(0, 2) + ') ' + value.substring(2, 6) + '-' + value.substring(6, 10);
        } else if (value.length > 2) {
            value = '(' + value.substring(0, 2) + ') ' + value.substring(2);
        } else if (value.length > 0) {
            value = '(' + value;
        }
    } else {
        // Telefone celular: (XX) XXXXX-XXXX
        value = '(' + value.substring(0, 2) + ') ' + value.substring(2, 7) + '-' + value.substring(7, 11);
    }

    input.value = value;
}

// Função para aplicar máscara de moeda R$ X.XXX,XX
function applyMoneyMask(input) {
    let value = input.value.replace(/\D/g, ''); // Remove tudo que não é número

    // Se não tiver valor, limpa o campo
    if (value === '') {
        input.value = '';
        return;
    }

    // Converte para número e divide por 100 para ter os centavos
    value = (parseInt(value) / 100).toFixed(2);

    // Formata para o padrão brasileiro
    value = value.replace('.', ',');
    value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');

    input.value = 'R$ ' + value;
}

// Função para extrair valor numérico de uma string com máscara de moeda
function extractMoneyValue(maskedValue) {
    // Remove R$, pontos e troca vírgula por ponto
    const cleanValue = maskedValue.replace(/[R$\s.]/g, '').replace(',', '.');
    return parseFloat(cleanValue) || 0;
}

// Submit do formulário de cadastro
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const mode = document.getElementById('modal-mode').value;
    const nome = document.getElementById('reg-name').value.trim();
    const documento = cleanInput(document.getElementById('reg-document').value);
    const sexo = document.querySelector('input[name="gender"]:checked')?.value;
    const nascimento = document.getElementById('reg-birthdate').value;
    const email = document.getElementById('reg-email').value.trim();
    const telefone = cleanInput(document.getElementById('reg-phone').value);
   

    // Validação básica
    if (!nome) {
        showNotification('Digite o nome do cliente', 'error');
        return;
    }

    if (!telefone) {
        showNotification('Digite o telefone do cliente', 'error');
        return;
    }

    // Preparar dados para API
    const requestData = {
        nome: nome
    };

    if (documento) requestData.cpf = documento;
    if (sexo) requestData.sexo = sexo;
    if (nascimento) requestData.nascimento = formatDateForAPI(nascimento);
    if (email ) requestData.email = email;
    if (telefone) requestData.telefone = formatPhoneForAPI(telefone);

    console.log(`Dados do ${mode === 'edit' ? 'atualização' : 'cadastro'}:`, requestData);

    // Desabilitar botão durante o processo
    const submitBtn = registerForm.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = mode === 'edit' ? 'Atualizando...' : 'Cadastrando...';

    try {
        // Chamar API apropriada de acordo com o modo
        const result = mode === 'edit'
            ? await updateConsumer(requestData)
            : await registerConsumer(requestData);

        if (result.success) {
            showNotification(result.message, 'success');
            closeRegisterModal();

            if (mode === 'create') {
                // Buscar o cliente recém-cadastrado automaticamente
                // Prioriza CPF se tiver, senão usa telefone
                const searchQuery = documento || telefone;

                if (searchQuery) {
                    // Aguardar 1 segundo para dar tempo da API processar o cadastro
                    setTimeout(async () => {
                        console.log('Buscando cliente recém-cadastrado:', searchQuery);

                        // Buscar o cliente
                        const clients = await searchClients(searchQuery);

                        if (clients.length > 0) {
                            // Selecionar o cliente automaticamente
                            selectCustomer(clients[0]);

                            // Preencher o campo de CPF/telefone na tela principal
                            if (documento) {
                                cpfInput.value = formatCPF(documento);
                            } else {
                                cpfInput.value = requestData.telefone;
                            }

                            showNotification('Cliente cadastrado e selecionado! Pronto para pontuar.', 'success');
                        } else {
                            showNotification('Cliente cadastrado! Busque novamente para pontuar.', 'success');
                        }
                    }, 1000);
                }
            } else {
                // Modo de edição - atualizar os dados do cliente selecionado
                if (selectedCustomer) {
                    // Buscar novamente o cliente para pegar os dados atualizados
                    const searchQuery = documento || telefone;

                    setTimeout(async () => {
                        console.log('Buscando dados atualizados do cliente:', searchQuery);

                        const clients = await searchClients(searchQuery);

                        if (clients.length > 0) {
                            selectCustomer(clients[0]);
                            showNotification('Cliente atualizado com sucesso!', 'success');
                        }
                    }, 500);
                }
            }
        } else {
            showNotification(result.message, 'error');
            console.error(`Erro no ${mode === 'edit' ? 'atualização' : 'cadastro'}:`, result);
        }
    } catch (error) {
        showNotification(`Erro ao ${mode === 'edit' ? 'atualizar' : 'cadastrar'} cliente`, 'error');
        console.error('Erro:', error);
    } finally {
        // Restaurar botão
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});

// Botão "Cadastrar e Pontuar"
registerScoreBtn.addEventListener('click', async () => {
    if (!selectedCustomer) {
        showNotification('Selecione um cliente válido', 'error');
        return;
    }

    // Extrair valor numérico da máscara de moeda
    const value = extractMoneyValue(valueInput.value);
    if (!value || value <= 0) {
        showNotification('Digite um valor válido', 'error');
        return;
    }

    // Desabilitar botão durante o processo
    registerScoreBtn.disabled = true;
    registerScoreBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" opacity="0.3"/></svg> Verificando...';

    try {
        // ===== VERIFICAR SE A NOTA JÁ ESTÁ PENDENTE COM OUTRO CPF/TELEFONE =====
        if (currentSaleData && currentSaleData['numero_nota']) {
            const numeroNota = currentSaleData['numero_nota'];
            const cpfTelefone = cleanInput(selectedCustomer.cpf || selectedCustomer.telefone || selectedCustomer.phone || '');

            console.log('🔍 Verificando pendências para nota:', numeroNota, 'CPF/Tel:', cpfTelefone);

            const checkResponse = await fetch(`${API_CONFIG.baseUrl}/sql/check-nota-pendente`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    numero_nota: numeroNota,
                    cpf_telefone: cpfTelefone
                })
            });

            const checkData = await checkResponse.json();
            console.log('📊 Resultado verificação:', checkData);

            // Se tem conflito (nota pendente para OUTRO cliente)
            if (checkData.success && checkData.conflito) {
                // Mostrar modal de conflito
                const confirmou = await mostrarModalConflito(checkData.nota_pendente);

                if (!confirmou) {
                    // Usuário cancelou
                    showNotification('Pontuação cancelada pelo usuário', 'info');
                    registerScoreBtn.disabled = false;
                    registerScoreBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2v16M2 10h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Cadastrar e Pontuar';
                    return;
                }

                // Usuário confirmou - excluir pendente anterior
                console.log('✅ Usuário confirmou - excluindo pendente anterior');
                await fetch(`${API_CONFIG.baseUrl}/sql/confirmar-substituir-pendente`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ numero_nota: numeroNota })
                });
            }
        }
        // ===== FIM DA VERIFICAÇÃO =====

        // Atualizar texto do botão
        registerScoreBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" opacity="0.3"/></svg> Pontuando...';

        // Pegar número da nota fiscal do campo (pode ser editado pelo usuário)
        const numeroNotaFiscal = notaFiscalInput.value.trim();

        // Chamar API para pontuar, enviando o número da nota fiscal no parâmetro verificador
        const result = await addPointsToCustomer(selectedCustomer, value, currentSaleData['numero_nota'], {
            verificador: numeroNotaFiscal
        });

        if (result.success) {
            // Guardar saldo anterior para calcular pontos ganhos
            const previousPoints = selectedCustomer.points;

            // Atualizar com dados da API de pontuação
            // A API retorna: saldo, cashback, pontos_expirar
            if (result.data.saldo !== undefined) {
                selectedCustomer.points = result.data.saldo;
            }

            if (result.data.pontos_expirar !== undefined) {
                selectedCustomer.pointsToExpire = result.data.pontos_expirar;
            }

            // Calcular pontos ganhos
            const pointsEarned = selectedCustomer.points - previousPoints;

            // SALVAR NOTA COMO USADA (se houver dados da venda)
            if (currentSaleData) {
                // Encontrar número da nota
                let numeroNota = null;
                for (const key in currentSaleData) {
                    if (key.toLowerCase().includes('numero') || key.toLowerCase().includes('nota')) {
                        numeroNota = currentSaleData[key];
                        break;
                    }
                }

                if (numeroNota) {
                    // Pegar CPF ou telefone do cliente
                    const cpfTelefone = cleanInput(selectedCustomer.cpf || selectedCustomer.telefone || selectedCustomer.phone || '');

                    // Salvar nota como usada
                    await saveNotaUsada(numeroNota, value, cpfTelefone);

                    // Marcar pontuação pendente como processada (se existir)
                    try {
                        await fetch(`${API_CONFIG.baseUrl}/sql/marcar-pendente-processada`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                numero_nota: numeroNota,
                                cpf_telefone: cpfTelefone
                            })
                        });
                        console.log(`✅ Pendência removida (se existia) para nota ${numeroNota}`);

                        // Atualizar contador de pendentes
                        setTimeout(() => atualizarContadorPendentes(), 500);
                    } catch (error) {
                        console.warn('Erro ao marcar pendente como processada:', error);
                    }

                    // Limpar dados da venda atual
                    currentSaleData = null;
                    lastFetchedValue = null; // Resetar controle de valor

                    console.log(`✅ Nota ${numeroNota} salva como usada. Aguardando nova venda no PDV.`);
                }
            }

            // Atualizar display no sidebar
            document.getElementById('identified-points').textContent = formatPoints(selectedCustomer.points);

            // Mostrar modal de sucesso
            showSuccessModal({
                purchaseValue: value,
                pointsEarned: pointsEarned > 0 ? pointsEarned : Math.floor(value),
                customerName: selectedCustomer.name,
                currentPoints: selectedCustomer.points,
                currentCashback: selectedCustomer.cashback
            });

            // Limpar valor e nota fiscal
            valueInput.value = '';
            notaFiscalInput.value = '';

            console.log(`Pontuação realizada:`, {
                cliente: selectedCustomer.name,
                cpf: selectedCustomer.cpf,
                valor: value,
                pontosAdicionados: pointsEarned,
                totalPontos: selectedCustomer.points,
                resposta: result.data
            });
        } else {
            // Mostrar erro
            showNotification(result.message, 'error');
            console.error('Erro na pontuação:', result);
        }
    } catch (error) {
        showNotification('Erro ao pontuar cliente', 'error');
        console.error('Erro:', error);
    } finally {
        // Restaurar botão
        registerScoreBtn.disabled = false;
        registerScoreBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2v16M2 10h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Cadastrar e Pontuar';
    }
});

// Formatação automática do CPF no campo de entrada
cpfInput.addEventListener('blur', () => {
    const value = cpfInput.value;
    const cleaned = cleanInput(value);

    if (cleaned.length === 11 && detectInputType(value) === 'cpf') {
        cpfInput.value = formatCPF(cleaned);
    }
});

// Aplicar máscara de data no campo de nascimento
const birthdateInput = document.getElementById('reg-birthdate');
birthdateInput.addEventListener('input', (e) => {
    applyDateMask(e.target);
});

// Aplicar máscara de telefone no campo de telefone
const phoneInput = document.getElementById('reg-phone');
phoneInput.addEventListener('input', (e) => {
    applyPhoneMask(e.target);
});

// Aplicar máscara de moeda no campo de valor da compra
valueInput.addEventListener('input', (e) => {
    applyMoneyMask(e.target);
});

// ==================== SQL SERVER INTEGRATION ====================

// Elementos do DOM para SQL
const sqlConfigModal = document.getElementById('sql-config-modal');
const btnOpenSqlConfig = document.getElementById('btn-open-sql-config');
const closeSqlConfigModalBtn = document.getElementById('close-sql-config-modal');
const sqlConfigForm = document.getElementById('sql-config-form');

// Elementos dos modos de configuração
const modeFields = document.getElementById('mode-fields');
const modeConnectionString = document.getElementById('mode-connection-string');
const fieldsConfig = document.getElementById('fields-config');
const connectionStringConfig = document.getElementById('connection-string-config');
const btnTestSql = document.getElementById('btn-test-sql');

let lastFetchedValue = null; // Armazena o último valor buscado para evitar duplicatas

// Função para alternar entre modos de configuração
function toggleConfigMode() {
    if (modeFields.checked) {
        fieldsConfig.classList.remove('hidden');
        connectionStringConfig.classList.add('hidden');
        // Remover required da string de conexão
        document.getElementById('sql-connection-string').removeAttribute('required');
        // Adicionar required no banco de dados
        document.getElementById('sql-database').setAttribute('required', 'required');
    } else if (modeConnectionString.checked) {
        fieldsConfig.classList.add('hidden');
        connectionStringConfig.classList.remove('hidden');
        // Adicionar required na string de conexão
        document.getElementById('sql-connection-string').setAttribute('required', 'required');
        // Remover required do banco de dados
        document.getElementById('sql-database').removeAttribute('required');
    }
}

// Event listeners para mudança de modo
modeFields.addEventListener('change', toggleConfigMode);
modeConnectionString.addEventListener('change', toggleConfigMode);

// Variável global para armazenar dados da última nota
let currentSaleData = null;

// Função para buscar última venda do SQL Server
async function fetchLastSale() {
    try {
        console.log('🔄 fetchLastSale() chamada - buscando última venda...');
        const response = await fetch(`${API_CONFIG.baseUrl}/sql/last-sale-unused`);
        const result = await response.json();

        if (result.success && result.data.valor) {
            const valor = result.data.valor;
            currentSaleData = result.data.raw; // Armazenar dados completos da venda

            // Verificar se o valor mudou desde a última busca
            if (valor !== lastFetchedValue) {
                lastFetchedValue = valor;

                // Preencher campo de valor automaticamente
                valueInput.value = formatCurrency(valor);

                // Preencher campo de nota fiscal automaticamente
                if (result.numero_nota) {
                    notaFiscalInput.value = result.numero_nota;
                }

                // Habilitar botão de pontuar se tiver cliente selecionado
                if (selectedCustomer) {
                    registerScoreBtn.disabled = false;
                }

                console.log('✅ Última venda não usada buscada:', valor, 'Nota:', result.numero_nota, currentSaleData);
            }
        } else {
            console.log('⚠️ ', result.message || 'Nenhuma nota disponível');
            // Limpar valor se a última nota já foi usada
            if (result.message && result.message.includes('já foi usada')) {
                valueInput.value = '';
                notaFiscalInput.value = '';
                currentSaleData = null;
                lastFetchedValue = null;
                showNotification(result.message, 'error');
            }
        }
    } catch (error) {
        console.error('Erro ao buscar última venda:', error);
    }
}

// Função para salvar nota como usada
async function saveNotaUsada(numero_nota, valor, cpf_telefone) {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/sql/save-nota-usada`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                numero_nota: numero_nota,
                valor: valor,
                cpf_telefone: cpf_telefone
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log(`✅ Nota ${numero_nota} registrada como usada`);
            return true;
        } else {
            console.error('Erro ao salvar nota:', result.message);
            return false;
        }
    } catch (error) {
        console.error('Erro ao salvar nota usada:', error);
        return false;
    }
}

// Event listener simples para quando a janela recebe foco (versão web)
if (!isElectron) {
    window.addEventListener('focus', () => {
        console.log('🔍 [Web] Janela recebeu foco - buscando última venda...');
        fetchLastSale();
    });
    console.log('✅ Event listener de foco habilitado (versão Web)');
}

// Para Electron: o polling inteligente no electron-main.js cuida disso
if (isElectron) {
    console.log('ℹ️  Modo Electron: polling inteligente ativo (busca ao voltar para janela)');
}

// Buscar valor ao carregar a página
window.addEventListener('load', () => {
    console.log('✅ Página carregada, iniciando busca de última venda...');
    fetchLastSale();
    loadSqlConfig();
});



// Função para mostrar modal SQL
function showSqlConfigModal() {
    sqlConfigModal.classList.remove('hidden');
    setTimeout(() => {
        sqlConfigModal.classList.add('show');
    }, 10);
}

// Função para fechar modal SQL
function closeSqlConfigModal() {
    sqlConfigModal.classList.remove('show');
    setTimeout(() => {
        sqlConfigModal.classList.add('hidden');
    }, 300);
}

// Event listeners do modal SQL
btnOpenSqlConfig.addEventListener('click', showSqlConfigModal);
closeSqlConfigModalBtn.addEventListener('click', closeSqlConfigModal);

// Fechar modal ao clicar fora
sqlConfigModal.addEventListener('click', (e) => {
    if (e.target === sqlConfigModal) {
        closeSqlConfigModal();
    }
});

// Testar conexão SQL
btnTestSql.addEventListener('click', async () => {
    const originalText = btnTestSql.textContent;
    btnTestSql.disabled = true;
    btnTestSql.textContent = 'Testando...';

    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/sql/test`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            showNotification(result.message, 'success');
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        showNotification('Erro ao testar conexão', 'error');
        console.error('Erro:', error);
    } finally {
        btnTestSql.disabled = false;
        btnTestSql.textContent = originalText;
    }
});

// Salvar configuração SQL
sqlConfigForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const query = document.getElementById('sql-query').value.trim();
    let configData = { query };

    // Verificar qual modo está selecionado
    if (modeConnectionString.checked) {
        // Modo string de conexão
        const connectionString = document.getElementById('sql-connection-string').value.trim();
        
        if (!connectionString) {
            showNotification('Digite a string de conexão', 'error');
            return;
        }

        configData.mode = 'connectionString';
        configData.connectionString = connectionString;
    } else {
        // Modo campos separados
        const server = document.getElementById('sql-server').value.trim();
        const database = document.getElementById('sql-database').value.trim();
        const user = document.getElementById('sql-user').value.trim();
        const password = document.getElementById('sql-password').value;
        const port = parseInt(document.getElementById('sql-port').value) || 1433;

        if (!database) {
            showNotification('Digite o nome do banco de dados', 'error');
            return;
        }

        configData.mode = 'fields';
        configData.server = server;
        configData.database = database;
        configData.user = user;
        configData.password = password;
        configData.port = port;
    }

    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/sql/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(configData)
        });

        const result = await response.json();

        if (result.success) {
            showNotification(result.message, 'success');
            closeSqlConfigModal();

            // Buscar última venda após salvar config
            setTimeout(() => {
                fetchLastSale();
            }, 1000);
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        showNotification('Erro ao salvar configuração', 'error');
        console.error('Erro:', error);
    }
});

// ==================== MODAL DE CONFLITO DE PONTUAÇÃO PENDENTE ====================

function mostrarModalConflito(notaPendente) {
    console.log('🎨 CHAMOU mostrarModalConflito com:', notaPendente);

    return new Promise((resolve) => {
        const modal = document.getElementById('conflito-modal');
        const btnCancelar = document.getElementById('btn-conflito-cancelar');
        const btnConfirmar = document.getElementById('btn-conflito-confirmar');

        console.log('🎨 Modal encontrado:', modal);
        console.log('🎨 Botão cancelar:', btnCancelar);
        console.log('🎨 Botão confirmar:', btnConfirmar);

        if (!modal) {
            console.error('❌ Modal não encontrado no DOM!');
            resolve(false);
            return;
        }

        // Preencher dados do modal
        document.getElementById('conflito-numero-nota').textContent = notaPendente.numero_nota;
        document.getElementById('conflito-cpf-anterior').textContent = formatCPFDisplay(notaPendente.cpf_telefone_anterior);
        document.getElementById('conflito-valor-anterior').textContent = formatCurrency(notaPendente.valor);

        // Formatar data
        const dataFormatada = new Date(notaPendente.data_criacao).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        document.getElementById('conflito-data-anterior').textContent = dataFormatada;

        // Mostrar modal
        modal.classList.remove('hidden');

        // Forçar reflow para garantir que a animação funcione
        modal.offsetHeight;

        requestAnimationFrame(() => {
            modal.classList.add('show');
            console.log('🎨 Modal ABERTO! Classes:', modal.className);
        });

        // Handler para cancelar
        function handleCancelar() {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
            btnCancelar.removeEventListener('click', handleCancelar);
            btnConfirmar.removeEventListener('click', handleConfirmar);
            resolve(false);
        }

        // Handler para confirmar
        function handleConfirmar() {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
            btnCancelar.removeEventListener('click', handleCancelar);
            btnConfirmar.removeEventListener('click', handleConfirmar);
            resolve(true);
        }

        // Adicionar event listeners
        btnCancelar.addEventListener('click', handleCancelar);
        btnConfirmar.addEventListener('click', handleConfirmar);
    });
}

// Função auxiliar para formatar CPF/telefone para exibição
function formatCPFDisplay(value) {
    if (!value) return '';

    const cleaned = value.replace(/\D/g, '');

    // Telefone com DDD (10 ou 11 dígitos começando com DDD válido)
    if (cleaned.length === 10 || cleaned.length === 11) {
        const ddd = parseInt(cleaned.substring(0, 2));

        // Verificar se é um DDD válido (11-99)
        if (ddd >= 11 && ddd <= 99) {
            // Telefone fixo (10 dígitos)
            if (cleaned.length === 10) {
                return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
            }

            // Telefone celular (11 dígitos) - verificar se o 3º dígito é 9
            if (cleaned.length === 11 && cleaned[2] === '9') {
                return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            }
        }
    }

    // CPF (11 dígitos que NÃO é telefone)
    if (cleaned.length === 11) {
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    // Se for 10 dígitos e não passou no teste de DDD, retorna como está
    return value;
}

// ==================== INDICADOR DE PONTUAÇÕES PENDENTES ====================

// Atualizar contador de pendentes a cada 30 segundos
async function atualizarContadorPendentes() {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/sql/pontuacoes-pendentes`);
        const data = await response.json();

        const indicator = document.getElementById("pendentes-indicator");
        const countElement = document.getElementById("pendentes-count");

        if (data.success && data.count > 0) {
            countElement.textContent = data.count;
            indicator.classList.remove("hidden");
        } else {
            indicator.classList.add("hidden");
        }
    } catch (error) {
        console.error("Erro ao atualizar contador de pendentes:", error);
    }
}

// Iniciar atualização automática
setInterval(atualizarContadorPendentes, 30000); // A cada 30 segundos

// Atualizar ao carregar a página
setTimeout(atualizarContadorPendentes, 2000);

// Clicar no indicador para abrir modal de pendentes
document.getElementById("pendentes-indicator")?.addEventListener("click", async () => {
    await abrirModalPendentes();
});
