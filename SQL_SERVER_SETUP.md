# Configuração SQL Server - Sistema de Fidelidade PDV

## 📋 Pré-requisitos

1. SQL Server instalado e rodando (pode ser SQL Server Express)
2. Banco de dados do PDV configurado
3. Usuário com permissão de leitura no banco

## 🚀 Como Configurar

### Passo 1: Configurar o SQL Server

1. Clique no **botão flutuante roxo** no canto inferior direito da tela
2. Preencha os dados de conexão:
   - **Servidor**: `localhost` (ou IP do servidor)
   - **Banco de Dados**: Nome do banco do seu PDV
   - **Usuário**: `sa` (ou outro usuário)
   - **Senha**: Senha do usuário SQL
   - **Porta**: `1433` (padrão)

3. **Query SQL**: Personalize a consulta para buscar a última venda:
   ```sql
   SELECT TOP 1 numero_nota, valor_total
   FROM vendas
   ORDER BY data_venda DESC, id DESC
   ```

   **Importante**: A query deve retornar pelo menos um campo numérico com o valor da venda.

### Passo 2: Testar Conexão

1. Clique em **"Testar Conexão"**
2. Se aparecer mensagem de sucesso, está tudo certo!
3. Clique em **"Salvar Configuração"**

## 🎯 Como Funciona

### Busca Automática

A aplicação busca automaticamente o valor da última venda quando:

1. **Página é carregada** - Ao abrir a aplicação
2. **Janela recebe foco** - Toda vez que você voltar para a aplicação

### Fluxo de Trabalho Recomendado

```
1. Cliente faz compra no PDV → Venda registrada no banco
2. Operador volta para a aplicação de fidelidade (dá foco na janela)
3. Sistema busca automaticamente a última venda
4. Valor é preenchido no campo "Valor da Compra"
5. Operador digita CPF/Telefone do cliente
6. Clica em "Cadastrar e Pontuar"
7. Pronto! Cliente pontuado ✅
```

## 🔧 Personalização da Query SQL

### Exemplos de Queries

#### Exemplo 1: Tabela com múltiplas colunas
```sql
SELECT TOP 1
    id_venda,
    valor_total,
    data_hora_venda
FROM vendas
ORDER BY data_hora_venda DESC
```

#### Exemplo 2: Tabela com nome diferente
```sql
SELECT TOP 1
    nf_numero,
    nf_valor_total
FROM notas_fiscais
ORDER BY nf_data DESC
```

#### Exemplo 3: Com filtro de status
```sql
SELECT TOP 1
    valor_total
FROM vendas
WHERE status = 'FINALIZADA'
ORDER BY data_venda DESC, hora_venda DESC
```

## ⚙️ Configuração Manual (Avançado)

Se preferir, edite diretamente o arquivo `sql-config.json`:

```json
{
  "server": "localhost",
  "database": "MeuBancoPDV",
  "user": "sa",
  "password": "MinhaSenh@123",
  "port": 1433,
  "options": {
    "encrypt": true,
    "trustServerCertificate": true,
    "enableArithAbort": true
  },
  "queries": {
    "lastSale": "SELECT TOP 1 numero_nota, valor_total FROM vendas ORDER BY data_venda DESC"
  }
}
```

## 🐛 Solução de Problemas

### Erro: "Configuração SQL não encontrada"
- Configure a conexão clicando no botão flutuante

### Erro: "Failed to connect to SQL Server"
- Verifique se o SQL Server está rodando
- Confirme servidor, porta e credenciais
- Verifique se TCP/IP está habilitado no SQL Server

### Erro: "Login failed for user"
- Verifique usuário e senha
- Confirme se o usuário tem permissão no banco

### Valor não é preenchido automaticamente
- Verifique se a query está retornando resultados
- Confirme se há vendas no banco de dados
- Abra o Console do Navegador (F12) e veja os logs

### Como habilitar TCP/IP no SQL Server

1. Abra "SQL Server Configuration Manager"
2. Vá em "SQL Server Network Configuration"
3. Clique em "Protocols for [INSTANCIA]"
4. Clique com direito em "TCP/IP" → "Enable"
5. Reinicie o serviço SQL Server

## 📊 Logs e Debug

Abra o Console do Navegador (F12) para ver:
- `✅ Configuração SQL Server carregada` - Config carregada
- `🔍 Janela recebeu foco, buscando última venda...` - Busca iniciada
- `✅ Última venda buscada: 150.50` - Valor encontrado

## 🔒 Segurança

**IMPORTANTE**:
- O arquivo `sql-config.json` contém senha em texto plano
- **NÃO COMMITE** este arquivo no Git
- Use apenas em ambiente local/confiável
- Considere usar autenticação Windows se possível

## 💡 Dicas

1. **Teste a query primeiro** no SQL Server Management Studio
2. **Use ORDER BY** para garantir que pega a venda mais recente
3. **Campo numérico**: A aplicação busca o primeiro campo numérico > 0
4. **Performance**: Use índices nas colunas do ORDER BY
