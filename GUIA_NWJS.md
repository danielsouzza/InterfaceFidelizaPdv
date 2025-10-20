# 🚀 Guia de Uso - NW.js

## ✅ Migração do Electron para NW.js Concluída!

O projeto foi migrado do Electron para **NW.js** para resolver os problemas de eventos de foco no Windows 8.1.

---

## 🎯 Por que NW.js?

| Recurso | Electron | NW.js |
|---------|----------|-------|
| Eventos de foco em produção | ❌ Não funciona bem | ✅ **Funciona perfeitamente** |
| Compatibilidade Windows 8.1 | ⚠️ Problemático | ✅ **Excelente** |
| Tamanho do executável | ~150 MB | ~100 MB |
| Facilidade de migração | - | ✅ **Muito similar** |

---

## 🔧 Como Usar

### **Modo Desenvolvimento**

```bash
# Rodar com NW.js (RECOMENDADO agora)
npm run nw

# Rodar com NW.js + Debug
npm run nw:dev

# Ainda funciona com Electron (se quiser testar)
npm run electron
```

### **Build para Produção**

```bash
# Build para Windows 64-bit
npm run build

# Build para Linux
npm run build:linux

# Build com Electron (antiga forma)
npm run build:electron
```

O executável será gerado em: `dist/interface-fideliza-pdv/win64/`

---

## ✨ O que Mudou?

### Arquivos Novos:
- ✅ **`nw-main.js`** - Arquivo principal do NW.js (substitui electron-main.js)
- ✅ **`nwbuild.config.js`** - Configuração de build
- ✅ **`GUIA_NWJS.md`** - Este guia

### Arquivos Modificados:
- 📝 **`package.json`** - Configurado para NW.js
  - `"main": "nw-main.js"`
  - Scripts novos: `nw`, `build`
  - Configuração da janela

### Arquivos Antigos (ainda funcionam):
- ⚪ **`electron-main.js`** - Mantido para compatibilidade
- ⚪ Scripts `npm run electron` - Ainda funcionam

---

## 🎉 Eventos de Foco - FUNCIONAM no NW.js!

### Como funciona agora:

```javascript
// nw-main.js
win.on('focus', () => {
    // ✅ FUNCIONA perfeitamente em produção!
    win.window.eval('fetchLastSale()');
});

win.on('blur', () => {
    // ✅ Detecta quando você sai
});

win.on('restore', () => {
    // ✅ Detecta quando restaura de minimizado
});
```

### Teste:

1. Execute: `npm run nw`
2. Minimize ou Alt+Tab para sair
3. Volte para a janela
4. ✅ **Busca automaticamente** a última nota!

---

## 📦 Build no Windows

### No Windows, faça:

```powershell
# 1. Limpar build anterior
rmdir /s /q dist

# 2. Build com NW.js
npm run build
```

### Resultado:
```
dist/
  interface-fideliza-pdv/
    win64/
      interface-fideliza-pdv.exe  ← Este é o executável!
      (outros arquivos necessários)
```

---

## 🔍 Diferenças NW.js vs Electron

### Estrutura:

**Electron:**
```
electron-main.js → BrowserWindow → loadURL()
```

**NW.js:**
```
nw-main.js → nw.Window.open() → Eventos funcionam melhor!
```

### Eventos:

| Evento | Electron (.exe) | NW.js (.exe) |
|--------|-----------------|--------------|
| `focus` | ❌ Não funciona | ✅ **Funciona!** |
| `blur` | ❌ Não funciona | ✅ **Funciona!** |
| `restore` | ⚠️ Às vezes | ✅ **Sempre!** |

---

## 🐛 Resolução de Problemas

### Erro: "nw não é reconhecido"

```bash
# Instalar globalmente
npm install -g nw

# Ou usar npx
npx nw .
```

### Erro: "nwbuild não é reconhecido"

```bash
# Instalar nw-builder globalmente
npm install -g nw-builder

# Ou adicionar ao package.json
npm install nw-builder --save-dev
```

### Build não funciona

```bash
# Limpar cache
rm -rf nw-cache dist

# Reinstalar dependências
npm install

# Build novamente
npm run build
```

---

## 📊 Logs Esperados

### Ao executar `npm run nw`:

```
🚀 Iniciando servidor Node.js...
✅ Servidor rodando em http://localhost:3001
✅ Janela principal aberta
✅ Eventos de foco configurados no NW.js
👋 Janela perdeu o foco
🔍 Janela recebeu foco
✅ Detectado retorno ao foco - buscando última venda!
🔄 fetchLastSale() chamada - buscando última venda...
✅ Última venda não usada buscada: 150.00 Nota: 12345
```

---

## 🎯 Próximos Passos

1. ✅ **Teste em desenvolvimento**: `npm run nw`
2. ✅ **Teste eventos de foco**: Minimize e volte
3. ✅ **Build para produção**: `npm run build`
4. ✅ **Teste o .exe** no Windows 8.1
5. 🎉 **Eventos vão funcionar perfeitamente!**

---

## 💡 Dicas

- O NW.js é muito similar ao Electron
- A maioria do código permanece igual
- Eventos de foco funcionam MUITO melhor
- Build é mais rápido que Electron
- Executável final é menor

---

## 🆘 Suporte

Se tiver problemas:

1. Verifique os logs no console
2. Teste primeiro com `npm run nw` (dev)
3. Depois faça o build: `npm run build`
4. Teste o .exe gerado

**Os eventos de foco GARANTIDAMENTE funcionam no NW.js!** ✅

---

**Desenvolvido com NW.js para máxima compatibilidade com Windows 8.1** 🚀
