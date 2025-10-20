# 📦 Guia de Instalação - Sistema Fidelidade PDV

## 📋 Requisitos do Sistema

### Sistema Operacional
- Windows 10 ou superior (64-bit)
- Linux (Ubuntu 20.04+, Debian, etc)

### Software Necessário
- ✅ **SQL Server** (2016 ou superior)
  - Pode ser SQL Server Express (gratuito)
  - OU acesso a um SQL Server remoto
- ✅ **Porta 3001** disponível (usada pelo servidor local)
- ✅ **Acesso à internet** (para API Fidelimax)

---

## 🚀 Instalação Passo a Passo

### 1️⃣ Instalar o Aplicativo

#### Windows
1. Baixe o instalador: `Sistema Fidelidade PDV Setup X.X.X.exe`
2. Execute o instalador
3. Escolha a pasta de instalação (padrão: `C:\Users\[Usuario]\AppData\Local\Programs\sistema-fidelidade-pdv\`)
4. Aguarde a instalação concluir

#### Linux
```bash
# AppImage (não precisa instalar)
chmod +x Sistema-Fidelidade-PDV-X.X.X.AppImage
./Sistema-Fidelidade-PDV-X.X.X.AppImage

# .deb (Ubuntu/Debian)
sudo dpkg -i sistema-fidelidade-pdv_X.X.X_amd64.deb
```

---

### 2️⃣ Criar Tabelas no Banco de Dados

Execute os scripts SQL no seu banco de dados:

#### Script 1: Tabela de Notas Usadas
```sql
-- Arquivo: create-notas-usadas.sql
USE [SEU_BANCO];
GO

CREATE TABLE NotasUsadas (
    id INT IDENTITY(1,1) PRIMARY KEY,
    numero_nota VARCHAR(50) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    cpf_telefone VARCHAR(20) NOT NULL,
    data_uso DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_NotaUsada UNIQUE (numero_nota, cpf_telefone)
);

CREATE INDEX IX_NotasUsadas_NumeroNota ON NotasUsadas(numero_nota);
GO
```

#### Script 2: Tabela de Pontuações Pendentes
```sql
-- Arquivo: criar_tabela_pontuacao_pendente.sql
USE [SEU_BANCO];
GO

CREATE TABLE PontuacaoPendente (
    id INT IDENTITY(1,1) PRIMARY KEY,
    numero_nota VARCHAR(50) NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    cpf_telefone VARCHAR(20) NOT NULL,
    erro_mensagem VARCHAR(500) NULL,
    dados_completos NVARCHAR(MAX) NOT NULL,
    tentativas INT DEFAULT 0,
    processado BIT DEFAULT 0,
    data_criacao DATETIME DEFAULT GETDATE(),
    ultima_tentativa DATETIME NULL
);

CREATE INDEX IX_PontuacaoPendente_Processado ON PontuacaoPendente(processado);
CREATE INDEX IX_PontuacaoPendente_NumeroNota ON PontuacaoPendente(numero_nota);
CREATE INDEX IX_PontuacaoPendente_DataCriacao ON PontuacaoPendente(data_criacao);
GO
```

---

### 3️⃣ Configurar Credenciais

#### Windows
1. Navegue até a pasta de instalação:
   ```
   C:\Users\[SeuUsuario]\AppData\Local\Programs\sistema-fidelidade-pdv\
   ```

2. Copie o arquivo `.env.example` e renomeie para `.env`

3. Edite o arquivo `.env` com as suas credenciais:

```env
# Banco do PDV (onde busca as notas)
DB_PDV_SERVER=localhost
DB_PDV_DATABASE=SeuBanco
DB_PDV_USER=sa
DB_PDV_PASSWORD=SuaSenha123
DB_PDV_PORT=1433

# Banco da Aplicação (NotasUsadas e PontuacaoPendente)
DB_APP_SERVER=localhost
DB_APP_DATABASE=SeuBanco
DB_APP_USER=sa
DB_APP_PASSWORD=SuaSenha123
DB_APP_PORT=1433

# API Fidelimax
FIDELIMAX_BASE_URL=https://api.fidelimax.com.br/api/Integracao
FIDELIMAX_AUTH_TOKEN=seu-token-aqui

# Configurações
PORT=3001
INTERVALO_REPROCESSAMENTO=5
QUERY_LAST_SALE=SELECT TOP 1 numero_nota, valor FROM Notas ORDER BY data_nota DESC, id DESC
```

#### Linux
1. Navegue até a pasta do aplicativo:
   ```bash
   cd ~/.config/sistema-fidelidade-pdv/
   ```

2. Crie o arquivo `.env` (mesmo conteúdo acima)

---

### 4️⃣ Executar o Aplicativo

#### Windows
- **Pelo Menu Iniciar**: Procure por "Sistema Fidelidade PDV"
- **Pelo Atalho**: Duplo clique no ícone da área de trabalho

#### Linux
```bash
sistema-fidelidade-pdv
# ou
./Sistema-Fidelidade-PDV-X.X.X.AppImage
```

---

## ✅ Verificar Instalação

Quando o aplicativo abrir:
1. ✅ Tela deve carregar (não ficar branca)
2. ✅ Deve conseguir buscar clientes
3. ✅ Deve conseguir pontuar

Se tudo funcionar, instalação bem-sucedida! 🎉

---

## 🔧 Troubleshooting

### ❌ Tela Branca
**Causa**: Servidor não iniciou
**Solução**:
1. Verifique se a porta 3001 está livre
2. Execute `netstat -ano | findstr :3001` (Windows)
3. Mate o processo que está usando: `taskkill /PID [numero] /F`

### ❌ Erro ao Conectar Banco
**Causa**: Credenciais incorretas no `.env`
**Solução**:
1. Verifique servidor, usuário e senha
2. Teste a conexão com SQL Server Management Studio
3. Certifique-se de que o SQL Server está rodando

### ❌ "Nota já foi usada"
**Causa**: Tabela NotasUsadas não foi criada
**Solução**: Execute o Script 1 (create-notas-usadas.sql)

### ❌ Pendentes não salvam
**Causa**: Tabela PontuacaoPendente não foi criada
**Solução**: Execute o Script 2 (criar_tabela_pontuacao_pendente.sql)

### 🔍 Ver Logs de Erro

**Windows**: Pressione `Ctrl+Shift+I` para abrir o DevTools

---

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs no console (Ctrl+Shift+I)
2. Confirme que todas as tabelas foram criadas
3. Teste a conexão com o banco manualmente
4. Verifique se o token da API Fidelimax está correto

---

## 🔄 Atualização

Para atualizar:
1. Desinstale a versão antiga
2. Instale a nova versão
3. **NÃO DELETE** o arquivo `.env` (suas credenciais)
4. Execute novamente

---

## 📝 Notas Importantes

- ⚠️ **Backup do .env**: Salve suas credenciais em local seguro
- ⚠️ **Firewall**: Libere a porta 3001 se necessário
- ⚠️ **SQL Server**: Deve estar sempre rodando quando usar o app
- ⚠️ **Token API**: Não compartilhe seu token com terceiros
