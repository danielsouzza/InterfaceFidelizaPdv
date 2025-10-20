const { spawn, exec } = require('child_process');
const path = require('path');
const http = require('http');

console.log('========================================');
console.log('   Sistema de Fidelidade - PDV');
console.log('========================================\n');

// Função para verificar se servidor já está rodando
function checkServerRunning() {
    return new Promise((resolve) => {
        const req = http.get('http://localhost:3001', (res) => {
            resolve(true);
        });

        req.on('error', () => {
            resolve(false);
        });

        req.setTimeout(1000, () => {
            req.destroy();
            resolve(false);
        });
    });
}

// Função principal
async function start() {
    const isRunning = await checkServerRunning();

    if (isRunning) {
        console.log('⚠️  Servidor já está rodando!');
        console.log('🌐 Abrindo navegador...\n');
        openBrowser();
        return;
    }

    // Iniciar servidor
    console.log('🚀 Iniciando servidor...');
    const serverPath = path.join(__dirname, 'server.js');
    const serverProcess = spawn('node', [serverPath], {
        cwd: __dirname,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (data) => {
        console.log(data.toString().trim());
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(data.toString().trim());
    });

    serverProcess.on('error', (err) => {
        console.error('❌ Erro ao iniciar servidor:', err);
        process.exit(1);
    });

    // Aguardar servidor iniciar e abrir navegador
    setTimeout(() => {
        openBrowser();
    }, 3000);

    // Limpar ao fechar
    process.on('SIGINT', () => {
        console.log('\n🛑 Encerrando servidor...');
        serverProcess.kill();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        serverProcess.kill();
        process.exit(0);
    });

    // Windows: Fechar ao fechar a janela
    if (process.platform === 'win32') {
        const readline = require('readline');
        readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        process.stdin.on('end', () => {
            serverProcess.kill();
            process.exit(0);
        });
    }
}

function openBrowser() {
    console.log('🌐 Abrindo navegador...\n');

    const url = 'http://localhost:3001';

    // Comando para abrir navegador no Windows (modo APP sem barra de endereço)
    let command;
    if (process.platform === 'win32') {
        // Tentar abrir com Chrome em modo APP (sem barra de endereço)
        command = `start chrome --app=${url} --window-size=1400,900`;

        exec(command, (err) => {
            if (err) {
                // Se Chrome falhar, usar navegador padrão
                exec(`start ${url}`, (err2) => {
                    if (err2) {
                        console.error('❌ Erro ao abrir navegador:', err2);
                        console.log(`\n📌 Abra manualmente: ${url}\n`);
                    }
                });
            }
        });
    } else if (process.platform === 'darwin') {
        command = `open ${url}`;
        exec(command);
    } else {
        command = `xdg-open ${url}`;
        exec(command);
    }

    console.log('✅ Sistema iniciado com sucesso!');
    console.log(`📌 Acesse: ${url}`);
    console.log('\n💡 Use o botão "Atualizar (F5)" ou pressione F5 para buscar nota');
    console.log('⚠️  NÃO FECHE esta janela!\n');
    console.log('Para encerrar, feche esta janela ou pressione Ctrl+C\n');
}

// Iniciar
start();
