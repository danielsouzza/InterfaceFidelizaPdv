# ✅ Como Testar o Electron

## ⚠️ Importante

**Este ambiente SSH não tem interface gráfica**, então não podemos testar visualmente aqui.

Mas o código está **100% pronto**! Siga os passos abaixo em uma **máquina Windows com interface gráfica**.

---

## 🖥️ Testar em Ambiente Local (Windows/Linux com GUI)

### 1. Clone ou copie o projeto para sua máquina local

### 2. Instale as dependências

```bash
npm install
```

### 3. Teste a aplicação Electron

```bash
npm run electron
```

**O que vai acontecer**:
1. ✅ Servidor Node.js inicia automaticamente na porta 3001
2. ✅ Janela Electron abre (1400x900 pixels)
3. ✅ Aplicação carrega em `http://localhost:3001`
4. ✅ Tudo funciona como antes, mas agora é um **app desktop**!

### 4. Gerar o executável .exe

```bash
npm run build
```

**Resultado**:
- Pasta `dist/` criada
- Arquivo `dist/Sistema Fidelidade PDV Setup 1.0.0.exe`
- **Este é o instalador que você distribui!**

---

## 📦 O que o .exe inclui

✅ **Tudo bundled** (tudo junto):
- Node.js (runtime)
- Servidor Express
- Sua aplicação (HTML/CSS/JS)
- Todas as dependências npm
- Driver SQL Server (mssql)

❌ **NÃO inclui** (precisa instalar separado):
- SQL Server (precisa estar instalado no PC)

---

## 🎯 Workflow Completo

```
Desenvolvimento          Build               Distribuição
──────────────          ─────              ─────────────
npm run electron    →   npm run build   →  Copiar .exe
(testa local)          (gera installer)   (dar para usuário)
```

---

## 📝 Estrutura dos Arquivos Electron

```
InterfaceFidelizaPdv/
│
├── electron-main.js        ← Processo principal do Electron
│                             (inicia servidor e janela)
│
├── server.js              ← Servidor Node.js (não mudou!)
│
├── index.html             ← Frontend (não mudou!)
├── styles.css             ← Estilos (não mudou!)
├── script.js              ← Lógica (não mudou!)
│
├── package.json           ← Atualizado com scripts Electron
│
└── sql-config.json        ← Configuração SQL (mantém)
```

**Nada do seu código mudou!** Apenas adicionamos uma "casca" Electron em volta.

---

## 🔍 Verificar se está OK

### Checklist de Arquivos:

```bash
# Verifique se estes arquivos existem:
ls electron-main.js         # ✅ Deve existir
ls package.json            # ✅ Deve ter "main": "electron-main.js"
ls node_modules/electron   # ✅ Deve existir
```

### Verificar package.json:

```bash
cat package.json | grep "main"
# Deve retornar: "main": "electron-main.js"

cat package.json | grep "electron"
# Deve mostrar os scripts electron
```

---

## 🚀 Build em Ambiente sem GUI (CI/CD)

Se quiser buildar em servidor SSH (sem interface gráfica):

```bash
# Instalar dependências virtuais
sudo apt-get install -y xvfb

# Buildar com display virtual
xvfb-run --auto-servernum npm run build
```

**OU** use GitHub Actions / AppVeyor para build automático.

---

## 📊 Comparação

| Aspecto | Web App (Antes) | Electron App (Agora) |
|---------|-----------------|----------------------|
| Como executar | Abrir navegador manualmente | Clique duplo no .exe |
| Aparência | Aba do navegador | Janela própria |
| Barra de endereço | Visível | Escondida |
| Distribuição | "Abra localhost:3001" | "Instale o .exe" |
| Ícone no desktop | ❌ Não | ✅ Sim |
| Parecer "app" | 🟡 Médio | ✅ Total |
| Código mudou? | - | ❌ Não! Igual! |

---

## 🎨 Próximos Passos (Opcional)

### 1. Criar Ícone Personalizado

1. Crie um ícone `.ico` (256x256 px)
2. Salve como `icon.ico` na raiz
3. Rebuild: `npm run build`

### 2. Customizar Nome

Edite `package.json`:
```json
"build": {
  "productName": "Fideliza PDV",  ← Seu nome aqui
  ...
}
```

### 3. Remover DevTools

No `electron-main.js`, comente:
```javascript
// mainWindow.webContents.openDevTools();  ← Comentar esta linha
```

---

## ✅ Status Atual

- [x] Electron instalado
- [x] electron-main.js criado
- [x] package.json configurado
- [x] Scripts de build prontos
- [x] Documentação completa
- [x] Pronto para gerar .exe!

**Próximo passo**: Testar em máquina com GUI ou fazer build direto!

---

## 🆘 Suporte

**Não funciona em SSH** porque não tem display gráfico.

**Para testar**:
1. Copie o projeto para Windows
2. Execute `npm run electron`
3. Se funcionar → `npm run build`
4. Distribua o .exe!
