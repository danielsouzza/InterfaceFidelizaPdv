-- Script para criar tabela de controle de notas usadas
-- Execute este script no seu banco de dados SQL Server

USE TesteNotas;
GO

-- Criar tabela NotasUsadas se não existir
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

-- Exemplo de uso:
-- SELECT * FROM NotasUsadas;
