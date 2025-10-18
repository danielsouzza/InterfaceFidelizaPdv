const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

// Função para iniciar o servidor Node.js
function startServer() {
    console.log('🚀 Iniciando servidor Node.js...');

    serverProcess = spawn('node', ['server.js'], {
        cwd: __dirname,
        stdio: 'inherit'
    });

    serverProcess.on('error', (err) => {
        console.error('❌ Erro ao iniciar servidor:', err);
    });

    serverProcess.on('exit', (code) => {
        console.log(`⚠️  Servidor encerrado com código ${code}`);
    });
}

// Função para criar a janela principal
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        icon: path.join(__dirname, 'icon.png'), // Adicione um ícone se quiser
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        },
        autoHideMenuBar: true, // Esconde o menu automaticamente
        title: 'Sistema de Fidelidade - PDV'
    });

    // Aguardar 2 segundos para o servidor iniciar
    setTimeout(() => {
        mainWindow.loadURL('http://localhost:3001');
    }, 2000);

    // Abrir DevTools automaticamente (remova em produção)
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Prevenir que links externos abram dentro do Electron
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        require('electron').shell.openExternal(url);
        return { action: 'deny' };
    });
}

// Quando o Electron estiver pronto
app.whenReady().then(() => {
    // Iniciar servidor primeiro
    startServer();

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
