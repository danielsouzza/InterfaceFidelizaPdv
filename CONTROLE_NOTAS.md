# 📝 Sistema de Controle de Notas Usadas

## 🎯 Objetivo

Evitar que a mesma nota fiscal seja usada para pontuar mais de uma vez, impedindo duplicação de pontos.

---

## 🗄️ 1. Criar Tabela no Banco de Dados

Execute este SQL no seu SQL Server:

```sql
USE TesteNotas;  -- Ou o nome do seu banco
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
```

**OU** execute o script pronto:

```bash
# No SQL Server Management Studio, abra e execute:
create-notas-usadas.sql
```

---

## 🔄 2. Como Funciona

### Fluxo Automático:

```
1. Usuário volta para aplicação (janela recebe foco)
   ↓
2. Sistema busca últimas 10 notas do PDV
   ↓
3. Para cada nota, verifica na tabela NotasUsadas
   ↓
4. Retorna a PRIMEIRA nota NÃO USADA
   ↓
5. Preenche o valor automaticamente
   ↓
6. Usuário digita CPF/Telefone e pontua
   ↓
7. Sistema SALVA a nota na tabela NotasUsadas
   ↓
8. Busca próxima nota disponível
   ↓
9. Ciclo se repete
```

---

## 📊 3. Estrutura da Tabela NotasUsadas

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT | ID único (auto incremento) |
| `numero_nota` | VARCHAR(50) | Número da nota fiscal |
| `valor` | DECIMAL(10,2) | Valor da venda |
| `cpf_telefone` | VARCHAR(20) | CPF ou telefone do cliente |
| `data_uso` | DATETIME | Data/hora que foi pontuada |

**Constraint**: Não permite duplicar nota + cliente (nota pode ser usada por clientes diferentes)

---

## 🔍 4. Endpoints da API

### GET `/api/sql/last-sale-unused`
Busca última venda NÃO USADA

**Resposta**:
```json
{
  "success": true,
  "data": {
    "valor": 890.75,
    "raw": {
      "numero_nota": "NF-005",
      "valor": 890.75,
      "data_nota": "2024-03-01"
    }
  }
}
```

### POST `/api/sql/save-nota-usada`
Salva nota como usada após pontuação

**Body**:
```json
{
  "numero_nota": "NF-005",
  "valor": 890.75,
  "cpf_telefone": "04072742279"
}
```

**Resposta**:
```json
{
  "success": true,
  "message": "Nota registrada com sucesso",
  "already_exists": false
}
```

### POST `/api/sql/check-nota`
Verifica se uma nota já foi usada

**Body**:
```json
{
  "numero_nota": "NF-005"
}
```

**Resposta**:
```json
{
  "success": true,
  "used": true,
  "numero_nota": "NF-005"
}
```

---

## 🚀 5. Testando o Sistema

### Teste 1: Primeira Pontuação

1. Abra a aplicação
2. Sistema busca última nota: `NF-005` = R$ 890,75
3. Digite CPF do cliente: `040.727.422-79`
4. Clique em "Cadastrar e Pontuar"
5. ✅ Nota salva em `NotasUsadas`

```sql
-- Verificar
SELECT * FROM NotasUsadas;
-- Resultado:
-- id | numero_nota | valor  | cpf_telefone  | data_uso
-- 1  | NF-005      | 890.75 | 04072742279   | 2024-03-01 10:30:00
```

### Teste 2: Evitar Duplicação

1. Volte para a aplicação
2. Sistema busca notas disponíveis
3. ❌ NF-005 já foi usada (pula)
4. ✅ Retorna próxima: `NF-004` = R$ 420,00
5. Campo preenchido automaticamente com R$ 420,00

### Teste 3: Todas Usadas

Se todas as 10 últimas notas já foram usadas:

```
⚠️ Notificação: "Todas as notas recentes já foram usadas"
Campo de valor: (vazio)
```

---

## 🔧 6. Consultas Úteis

### Ver todas as notas usadas
```sql
SELECT * FROM NotasUsadas ORDER BY data_uso DESC;
```

### Ver notas usadas hoje
```sql
SELECT * FROM NotasUsadas
WHERE CAST(data_uso AS DATE) = CAST(GETDATE() AS DATE)
ORDER BY data_uso DESC;
```

### Ver notas por cliente
```sql
SELECT * FROM NotasUsadas
WHERE cpf_telefone = '04072742279'
ORDER BY data_uso DESC;
```

### Total pontuado hoje
```sql
SELECT
    COUNT(*) as total_notas,
    SUM(valor) as valor_total
FROM NotasUsadas
WHERE CAST(data_uso AS DATE) = CAST(GETDATE() AS DATE);
```

### Limpar notas antigas (mais de 30 dias)
```sql
DELETE FROM NotasUsadas
WHERE data_uso < DATEADD(day, -30, GETDATE());
```

---

## ⚙️ 7. Configuração

No arquivo `sql-config.json`:

```json
{
  "queries": {
    "lastSale": "SELECT TOP 1 numero_nota, valor FROM Notas ORDER BY data_nota DESC, id DESC"
  }
}
```

**Importante**: A query deve retornar:
- ✅ Campo com número da nota (nome contendo "numero" ou "nota")
- ✅ Campo numérico com valor

---

## 🐛 8. Solução de Problemas

### Erro: "Table 'NotasUsadas' doesn't exist"
```sql
-- Execute o script de criação:
create-notas-usadas.sql
```

### Nota não é salva após pontuar
1. Verifique console do navegador (F12)
2. Procure por: `✅ Nota NF-XXX registrada como usada`
3. Se não aparecer, verifique se a query retorna `numero_nota`

### Campo numero_nota não é encontrado
A aplicação procura automaticamente por campos que contenham:
- "numero"
- "nota"

Exemplos válidos:
- ✅ `numero_nota`
- ✅ `NumeroNota`
- ✅ `nf_numero`
- ✅ `nota_fiscal`

### Resetar controle (desenvolvimento)
```sql
-- CUIDADO: Apaga TODAS as notas registradas
TRUNCATE TABLE NotasUsadas;
```

---

## 📈 9. Benefícios

✅ **Evita pontuação duplicada** - Mesma nota não pontua duas vezes
✅ **Automático** - Sistema gerencia sozinho
✅ **Rastreável** - Sabe exatamente quais notas foram usadas
✅ **Auditável** - Histórico completo com data/hora
✅ **Performance** - Índice otimizado para buscas rápidas
✅ **Flexível** - Mesma nota pode pontuar para clientes diferentes

---

## 🎉 Pronto!

O sistema agora:
1. ✅ Busca automaticamente notas NÃO usadas
2. ✅ Salva nota após pontuar
3. ✅ Pula notas já usadas
4. ✅ Notifica quando todas foram usadas
5. ✅ Histórico completo no banco de dados

**Nenhuma nota será pontuada duas vezes!** 🔒
