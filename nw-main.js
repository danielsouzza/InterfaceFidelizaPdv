const { fork } = require('child_process');
const path = require('path');

// Variável global para o processo do servidor
let serverProcess = null;

// Função para iniciar o servidor Node.js
function startServer() {
    console.log('🚀 Iniciando servidor Node.js...');

    const serverPath = path.join(__dirname, 'server.js');
    console.log('📍 Server path:', serverPath);

    // Usar fork para iniciar o servidor
    serverProcess = fork(serverPath, [], {
        cwd: __dirname,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    });

    serverProcess.stdout.on('data', (data) => {
        console.log(`[Server] ${data.toString().trim()}`);
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`[Server Error] ${data.toString().trim()}`);
    });

    serverProcess.on('error', (err) => {
        console.error('❌ Erro ao iniciar servidor:', err);
    });

    serverProcess.on('exit', (code) => {
        console.log(`⚠️  Servidor encerrado com código ${code}`);
    });
}

// Iniciar servidor quando o NW.js carregar
startServer();

// Aguardar servidor estar pronto antes de carregar a página
setTimeout(() => {
    console.log('✅ Servidor deve estar pronto, carregando aplicação...');

    // Carregar a aplicação
    nw.Window.open('http://localhost:3001', {
        title: 'Sistema de Fidelidade - PDV',
        width: 1400,
        height: 900,
        min_width: 600,
        min_height: 400,
        position: 'center',
        show: true,
        frame: true,
        resizable: true,
        focus: true
    }, function(win) {
        console.log('✅ Janela principal aberta');

        // EVENTOS DE FOCO - funcionam MUITO melhor no NW.js!

        let wasBlurred = false;

        // Evento quando a janela perde o foco
        win.on('blur', () => {
            console.log('👋 Janela perdeu o foco');
            wasBlurred = true;
        });

        // Evento quando a janela ganha o foco - FUNCIONA no NW.js!
        win.on('focus', () => {
            console.log('🔍 Janela recebeu foco');

            if (wasBlurred) {
                console.log('✅ Detectado retorno ao foco - buscando última venda!');
                wasBlurred = false;

                // Executar fetchLastSale na página
                win.window.eval(`
                    if (typeof fetchLastSale === 'function') {
                        fetchLastSale();
                    }
                `);
            }
        });

        // Evento quando janela é restaurada
        win.on('restore', () => {
            console.log('🔍 Janela restaurada');

            // Executar fetchLastSale na página
            win.window.eval(`
                if (typeof fetchLastSale === 'function') {
                    fetchLastSale();
                }
            `);
        });

        console.log('✅ Eventos de foco configurados no NW.js');
    });
}, 3000);

// Limpar ao fechar
nw.App.on('quit', () => {
    console.log('🛑 Encerrando servidor...');
    if (serverProcess) {
        serverProcess.kill();
    }
});

// Tratamento de erros
process.on('uncaughtException', (error) => {
    console.error('❌ Erro não capturado:', error);
});
