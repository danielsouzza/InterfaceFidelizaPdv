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
GO

-- Configurar permissões para BancoSammi
USE BancoSammi;
GO

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
GO

-- Conceder permissões no BancoSammi
ALTER ROLE db_datareader ADD MEMBER usuario_fideliza;
ALTER ROLE db_datawriter ADD MEMBER usuario_fideliza;
PRINT 'Permissões concedidas ao usuario_fideliza no BancoSammi!';
GO

-- Configurar permissões para BancoFideliza
USE BancoFideliza;
GO

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
GO

-- Conceder permissões no BancoFideliza
ALTER ROLE db_datareader ADD MEMBER usuario_fideliza;
ALTER ROLE db_datawriter ADD MEMBER usuario_fideliza;
PRINT 'Permissões concedidas ao usuario_fideliza no BancoFideliza!';
GO

PRINT '========================================';
PRINT 'CONFIGURAÇÃO DE USUÁRIO CONCLUÍDA';
PRINT 'Login: usuario_fideliza';
PRINT 'Senha: SenhaSegura123!';
PRINT 'Bancos com acesso: BancoSammi, BancoFideliza';
PRINT 'Permissões: Leitura e Escrita';
PRINT '========================================';
GO


USE BancoFideliza;
GO

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
GO

-- Criar índice para melhorar performance de consultas
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_NotasUsadas_NumeroNota')
BEGIN
    CREATE INDEX IX_NotasUsadas_NumeroNota ON NotasUsadas(numero_nota);
    PRINT 'Índice IX_NotasUsadas_NumeroNota criado!';
END
GO

-- Script SQL para criar a tabela PontuacaoPendente
-- Esta tabela armazena tentativas de pontuação que falharam para reprocessamento automático

-- Verificar se a tabela já existe e criar se não existir
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
GO


