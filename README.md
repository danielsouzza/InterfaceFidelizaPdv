# Interface Fideliza PDV

Aplicação para pontuar clientes no sistema de fidelidade Fidelimax.

## Instalação

```bash
npm install
```

## Configuração

Edite o arquivo `server.js` e substitua o AuthToken na linha 11:

```javascript
authToken: 'SEU_TOKEN_AQUI'
```

## Como usar

1. Instalar dependências:
```bash
npm install
```

2. Iniciar o servidor:
```bash
npm start
```

3. Abrir no navegador:
```
http://localhost:3000
```

## Funcionalidades

- ✅ Busca de clientes por CPF ou telefone
- ✅ Detecção automática do tipo de entrada (CPF/Telefone)
- ✅ Pontuação de clientes
- ✅ Interface moderna e intuitiva
- ✅ Proxy local para evitar problemas de CORS

## Estrutura

- `index.html` - Interface da aplicação
- `styles.css` - Estilos
- `script.js` - Lógica do frontend
- `server.js` - Servidor Node.js (proxy para API)
