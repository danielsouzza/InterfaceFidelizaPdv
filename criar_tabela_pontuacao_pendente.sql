-- Script SQL para criar a tabela PontuacaoPendente
-- Esta tabela armazena tentativas de pontuação que falharam para reprocessamento automático

-- Verificar se a tabela já existe e criar se não existir
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[TesteNotas].[dbo].[PontuacaoPendente]') AND type in (N'U'))
BEGIN
    CREATE TABLE [TesteNotas].[dbo].[PontuacaoPendente] (
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
    CREATE INDEX IX_PontuacaoPendente_Processado ON [TesteNotas].[dbo].[PontuacaoPendente] ([processado]);
    CREATE INDEX IX_PontuacaoPendente_NumeroNota ON [TesteNotas].[dbo].[PontuacaoPendente] ([numero_nota]);
    CREATE INDEX IX_PontuacaoPendente_DataCriacao ON [TesteNotas].[dbo].[PontuacaoPendente] ([data_criacao]);

    PRINT 'Tabela PontuacaoPendente criada com sucesso!';
END
ELSE
BEGIN
    PRINT 'Tabela PontuacaoPendente já existe.';
END
GO

-- Exemplo de consulta para verificar pontuações pendentes
-- SELECT * FROM PontuacaoPendente WHERE processado = 0 ORDER BY data_criacao DESC;

-- Exemplo de consulta para ver histórico completo
-- SELECT * FROM PontuacaoPendente ORDER BY data_criacao DESC;

-- Exemplo de consulta para ver estatísticas
-- SELECT
--     COUNT(*) as total,
--     SUM(CASE WHEN processado = 0 THEN 1 ELSE 0 END) as pendentes,
--     SUM(CASE WHEN processado = 1 THEN 1 ELSE 0 END) as processadas,
--     AVG(tentativas) as media_tentativas
-- FROM PontuacaoPendente;
