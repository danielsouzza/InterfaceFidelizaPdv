# 🚀 Guia de Build - Electron

## 📋 Pré-requisitos

- Node.js instalado
- Todas as dependências instaladas (`npm install`)

## 🎯 Como Testar Localmente

Antes de gerar o .exe, teste a aplicação Electron:

```bash
npm run electron
```

Isso vai:
1. Iniciar o servidor Node.js automaticamente
2. Abrir uma janela Electron com a aplicação
3. Tudo funcionando como um app desktop!

## 📦 Gerar Executável (.exe)

### Opção 1: Build Completo (com instalador)

```bash
npm run build
```

Isso vai criar:
- `dist/Sistema Fidelidade PDV Setup 1.0.0.exe` - **Instalador**
- Tamanho: ~150-200 MB
- Tempo: ~5-10 minutos

### Opção 2: Build em Diretório (mais rápido para testar)

```bash
npm run build:dir
```

Isso vai criar:
- `dist/win-unpacked/` - Pasta com a aplicação
- Execute `Sistema Fidelidade PDV.exe` dentro da pasta
- Mais rápido para testar
- Tempo: ~2-3 minutos

## 📂 Estrutura do Build

```
dist/
├── Sistema Fidelidade PDV Setup 1.0.0.exe  ← Instalador (distribuir este)
└── win-unpacked/                           ← Versão portátil
    ├── Sistema Fidelidade PDV.exe
    ├── resources/
    └── ... (arquivos da aplicação)
```

## 🎨 Personalizar Ícone

1. Crie um ícone `.ico` (256x256 pixels recomendado)
2. Salve como `icon.ico` na raiz do projeto
3. Rebuild: `npm run build`

**Ferramentas para criar .ico**:
- Online: https://convertio.co/png-ico/
- GIMP (gratuito)
- Photoshop

## ⚙️ Configurações do Build

Edite `package.json` na seção `"build"`:

```json
"build": {
  "productName": "Seu Nome Aqui",  ← Nome da aplicação
  "appId": "com.suaempresa.app",   ← ID único
  "win": {
    "icon": "icon.ico"              ← Caminho do ícone
  }
}
```

## 🚨 Problemas Comuns

### Erro: "icon.ico not found"

**Solução**: Remova a configuração de ícone do `package.json`:

```json
"win": {
  "target": ["nsis"],
  // Remova a linha: "icon": "icon.ico"
}
```

### Build muito lento

**Solução**: Use `npm run build:dir` para testes rápidos

### Falta de espaço em disco

O build precisa de ~2GB livres temporariamente

## 📝 Distribuição

### Para Instalar em Outro Computador:

1. Copie o arquivo `Sistema Fidelidade PDV Setup 1.0.0.exe`
2. Execute no computador de destino
3. Siga o assistente de instalação
4. Pronto! Atalho criado na área de trabalho

### Versão Portátil (sem instalação):

1. Copie toda a pasta `dist/win-unpacked/`
2. Execute `Sistema Fidelidade PDV.exe`
3. Não precisa instalar!

## 🔄 Atualizar Versão

1. Edite `package.json`:
   ```json
   "version": "1.1.0"  ← Mude aqui
   ```

2. Rebuild:
   ```bash
   npm run build
   ```

3. Novo instalador será gerado com a nova versão

## 💡 Dicas

- ✅ O código da aplicação **NÃO muda** - continua igual
- ✅ Servidor Node.js **inicia automaticamente** quando abre o .exe
- ✅ Tudo **self-contained** - não precisa instalar Node.js no computador cliente
- ✅ SQL Server precisa estar instalado separadamente no PC
- ✅ Configure SQL Server pela própria aplicação (botão roxo)

## 🎯 Comandos Rápidos

| Comando | O que faz |
|---------|-----------|
| `npm run electron` | Testa localmente (desenvolvimento) |
| `npm run build` | Gera instalador .exe completo |
| `npm run build:dir` | Gera versão portátil (mais rápido) |

## 📋 Checklist Antes de Distribuir

- [ ] Testar com `npm run electron`
- [ ] Verificar se SQL Server conecta
- [ ] Testar cadastro e pontuação
- [ ] Gerar build: `npm run build`
- [ ] Testar instalador em outro PC
- [ ] Criar ícone personalizado (opcional)
- [ ] Documentar requisitos (SQL Server, etc)

## 🆘 Suporte

Se tiver problemas:
1. Verifique os logs do console
2. Teste primeiro com `npm run electron`
3. Verifique se todas as dependências estão instaladas
4. Tente `npm run build:dir` antes do build completo
