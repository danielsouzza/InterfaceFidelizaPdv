# Instruções de Build do Electron

## Problema Resolvido
O aplicativo ficava com tela branca após o build porque o servidor Node.js não estava sendo iniciado corretamente no ambiente empacotado.

## Mudanças Implementadas

### 1. electron-main.js
- Usa `fork` ao invés de `spawn` para iniciar o servidor (usa o Node.js embutido do Electron)
- Detecta automaticamente se está em dev ou produção (`app.isPackaged`)
- Tenta carregar a URL com retry automático (até 20 tentativas)
- Mostra página de erro se falhar
- Logs detalhados para debug

### 2. package.json
- Configuração simplificada do electron-builder
- Remove arquivos desnecessários do build (.git, .md, node_modules de dev)
- Usa `asarUnpack` apenas para arquivos .node (binários nativos)

## Como Testar

### Desenvolvimento (sem build)
```bash
# Terminal 1: Iniciar servidor
npm start

# Terminal 2: Iniciar Electron
npm run electron
```

### Build para Windows
```bash
# Build completo (cria instalador)
npm run build

# Build rápido (apenas pasta, sem instalador)
npm run build:dir
```

### Build para Linux
```bash
npm run build:linux        # Build completo
npm run build:linux:dir    # Build rápido
```

## Onde Encontrar o Build

Após o build, os arquivos estarão em:
- **Windows**: `dist/Sistema Fidelidade PDV Setup X.X.X.exe`
- **Linux**: `dist/Sistema Fidelidade PDV-X.X.X.AppImage` ou `.deb`

## Configuração Necessária

### Antes de Instalar o .exe

O aplicativo precisa do arquivo `.env` para funcionar. Crie o arquivo `.env` na pasta onde o aplicativo será instalado (geralmente `C:\Users\[Usuario]\AppData\Local\Programs\sistema-fidelidade-pdv\`) com o seguinte conteúdo:

```env
# Banco do PDV
DB_PDV_SERVER=localhost
DB_PDV_DATABASE=NomeDoBanco
DB_PDV_USER=usuario
DB_PDV_PASSWORD=senha
DB_PDV_PORT=1433

# Banco da Aplicação
DB_APP_SERVER=localhost
DB_APP_DATABASE=NomeDoBanco
DB_APP_USER=usuario
DB_APP_PASSWORD=senha
DB_APP_PORT=1433

# API Fidelimax
FIDELIMAX_BASE_URL=https://api.fidelimax.com.br/api/Integracao
FIDELIMAX_AUTH_TOKEN=seu-token-aqui

# Servidor
PORT=3001
INTERVALO_REPROCESSAMENTO=5

# Query SQL
QUERY_LAST_SALE=SELECT TOP 1 numero_nota, valor FROM Notas ORDER BY data_nota DESC, id DESC
```

## Troubleshooting

### Tela Branca Após Build
1. Abra o console do Electron: Comente a linha `autoHideMenuBar: true` no `electron-main.js`
2. Pressione `Ctrl+Shift+I` para abrir o DevTools
3. Veja os erros no console

### Servidor Não Inicia
1. Verifique os logs no console
2. Certifique-se de que a porta 3001 está livre
3. Verifique se o arquivo `.env` está no diretório correto

### Erro ao Conectar Banco de Dados
1. Verifique as credenciais no `.env`
2. Certifique-se de que o SQL Server está rodando
3. Teste a conexão manualmente

## Debug em Produção

Para habilitar DevTools em produção, edite o `electron-main.js`:

```javascript
// Linha 113 - Remova o if(isDev)
mainWindow.webContents.openDevTools(); // Sempre abrir
```

Depois faça o build novamente.
