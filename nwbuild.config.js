module.exports = {
    // Opções de build
    options: {
        // Plataforma
        platforms: ['win64'],

        // Versão do NW.js
        version: 'latest',

        // Diretório de saída
        buildDir: './dist',

        // Ativar cache
        cacheDir: './nw-cache',

        // Tipo de build
        flavor: 'normal', // 'normal' ou 'sdk' (sdk para debug)

        // Arquivos a incluir
        files: [
            '**/*',
            '!node_modules/electron/**',
            '!node_modules/electron-builder/**',
            '!node_modules/nw-builder/**',
            '!node_modules/nodemon/**',
            '!dist/**',
            '!nw-cache/**',
            '!.git/**',
            '!BUILD_INSTRUCTIONS.md',
            '!.gitignore',
            '!electron-main.js', // Não incluir arquivo do Electron
            '!*.md',
            '.env.example',
            'GUIA_INSTALACAO.md',
            'create-notas-usadas.sql',
            'criar_tabela_pontuacao_pendente.sql'
        ],

        // Manifesto do aplicativo
        appName: 'Sistema Fidelidade PDV',
        appVersion: '1.0.0',

        // Windows específico
        winIco: './icon.ico', // Se tiver um ícone

        // Compressão
        zip: false // Não zipar (criar instalador depois)
    }
};
