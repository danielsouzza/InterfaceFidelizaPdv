const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let serverProcess;

// Verificar se está em desenvolvimento ou produção
const isDev = !app.isPackaged;

// Função para iniciar o servidor Node.js usando o Node.js do Electron
function startServer() {
    console.log('🚀 Iniciando servidor Node.js...');
    console.log('📂 Diretório:', __dirname);
    console.log('📂 Resources path:', process.resourcesPath);
    console.log('🔧 Modo:', isDev ? 'Desenvolvimento' : 'Produção');
    console.log('🔧 App packed:', app.isPackaged);

    // Caminho para o server.js
    const serverPath = isDev
        ? path.join(__dirname, 'server.js')
        : path.join(process.resourcesPath, 'app.asar', 'server.js');

    console.log('📍 Server path:', serverPath);

    // Usar fork para iniciar o servidor (usa o Node.js do Electron)
    serverProcess = fork(serverPath, [], {
        cwd: isDev ? __dirname : process.resourcesPath,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        env: {
            ...process.env,
            NODE_ENV: isDev ? 'development' : 'production',
            ELECTRON_RUN_AS_NODE: '1'
        }
    });

    serverProcess.stdout.on('data', (data) => {
        console.log(`[Server] ${data.toString().trim()}`);
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`[Server Error] ${data.toString().trim()}`);
    });

    serverProcess.on('message', (msg) => {
        console.log('[Server Message]', msg);
    });

    serverProcess.on('error', (err) => {
        console.error('❌ Erro ao iniciar servidor:', err);
    });

    serverProcess.on('exit', (code) => {
        console.log(`⚠️  Servidor encerrado com código ${code}`);
    });

    return new Promise((resolve) => {
        // Aguardar servidor estar pronto
        setTimeout(resolve, 2000);
    });
}

// Função para criar a janela principal
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 600,  // Reduzido para permitir redimensionamento menor
        minHeight: 400, // Reduzido para permitir redimensionamento menor
        icon: path.join(__dirname, 'icon.png'), // Adicione um ícone se quiser
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true,
            backgroundThrottling: false // IMPORTANTE: Evita throttling quando a janela perde foco
        },
        autoHideMenuBar: true, // Esconde o menu automaticamente
        title: 'Sistema de Fidelidade - PDV',
        show: false, // Não mostrar até estar pronto
        skipTaskbar: false, // Garantir que apareça na barra de tarefas
        alwaysOnTop: false // Não ficar sempre no topo
    });

    // Mostrar janela quando estiver pronta
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        console.log('✅ Janela pronta e visível');
    });

    // Aguardar o servidor iniciar e então carregar a URL
    let attempts = 0;
    const maxAttempts = 20;

    const tryLoadUrl = () => {
        attempts++;
        console.log(`🔄 Tentativa ${attempts}/${maxAttempts} de carregar URL...`);

        mainWindow.loadURL('http://localhost:3001')
            .then(() => {
                console.log('✅ URL carregada com sucesso!');
            })
            .catch((err) => {
                console.error(`❌ Erro ao carregar URL (tentativa ${attempts}):`, err.message);

                if (attempts < maxAttempts) {
                    setTimeout(tryLoadUrl, 1000);
                } else {
                    console.error('❌ Falha ao carregar aplicação após múltiplas tentativas');
                    // Mostrar página de erro
                    mainWindow.loadURL(`data:text/html,
                        <html>
                            <body style="font-family: Arial; padding: 40px; text-align: center;">
                                <h1>❌ Erro ao Iniciar Servidor</h1>
                                <p>Não foi possível conectar ao servidor local.</p>
                                <p>Por favor, feche e abra o aplicativo novamente.</p>
                                <button onclick="window.location.reload()">Tentar Novamente</button>
                            </body>
                        </html>
                    `);
                }
            });
    };

    // Aguardar 3 segundos para o servidor iniciar
    setTimeout(tryLoadUrl, 3000);

    // Abrir DevTools em desenvolvimento
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Prevenir que links externos abram dentro do Electron
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        require('electron').shell.openExternal(url);
        return { action: 'deny' };
    });

    // Função auxiliar para buscar última venda
    const triggerFetchLastSale = (eventName) => {
        console.log(`🔍 [${eventName}] Buscando última venda...`);

        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
            mainWindow.webContents.executeJavaScript(`
                if (typeof fetchLastSale === 'function') {
                    console.log('🔍 Electron [${eventName}] - executando fetchLastSale()');
                    fetchLastSale();
                } else {
                    console.error('❌ fetchLastSale não está definida!');
                }
            `).catch(err => {
                console.error(`❌ Erro ao executar fetchLastSale [${eventName}]:`, err.message);
            });
        }
    };

    // Variável para controlar último evento de foco (evitar duplicatas)
    let lastFocusTime = 0;
    const DEBOUNCE_TIME = 500; // 500ms entre eventos

    const handleFocusEvent = (eventName) => {
        const now = Date.now();
        if (now - lastFocusTime > DEBOUNCE_TIME) {
            lastFocusTime = now;
            triggerFetchLastSale(eventName);
        } else {
            console.log(`⏭️  [${eventName}] ignorado (debounce)`);
        }
    };

    // MÚLTIPLOS EVENTOS para garantir que funcione quando a janela receber foco

    // 1. Evento de foco da janela (principal)
    mainWindow.on('focus', () => {
        handleFocusEvent('focus');
    });

    // 2. Evento quando janela é mostrada
    mainWindow.on('show', () => {
        handleFocusEvent('show');
    });

    // 3. Evento quando janela é restaurada de minimizada
    mainWindow.on('restore', () => {
        handleFocusEvent('restore');
    });

    // 4. Evento de visibilidade do documento (Page Visibility API)
    // Este é o MAIS CONFIÁVEL em modo produção
    mainWindow.webContents.on('did-finish-load', () => {
        // Injetar listener de visibilidade na página
        mainWindow.webContents.executeJavaScript(`
            // API de Visibilidade do Documento - funciona melhor em produção
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    console.log('📄 [visibilitychange] Documento ficou visível - buscando última venda...');
                    if (typeof fetchLastSale === 'function') {
                        fetchLastSale();
                    }
                }
            });
            console.log('✅ Listener de visibilidade do documento instalado');
        `).catch(err => {
            console.error('Erro ao injetar listener de visibilidade:', err);
        });
    });

    // 5. Evento quando a janela se torna ativa (específico do Windows)
    app.on('browser-window-focus', (event, window) => {
        if (window === mainWindow) {
            handleFocusEvent('browser-window-focus');
        }
    });

    console.log('✅ Eventos de foco configurados (focus, show, restore, visibilitychange, browser-window-focus)');
}

// Quando o Electron estiver pronto
app.whenReady().then(async () => {
    // Iniciar servidor primeiro e aguardar
    await startServer();

    // Criar janela depois
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quando todas as janelas forem fechadas
app.on('window-all-closed', () => {
    // Encerrar servidor
    if (serverProcess) {
        console.log('🛑 Encerrando servidor...');
        serverProcess.kill();
    }

    // Encerrar aplicação
    app.quit();
});

// Limpar ao sair
app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});

// Tratamento de erros
process.on('uncaughtException', (error) => {
    console.error('❌ Erro não capturado:', error);
});
