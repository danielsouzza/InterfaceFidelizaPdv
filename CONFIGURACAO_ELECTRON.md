# Configurações do Electron

## Busca Automática de Notas Fiscais

### Como Funciona

O sistema busca a última nota fiscal do PDV **automaticamente e de forma IMEDIATA** quando você volta para a janela. Implementação especial para funcionar tanto em **modo desenvolvimento** quanto em **modo produção (executável .exe)**.

### Eventos que Disparam a Busca

A busca da última nota acontece automaticamente quando você volta para a janela usando **múltiplos eventos** para garantir funcionamento em produção:

#### Modo Desenvolvimento (`npm run electron`) - Todos funcionam:
1. ✅ **`focus`** - Janela recebe foco (Alt+Tab)
2. ✅ **`restore`** - Janela restaurada de minimizada
3. ✅ **`show`** - Janela mostrada
4. ✅ **`visibilitychange`** - Documento fica visível
5. ✅ **`browser-window-focus`** - Janela se torna ativa (Windows)
6. ✅ **Primeiro clique** - Fallback caso eventos não disparem

#### Modo Produção (Executável .exe) - Mais confiáveis:
1. ✅✅ **`visibilitychange`** - **MAIS CONFIÁVEL** (Page Visibility API)
2. ✅✅ **`browser-window-focus`** - Evento nativo do Windows
3. ✅ **Primeiro clique** - Fallback garantido

### Tecnologias Utilizadas

#### 1. Page Visibility API (Mais Confiável em Produção)
```javascript
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        fetchLastSale(); // Busca quando documento fica visível
    }
});
```
**Por que funciona melhor:** A API de Visibilidade do Documento é um padrão web moderno que funciona de forma consistente tanto em desenvolvimento quanto em produção.

#### 2. Múltiplos Event Listeners do Electron
- `mainWindow.on('focus')` - Foco na janela
- `mainWindow.on('restore')` - Janela restaurada
- `app.on('browser-window-focus')` - Evento nativo do sistema operacional

#### 3. Debounce de Eventos
Sistema evita buscas duplicadas quando múltiplos eventos disparam ao mesmo tempo (intervalo de 500ms entre buscas).

#### 4. Configurações Especiais
```javascript
backgroundThrottling: false  // Evita throttling quando perde foco
```

### Logs de Debug

Durante o uso, você pode verificar no console qual evento disparou a busca:

#### Logs em Desenvolvimento (`npm run electron`):
```
🔍 [focus] Buscando última venda...
🔍 [restore] Buscando última venda...
🔍 [browser-window-focus] Buscando última venda...
⏭️  [show] ignorado (debounce)  ← Evitou busca duplicada
```

#### Logs em Produção (Executável .exe):
```
📄 [visibilitychange] Documento ficou visível - buscando última venda...
🔍 [browser-window-focus] Buscando última venda...
⏭️  [focus] ignorado (debounce)  ← Evitou busca duplicada
```

#### Logs Gerais:
```
👋 Janela perdeu o foco - próxima interação buscará última venda
🔄 fetchLastSale() chamada - buscando última venda...
✅ Última venda não usada buscada: 150.00 Nota: 12345
🖱️  Primeiro clique após voltar - buscando última venda...  ← Fallback
```

### Diferenças: Web vs Desktop

| Recurso | Web (Navegador) | Desktop (Electron) |
|---------|----------------|-------------------|
| Busca ao clicar | ✅ Sim | ✅ Sim |
| Busca ao dar foco | ✅ Sim | ✅ Sim |
| Busca ao restaurar | ❌ Não | ✅ Sim |
| Polling automático | ❌ Não | ❌ Não |

### Como Testar o Executável (.exe)

#### Teste Completo:

1. **Faça o build:**
   ```bash
   npm run build
   ```

2. **Execute o .exe** gerado em `dist/`

3. **Teste o evento de foco:**
   - Abra o sistema
   - Minimize ou troque para outro aplicativo (Alt+Tab)
   - **VOLTE** para o sistema (Alt+Tab novamente ou clique no ícone)
   - ✅ Deve buscar automaticamente a última nota!

4. **Teste o primeiro clique (fallback):**
   - Se não buscar automaticamente ao voltar
   - **Clique uma vez** em qualquer lugar da janela
   - ✅ Deve buscar imediatamente!

5. **Verifique que não busca em cliques seguintes:**
   - Continue clicando na janela
   - ❌ **NÃO** deve buscar novamente (evita travamento)
   - ✅ Só busca quando você sair e voltar novamente

### Resolução de Problemas

#### Nota fiscal não atualiza no .exe buildado

**Solução 1: Page Visibility API (principal)**
- O evento `visibilitychange` é o mais confiável em produção
- Deve funcionar automaticamente quando você volta para a janela
- Não precisa fazer nada, é automático!

**Solução 2: Fallback de clique**
- Se por algum motivo o evento automático não disparar
- Basta **clicar uma vez** na janela
- Isso sempre funciona como fallback garantido

**Solução 3: Verificar logs (modo dev)**
Para debug avançado, abra o DevTools:
1. Edite `electron-main.js`:
   ```javascript
   const isDev = true; // Forçar modo desenvolvimento
   ```
2. Reconstrua: `npm run build`
3. Execute o .exe
4. DevTools abrirá automaticamente
5. Verifique os logs no console

#### Como saber qual evento está funcionando?

Verifique os logs:
- `📄 [visibilitychange]` = Page Visibility API ✅✅ (melhor)
- `🔍 [browser-window-focus]` = Evento nativo Windows ✅
- `🖱️ Primeiro clique` = Fallback manual ✅
- `⏭️ ignorado (debounce)` = Evitou busca duplicada ✅

#### Como abrir o DevTools (modo desenvolvimento)

Edite o arquivo `electron-main.js` e mude:

```javascript
const isDev = !app.isPackaged;
```

Para:

```javascript
const isDev = true; // Forçar modo desenvolvimento
```

Em seguida, reconstrua o aplicativo.

## Tamanho da Janela

### Padrão
- Largura: 1400px
- Altura: 900px

### Tamanho Mínimo
- Largura mínima: 600px
- Altura mínima: 400px

Você pode redimensionar a janela livremente até os tamanhos mínimos.
