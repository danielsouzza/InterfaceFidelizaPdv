-- ========================================
-- SCRIPT DE MIGRAÇÃO COM TRANSAÇÃO E VERIFICAÇÃO
-- ========================================

-- Iniciar transação
BEGIN TRANSACTION;

PRINT '========================================';
PRINT 'INICIANDO TRANSAÇÃO DE MIGRAÇÃO';
PRINT '========================================';

-- ========================================
-- CRIAÇÃO DE USUÁRIO E PERMISSÕES
-- ========================================

-- Criar login no SQL Server (nível de servidor)
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'usuario_fideliza')
BEGIN
    CREATE LOGIN usuario_fideliza WITH PASSWORD = 'SenhaSegura123!';
    PRINT 'Login usuario_fideliza criado com sucesso!';
END
ELSE
BEGIN
    PRINT 'Login usuario_fideliza já existe.';
END

-- Configurar permissões para BancoSammi
USE BancoSammi;

-- Criar usuário no banco BancoSammi
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'usuario_fideliza')
BEGIN
    CREATE USER usuario_fideliza FOR LOGIN usuario_fideliza;
    PRINT 'Usuário usuario_fideliza criado no BancoSammi!';
END
ELSE
BEGIN
    PRINT 'Usuário usuario_fideliza já existe no BancoSammi.';
END

-- Conceder permissões no BancoSammi
ALTER ROLE db_datareader ADD MEMBER usuario_fideliza;
ALTER ROLE db_datawriter ADD MEMBER usuario_fideliza;
PRINT 'Permissões concedidas ao usuario_fideliza no BancoSammi!';

-- Configurar permissões para BancoFideliza
USE BancoFideliza;

-- Criar usuário no banco BancoFideliza
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'usuario_fideliza')
BEGIN
    CREATE USER usuario_fideliza FOR LOGIN usuario_fideliza;
    PRINT 'Usuário usuario_fideliza criado no BancoFideliza!';
END
ELSE
BEGIN
    PRINT 'Usuário usuario_fideliza já existe no BancoFideliza.';
END

-- Conceder permissões no BancoFideliza
ALTER ROLE db_datareader ADD MEMBER usuario_fideliza;
ALTER ROLE db_datawriter ADD MEMBER usuario_fideliza;
PRINT 'Permissões concedidas ao usuario_fideliza no BancoFideliza!';

-- ========================================
-- CRIAÇÃO DE TABELAS NO BANCOFIDELIZA
-- ========================================

-- Criar tabela NotasUsadas
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'NotasUsadas')
BEGIN
    CREATE TABLE NotasUsadas (
        id INT IDENTITY(1,1) PRIMARY KEY,
        numero_nota VARCHAR(50) NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        cpf_telefone VARCHAR(20) NOT NULL,
        data_uso DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_NotaUsada UNIQUE (numero_nota, cpf_telefone)
    );

    PRINT 'Tabela NotasUsadas criada com sucesso!';
END
ELSE
BEGIN
    PRINT 'Tabela NotasUsadas já existe.';
END

-- Criar índice para melhorar performance de consultas
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_NotasUsadas_NumeroNota')
BEGIN
    CREATE INDEX IX_NotasUsadas_NumeroNota ON NotasUsadas(numero_nota);
    PRINT 'Índice IX_NotasUsadas_NumeroNota criado!';
END

-- Criar tabela PontuacaoPendente
-- Esta tabela armazena tentativas de pontuação que falharam para reprocessamento automático
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PontuacaoPendente')
BEGIN
    CREATE TABLE PontuacaoPendente (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [numero_nota] VARCHAR(50) NOT NULL,
        [valor] DECIMAL(10, 2) NOT NULL,
        [cpf_telefone] VARCHAR(20) NOT NULL,
        [erro_mensagem] VARCHAR(500) NULL,
        [dados_completos] NVARCHAR(MAX) NOT NULL,  -- JSON com todos os dados da requisição original
        [tentativas] INT DEFAULT 0,                -- Número de tentativas de reprocessamento
        [processado] BIT DEFAULT 0,                -- 0 = pendente, 1 = processado com sucesso
        [data_criacao] DATETIME DEFAULT GETDATE(), -- Data/hora do primeiro erro
        [ultima_tentativa] DATETIME NULL           -- Data/hora da última tentativa de reprocessamento
    );

    -- Criar índices para melhorar performance
    CREATE INDEX IX_PontuacaoPendente_NumeroNota ON PontuacaoPendente (numero_nota);
    CREATE INDEX IX_PontuacaoPendente_DataCriacao ON PontuacaoPendente (data_criacao);

    PRINT 'Tabela PontuacaoPendente criada com sucesso!';
END
ELSE
BEGIN
    PRINT 'Tabela PontuacaoPendente já existe.';
END

-- ========================================
-- VERIFICAÇÕES ANTES DO ROLLBACK
-- ========================================

PRINT '========================================';
PRINT 'VERIFICANDO ESTRUTURAS CRIADAS';
PRINT '========================================';

-- Verificar login criado
PRINT 'VERIFICANDO LOGIN:';
SELECT 
    name as 'Login_Name',
    type_desc as 'Type',
    create_date as 'Created_Date',
    is_disabled as 'Is_Disabled'
FROM sys.server_principals 
WHERE name = 'usuario_fideliza';

-- Verificar usuário no BancoSammi
USE BancoSammi;
PRINT 'VERIFICANDO USUÁRIO NO BANCOSAMMI:';
SELECT 
    dp.name as 'User_Name',
    dp.type_desc as 'Type',
    dp.create_date as 'Created_Date'
FROM sys.database_principals dp
WHERE dp.name = 'usuario_fideliza';

PRINT 'VERIFICANDO PERMISSÕES NO BANCOSAMMI:';
SELECT 
    dp.name as 'Principal_Name',
    r.name as 'Role_Name'
FROM sys.database_role_members rm
JOIN sys.database_principals dp ON rm.member_principal_id = dp.principal_id
JOIN sys.database_principals r ON rm.role_principal_id = r.principal_id
WHERE dp.name = 'usuario_fideliza';

-- Verificar usuário no BancoFideliza
USE BancoFideliza;
PRINT 'VERIFICANDO USUÁRIO NO BANCOFIDELIZA:';
SELECT 
    dp.name as 'User_Name',
    dp.type_desc as 'Type',
    dp.create_date as 'Created_Date'
FROM sys.database_principals dp
WHERE dp.name = 'usuario_fideliza';

PRINT 'VERIFICANDO PERMISSÕES NO BANCOFIDELIZA:';
SELECT 
    dp.name as 'Principal_Name',
    r.name as 'Role_Name'
FROM sys.database_role_members rm
JOIN sys.database_principals dp ON rm.member_principal_id = dp.principal_id
JOIN sys.database_principals r ON rm.role_principal_id = r.principal_id
WHERE dp.name = 'usuario_fideliza';

-- Verificar tabelas criadas
PRINT 'VERIFICANDO TABELAS CRIADAS:';
SELECT 
    t.name as 'Table_Name',
    t.create_date as 'Created_Date',
    t.type_desc as 'Type'
FROM sys.tables t
WHERE t.name IN ('NotasUsadas', 'PontuacaoPendente');

-- Verificar índices criados
PRINT 'VERIFICANDO ÍNDICES CRIADOS:';
SELECT 
    i.name as 'Index_Name',
    t.name as 'Table_Name',
    i.type_desc as 'Index_Type'
FROM sys.indexes i
JOIN sys.tables t ON i.object_id = t.object_id
WHERE i.name IN ('IX_NotasUsadas_NumeroNota', 'IX_PontuacaoPendente_NumeroNota', 'IX_PontuacaoPendente_DataCriacao');

-- Verificar estrutura da tabela NotasUsadas
PRINT 'VERIFICANDO ESTRUTURA DA TABELA NOTASUSADAS:';
SELECT 
    c.name as 'Column_Name',
    t.name as 'Data_Type',
    c.max_length,
    c.is_nullable,
    c.is_identity
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
JOIN sys.tables tb ON c.object_id = tb.object_id
WHERE tb.name = 'NotasUsadas'
ORDER BY c.column_id;

-- Verificar estrutura da tabela PontuacaoPendente
PRINT 'VERIFICANDO ESTRUTURA DA TABELA PONTUACAOPENDENTE:';
SELECT 
    c.name as 'Column_Name',
    t.name as 'Data_Type',
    c.max_length,
    c.is_nullable,
    c.is_identity
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
JOIN sys.tables tb ON c.object_id = tb.object_id
WHERE tb.name = 'PontuacaoPendente'
ORDER BY c.column_id;

PRINT '========================================';
PRINT 'VERIFICAÇÕES CONCLUÍDAS';
PRINT 'EXECUTANDO ROLLBACK PARA TESTE';
PRINT '========================================';

-- ROLLBACK para desfazer todas as alterações (apenas para teste)
ROLLBACK TRANSACTION;

PRINT '========================================';
PRINT 'ROLLBACK EXECUTADO COM SUCESSO!';
PRINT 'TODAS AS ALTERAÇÕES FORAM DESFEITAS';
PRINT '========================================';
PRINT '';
PRINT 'PARA APLICAR AS ALTERAÇÕES DEFINITIVAMENTE:';
PRINT '1. Substitua "ROLLBACK TRANSACTION;" por "COMMIT TRANSACTION;"';
PRINT '2. Execute o script novamente';
PRINT '========================================';