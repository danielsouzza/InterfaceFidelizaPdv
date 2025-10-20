require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const sql = require('mssql');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração da API Fidelimax
const API_CONFIG = {
    baseUrl: process.env.FIDELIMAX_BASE_URL || 'https://api.fidelimax.com.br/api/Integracao',
    authToken: process.env.FIDELIMAX_AUTH_TOKEN || '5e5c32ec-685b-456d-bf8f-a3151bb6a27e-636'
};

// Intervalo de reprocessamento (em minutos)
const INTERVALO_REPROCESSAMENTO = parseInt(process.env.INTERVALO_REPROCESSAMENTO) || 5;

// ========================================
// CONFIGURAÇÃO DOS BANCOS DE DADOS
// ========================================

// Banco do PDV (onde busca as notas - somente leitura)
const DB_PDV_CONFIG = {
    server: process.env.DB_PDV_SERVER || 'localhost',
    database: process.env.DB_PDV_DATABASE || 'TesteNotas',
    user: process.env.DB_PDV_USER || 'SA',
    password: process.env.DB_PDV_PASSWORD || 'Senha@123',
    port: parseInt(process.env.DB_PDV_PORT) || 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    }
};

// Banco da Aplicação (onde ficam NotasUsadas e PontuacaoPendente)
const DB_APP_CONFIG = {
    server: process.env.DB_APP_SERVER || 'localhost',
    database: process.env.DB_APP_DATABASE || 'TesteNotas',
    user: process.env.DB_APP_USER || 'SA',
    password: process.env.DB_APP_PASSWORD || 'Senha@123',
    port: parseInt(process.env.DB_APP_PORT) || 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    }
};

console.log('✅ Configuração carregada do .env');
console.log('📊 Banco PDV:', DB_PDV_CONFIG.server, '/', DB_PDV_CONFIG.database);
console.log('📊 Banco App:', DB_APP_CONFIG.server, '/', DB_APP_CONFIG.database);

// Função auxiliar para salvar pontuação pendente
async function salvarPontuacaoPendente({ numero_nota, valor, cpf_telefone, erro_mensagem, dados_completos }) {
    const pool = await sql.connect(DB_APP_CONFIG);

    try {
        // Verificar se já existe pendente com esse número e mesmo CPF/telefone
        const checkResult = await pool.request()
            .input('numero_nota', sql.VarChar(50), numero_nota + "")
            .input('cpf_telefone', sql.VarChar(20), cpf_telefone)
            .query('SELECT id FROM PontuacaoPendente WHERE numero_nota = @numero_nota AND cpf_telefone = @cpf_telefone AND processado = 0');

        // Se já existe para o mesmo cliente, apenas atualiza
        if (checkResult.recordset.length > 0) {
            const pendente = checkResult.recordset[0];

            await pool.request()
                .input('id', sql.Int, pendente.id)
                .input('erro_mensagem', sql.VarChar(500), erro_mensagem)
                .input('dados_completos', sql.NVarChar(sql.MAX), dados_completos)
                .query(`
                    UPDATE PontuacaoPendente
                    SET erro_mensagem = @erro_mensagem,
                        dados_completos = @dados_completos,
                        ultima_tentativa = GETDATE(),
                        tentativas = tentativas + 1
                    WHERE id = @id
                `);

            await pool.close();
            console.log(`⚠️  Pontuação pendente atualizada (mesma nota, mesmo cliente): ${numero_nota}`);
            return { success: true, updated: true };
        }

        // Se não existe para esse cliente, insere novo (nota: o conflito com outro CPF já foi resolvido no front)
        await pool.request()
            .input('numero_nota', sql.VarChar(50), numero_nota + "")
            .input('valor', sql.Decimal(10, 2), parseFloat(valor))
            .input('cpf_telefone', sql.VarChar(20), cpf_telefone)
            .input('erro_mensagem', sql.VarChar(500), erro_mensagem)
            .input('dados_completos', sql.NVarChar(sql.MAX), dados_completos)
            .query(`
                INSERT INTO PontuacaoPendente
                (numero_nota, valor, cpf_telefone, erro_mensagem, dados_completos, tentativas, processado)
                VALUES (@numero_nota, @valor, @cpf_telefone, @erro_mensagem, @dados_completos, 1, 0)
            `);

        await pool.close();
        return { success: true };
    } catch (error) {
        await pool.close();
        throw error;
    }
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Rota para servir o HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota proxy para buscar/consultar cliente
app.post('/api/buscar-cliente', async (req, res) => {
    try {
        const { cpf, telefone } = req.body;

        console.log('Consultando consumidor:', { cpf, telefone });

        const response = await fetch(`${API_CONFIG.baseUrl}/ConsultaConsumidor`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'AuthToken': API_CONFIG.authToken
            },
            body: JSON.stringify({
                ...(cpf && { cpf }),
                ...(telefone && { telefone })
            })
        });

        const data = await response.json();

        console.log('Resposta ConsultaConsumidor:', data);

        if (!response.ok) {
            return res.status(response.status).json({
                error: 'Erro na API Fidelimax',
                details: data
            });
        }

        res.json(data);
    } catch (error) {
        console.error('Erro ao consultar cliente:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// Rota proxy para buscar saldo de pontos
app.post('/api/buscar-pontos', async (req, res) => {
    try {
        const { cpf, telefone } = req.body;

        console.log('Buscando pontos do cliente:', { cpf, telefone });

        const response = await fetch(`${API_CONFIG.baseUrl}/RetornaSaldoPontos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'AuthToken': API_CONFIG.authToken
            },
            body: JSON.stringify({
                ...(cpf && { cpf }),
                ...(telefone && { telefone })
            })
        });

        const data = await response.json();
        console.log('Saldo de pontos:', data);

        if (!response.ok) {
            return res.status(response.status).json({
                error: 'Erro na API Fidelimax',
                details: data
            });
        }

        res.json(data);
    } catch (error) {
        console.error('Erro ao buscar pontos:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// Rota proxy para pontuar cliente
app.post('/api/pontuar-cliente', async (req, res) => {
    try {
        const { cpf, telefone, pontuacao_reais, cartao, tipo_compra, verificador, estorno, numero_nota } = req.body;

        console.log('Pontuando consumidor:', req.body);

        const requestBody = {
            pontuacao_reais
        };

        // Adicionar campos opcionais
        if (cpf) requestBody.cpf = cpf;
        if (telefone) requestBody.telefone = telefone;
        if (cartao) requestBody.cartao = cartao;
        if (tipo_compra) requestBody.tipo_compra = tipo_compra;
        if (verificador) requestBody.verificador = verificador;
        if (estorno !== undefined) requestBody.estorno = estorno;


        const response = await fetch(`${API_CONFIG.baseUrl}/PontuaConsumidor`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'AuthToken': API_CONFIG.authToken
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        console.log('Resposta PontuaConsumidor:', data);

        
        if (!response.ok) {
            // Salvar na tabela de pontuação pendente quando houver erro
            if (numero_nota) {
                try {
                    await salvarPontuacaoPendente({
                        numero_nota,
                        valor: pontuacao_reais,
                        cpf_telefone: cpf || telefone,
                        erro_mensagem: data.message || 'Erro na API Fidelimax',
                        dados_completos: JSON.stringify(req.body)
                    });
                    console.log('⚠️  Pontuação salva como pendente para tentar novamente mais tarde');
                } catch (saveError) {
                    console.error('❌ Erro ao salvar pontuação pendente:', saveError);
                }
            }

            return res.status(response.status).json({
                error: 'Erro na API Fidelimax',
                details: data,
                saved_for_retry: true,
                user_message: 'Ocorreu um erro ao pontuar. Não se preocupe, o sistema tentará novamente mais tarde automaticamente.'
            });
        }

        res.json(data);
    } catch (error) {
        console.error('Erro ao pontuar cliente:', error);

        console.log('Erro ao pontuar cliente:', req.body.numero_nota);

        // Salvar na tabela de pontuação pendente quando houver erro de conexão
        if (req.body.numero_nota) {
            try {
                await salvarPontuacaoPendente({
                    numero_nota: req.body.numero_nota,
                    valor: req.body.pontuacao_reais,
                    cpf_telefone: req.body.cpf || req.body.telefone,
                    erro_mensagem: error.message,
                    dados_completos: JSON.stringify(req.body)
                });
                console.log('⚠️  Pontuação salva como pendente (erro de conexão)');
            } catch (saveError) {
                console.error('❌ Erro ao salvar pontuação pendente:', saveError);
            }
        }

        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message,
            saved_for_retry: true,
            user_message: 'Ocorreu um erro ao pontuar. Não se preocupe, o sistema tentará novamente mais tarde automaticamente.'
        });
    }
});

// Rota proxy para cadastrar consumidor
app.post('/api/cadastrar-cliente', async (req, res) => {
    try {
        const { nome, cpf, sexo, nascimento, email, telefone } = req.body;

        console.log('Cadastrando consumidor:', req.body);

        const requestBody = {
            nome
        };

        // Adicionar campos obrigatórios/opcionais
        if (cpf) requestBody.cpf = cpf;
        if (sexo) requestBody.sexo = sexo;
        if (nascimento) requestBody.nascimento = nascimento;
        if (email) requestBody.email = email;
        if (telefone) requestBody.telefone = telefone;

        const response = await fetch(`${API_CONFIG.baseUrl}/CadastrarConsumidor`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'AuthToken': API_CONFIG.authToken
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        console.log('Resposta CadastrarConsumidor:', data);

        if (!response.ok) {
            return res.status(response.status).json({
                error: 'Erro na API Fidelimax',
                details: data
            });
        }

        res.json(data);
    } catch (error) {
        console.error('Erro ao cadastrar consumidor:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// Rota proxy para atualizar consumidor
app.post('/api/atualizar-cliente', async (req, res) => {
    try {
        const { nome, cpf, sexo, nascimento, email, telefone } = req.body;

        console.log('Atualizando consumidor:', req.body);

        const requestBody = {
            nome
        };

        // Adicionar campos obrigatórios/opcionais
        if (cpf) requestBody.cpf = cpf;
        if (sexo) requestBody.sexo = sexo;
        if (nascimento) requestBody.nascimento = nascimento;
        if (email) requestBody.email = email;
        if (telefone) requestBody.telefone = telefone;

        const response = await fetch(`${API_CONFIG.baseUrl}/AtualizarConsumidor`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'AuthToken': API_CONFIG.authToken
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        console.log('Resposta AtualizarConsumidor:', data);

        if (!response.ok) {
            return res.status(response.status).json({
                error: 'Erro na API Fidelimax',
                details: data
            });
        }

        res.json(data);
    } catch (error) {
        console.error('Erro ao atualizar consumidor:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// Rota proxy para retornar dados completos do cliente
app.post('/api/dados-cliente', async (req, res) => {
    try {
        const { cpf, telefone } = req.body;

        console.log('Buscando dados completos do cliente:', { cpf, telefone });

        const requestBody = {};

        // Adicionar campos de busca
        if (cpf) requestBody.cpf = cpf;
        if (telefone) requestBody.telefone = telefone;

        const response = await fetch(`${API_CONFIG.baseUrl}/RetornaDadosCliente`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'AuthToken': API_CONFIG.authToken
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        console.log('Resposta RetornaDadosCliente:', data);

        if (!response.ok) {
            return res.status(response.status).json({
                error: 'Erro na API Fidelimax',
                details: data
            });
        }

        res.json(data);
    } catch (error) {
        console.error('Erro ao buscar dados do cliente:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// ==================== ROTAS SQL SERVER ====================

// Query para buscar última venda (pode ser personalizada via .env se necessário)
const QUERY_LAST_SALE = process.env.QUERY_LAST_SALE;

// Rota para buscar última venda (do banco PDV)
app.get('/api/sql/last-sale', async (req, res) => {
    try {
        const pool = await sql.connect(DB_PDV_CONFIG);
        const result = await pool.request().query(QUERY_LAST_SALE);
        await pool.close();

        if (result.recordset.length > 0) {
            const sale = result.recordset[0];

            // Priorizar campos com nomes específicos de valor
            const valorFields = ['VLR_TOTAL','VLR_PRECO_TOTAL','valor'];
            let valor = 0;

            // Tentar encontrar campo de valor pelos nomes conhecidos (case insensitive)
            for (const fieldName of valorFields) {
                for (const key in sale) {
                    if (key.toLowerCase() == fieldName.toLowerCase()) {
                        valor = sale[key];
                        break;
                    }
                }
                if (valor > 0) break;
            }


            res.json({
                success: true,
                data: {
                    valor: valor,
                    raw: sale
                }
            });
        } else {
            res.json({
                success: false,
                message: 'Nenhuma venda encontrada'
            });
        }
    } catch (error) {
        console.error('❌ Erro ao buscar última venda:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar última venda',
            error: error.message
        });
    }
});

// ==================== ROTAS CONTROLE DE NOTAS USADAS ====================

// Rota para verificar se uma nota já foi usada
app.post('/api/sql/check-nota', async (req, res) => {
    try {
        const { numero_nota } = req.body;

        if (!numero_nota) {
            return res.status(400).json({
                success: false,
                message: 'Número da nota é obrigatório'
            });
        }

        const pool = await sql.connect(DB_APP_CONFIG);

        const result = await pool.request()
            .input('numero_nota', sql.VarChar(50), numero_nota)
            .query('SELECT COUNT(*) as count FROM NotasUsadas WHERE numero_nota = @numero_nota');

        await pool.close();

        const isUsed = result.recordset[0].count > 0;

        res.json({
            success: true,
            used: isUsed,
            numero_nota: numero_nota
        });
    } catch (error) {
        console.error('❌ Erro ao verificar nota:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao verificar nota',
            error: error.message
        });
    }
});

// Rota para salvar nota usada
app.post('/api/sql/save-nota-usada', async (req, res) => {
    try {
        const { numero_nota, valor, cpf_telefone } = req.body;

        if (!numero_nota || !valor || !cpf_telefone) {
            return res.status(400).json({
                success: false,
                message: 'Dados incompletos: numero_nota, valor e cpf_telefone são obrigatórios'
            });
        }

        const pool = await sql.connect(DB_APP_CONFIG);

        // Verificar se já existe (evitar duplicatas)
        const checkResult = await pool.request()
            .input('numero_nota', sql.VarChar(50), numero_nota+"")
            .input('cpf_telefone', sql.VarChar(20), cpf_telefone)
            .query('SELECT id FROM NotasUsadas WHERE numero_nota = @numero_nota AND cpf_telefone = @cpf_telefone');

        if (checkResult.recordset.length > 0) {
            await pool.close();
            return res.json({
                success: true,
                message: 'Nota já estava registrada',
                already_exists: true
            });
        }

        // Inserir nova nota usada
        await pool.request()
            .input('numero_nota', sql.VarChar(50), numero_nota+"")
            .input('valor', sql.Decimal(10, 2), parseFloat(valor))
            .input('cpf_telefone', sql.VarChar(20), cpf_telefone)
            .query('INSERT INTO NotasUsadas (numero_nota, valor, cpf_telefone) VALUES (@numero_nota, @valor, @cpf_telefone)');

        await pool.close();

        console.log(`✅ Nota registrada: ${numero_nota} - Cliente: ${cpf_telefone}`);

        res.json({
            success: true,
            message: 'Nota registrada com sucesso',
            already_exists: false
        });
    } catch (error) {
        console.error('❌ Erro ao salvar nota usada:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao salvar nota usada',
            error: error.message
        });
    }
});

// ==================== ROTAS PONTUAÇÃO PENDENTE ====================

// Rota DEBUG - Listar TODAS as pontuações pendentes (para debug)
app.get('/api/sql/debug-pendentes', async (req, res) => {
    try {
        const pool = await sql.connect(DB_APP_CONFIG);

        const result = await pool.request()
            .query('SELECT * FROM PontuacaoPendente ORDER BY data_criacao DESC');

        await pool.close();

        res.json({
            success: true,
            total: result.recordset.length,
            data: result.recordset
        });
    } catch (error) {
        console.error('❌ Erro ao buscar pendentes (debug):', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar pendentes',
            error: error.message
        });
    }
});

// Rota para verificar se uma nota já está pendente com outro CPF/telefone
app.post('/api/sql/check-nota-pendente', async (req, res) => {
    try {
        const { numero_nota, cpf_telefone } = req.body;

        console.log('🔍 CHECK-NOTA-PENDENTE chamado:', { numero_nota, cpf_telefone });

        if (!numero_nota || !cpf_telefone) {
            return res.status(400).json({
                success: false,
                message: 'Número da nota e CPF/telefone são obrigatórios'
            });
        }

        const pool = await sql.connect(DB_APP_CONFIG);

        // Verificar se existe nota pendente com esse número
        const result = await pool.request()
            .input('numero_nota', sql.VarChar(50), numero_nota)
            .query(`
                SELECT id, numero_nota, valor, cpf_telefone, data_criacao
                FROM PontuacaoPendente
                WHERE numero_nota = @numero_nota AND processado = 0
            `);

        console.log('📊 Resultado da busca:', {
            encontrados: result.recordset.length,
            dados: result.recordset
        });

        await pool.close();

        if (result.recordset.length > 0) {
            const notaPendente = result.recordset[0];

            console.log('⚠️  Comparando CPF/telefone:', {
                pendente: notaPendente.cpf_telefone,
                atual: cpf_telefone,
                sao_diferentes: notaPendente.cpf_telefone !== cpf_telefone
            });

            // Verificar se o CPF/telefone é DIFERENTE
            if (notaPendente.cpf_telefone !== cpf_telefone) {
                console.log('🚨 CONFLITO DETECTADO! CPF/telefone diferente');
                return res.json({
                    success: true,
                    conflito: true,
                    message: `ATENÇÃO: Esta nota já está pendente para outro cliente (${notaPendente.cpf_telefone}). Se confirmar, a pontuação anterior será excluída.`,
                    nota_pendente: {
                        id: notaPendente.id,
                        numero_nota: notaPendente.numero_nota,
                        valor: notaPendente.valor,
                        cpf_telefone_anterior: notaPendente.cpf_telefone,
                        data_criacao: notaPendente.data_criacao
                    }
                });
            }

            // Mesmo CPF/telefone - não há conflito
            console.log('✅ Mesmo CPF/telefone - sem conflito');
            return res.json({
                success: true,
                conflito: false,
                message: 'Nota já está pendente para o mesmo cliente'
            });
        }

        // Não existe pendente
        console.log('✅ Nota não está pendente');
        res.json({
            success: true,
            conflito: false,
            message: 'Nota não está pendente'
        });
    } catch (error) {
        console.error('❌ Erro ao verificar nota pendente:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao verificar nota pendente',
            error: error.message
        });
    }
});

// Rota para confirmar e excluir pontuação pendente anterior (usada quando há conflito)
app.post('/api/sql/confirmar-substituir-pendente', async (req, res) => {
    try {
        const { numero_nota } = req.body;

        if (!numero_nota) {
            return res.status(400).json({
                success: false,
                message: 'Número da nota é obrigatório'
            });
        }

        const pool = await sql.connect(DB_APP_CONFIG);

        // Excluir a pontuação pendente anterior
        await pool.request()
            .input('numero_nota', sql.VarChar(50), numero_nota)
            .query('DELETE FROM PontuacaoPendente WHERE numero_nota = @numero_nota AND processado = 0');

        await pool.close();

        console.log(`✅ Pontuação pendente anterior excluída: ${numero_nota}`);

        res.json({
            success: true,
            message: 'Pontuação pendente anterior excluída. Pode prosseguir com a nova pontuação.'
        });
    } catch (error) {
        console.error('❌ Erro ao excluir pontuação pendente:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao excluir pontuação pendente',
            error: error.message
        });
    }
});

// Rota para marcar pontuação pendente como processada (quando pontuar com sucesso)
app.post('/api/sql/marcar-pendente-processada', async (req, res) => {
    try {
        const { numero_nota, cpf_telefone } = req.body;

        if (!numero_nota) {
            return res.status(400).json({
                success: false,
                message: 'Número da nota é obrigatório'
            });
        }

        const pool = await sql.connect(DB_APP_CONFIG);

        // Marcar como processada (ou deletar se preferir)
        const query = cpf_telefone
            ? 'UPDATE PontuacaoPendente SET processado = 1, ultima_tentativa = GETDATE() WHERE numero_nota = @numero_nota AND cpf_telefone = @cpf_telefone AND processado = 0'
            : 'UPDATE PontuacaoPendente SET processado = 1, ultima_tentativa = GETDATE() WHERE numero_nota = @numero_nota AND processado = 0';

        const request = pool.request().input('numero_nota', sql.VarChar(50), numero_nota+"");

        if (cpf_telefone) {
            request.input('cpf_telefone', sql.VarChar(20), cpf_telefone);
        }

        const result = await request.query(query);

        await pool.close();

        if (result.rowsAffected[0] > 0) {
            console.log(`✅ Pontuação pendente marcada como processada: ${numero_nota}`);
        }

        res.json({
            success: true,
            marcadas: result.rowsAffected[0]
        });
    } catch (error) {
        console.error('❌ Erro ao marcar pontuação pendente:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao marcar pontuação pendente',
            error: error.message
        });
    }
});

// Rota para listar pontuações pendentes
app.get('/api/sql/pontuacoes-pendentes', async (req, res) => {
    try {
        const pool = await sql.connect(DB_APP_CONFIG);

        const result = await pool.request()
            .query(`
                SELECT
                    id, numero_nota, valor, cpf_telefone,
                    erro_mensagem, tentativas, data_criacao, ultima_tentativa
                FROM PontuacaoPendente
                WHERE processado = 0
                ORDER BY data_criacao DESC
            `);

        await pool.close();

        res.json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });
    } catch (error) {
        console.error('❌ Erro ao buscar pontuações pendentes:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar pontuações pendentes',
            error: error.message
        });
    }
});

// Rota para tentar processar pontuações pendentes manualmente
app.post('/api/sql/processar-pendentes', async (req, res) => {
    try {
        const pool = await sql.connect(DB_APP_CONFIG);

        // Buscar pontuações pendentes
        const pendentes = await pool.request()
            .query(`
                SELECT id, dados_completos, numero_nota
                FROM PontuacaoPendente
                WHERE processado = 0 AND tentativas < 5
                ORDER BY data_criacao ASC
            `);

        const resultados = {
            total: pendentes.recordset.length,
            sucesso: 0,
            falha: 0,
            detalhes: []
        };

        // Tentar processar cada uma
        for (const pendente of pendentes.recordset) {
            try {
                const dadosOriginais = JSON.parse(pendente.dados_completos);

                const requestBody = {
                    pontuacao_reais: dadosOriginais.pontuacao_reais
                };

                if (dadosOriginais.cpf) requestBody.cpf = dadosOriginais.cpf;
                if (dadosOriginais.telefone) requestBody.telefone = dadosOriginais.telefone;
                if (dadosOriginais.cartao) requestBody.cartao = dadosOriginais.cartao;
                if (dadosOriginais.tipo_compra) requestBody.tipo_compra = dadosOriginais.tipo_compra;
                if (dadosOriginais.verificador) requestBody.verificador = dadosOriginais.verificador;
                if (dadosOriginais.estorno !== undefined) requestBody.estorno = dadosOriginais.estorno;

                const response = await fetch(`${API_CONFIG.baseUrl}/PontuaConsumidor`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'AuthToken': API_CONFIG.authToken
                    },
                    body: JSON.stringify(requestBody)
                });

                const data = await response.json();

                if (response.ok) {
                    // Sucesso - marcar como processado
                    await pool.request()
                        .input('id', sql.Int, pendente.id)
                        .query('UPDATE PontuacaoPendente SET processado = 1, ultima_tentativa = GETDATE() WHERE id = @id');

                    resultados.sucesso++;
                    resultados.detalhes.push({
                        numero_nota: pendente.numero_nota,
                        status: 'sucesso',
                        mensagem: 'Pontuação processada com sucesso'
                    });

                    console.log(`✅ Pontuação pendente processada: ${pendente.numero_nota}`);
                } else {
                    // Falha - incrementar tentativas
                    await pool.request()
                        .input('id', sql.Int, pendente.id)
                        .query('UPDATE PontuacaoPendente SET tentativas = tentativas + 1, ultima_tentativa = GETDATE() WHERE id = @id');

                    resultados.falha++;
                    resultados.detalhes.push({
                        numero_nota: pendente.numero_nota,
                        status: 'falha',
                        mensagem: data.message || 'Erro desconhecido'
                    });

                    console.log(`⚠️  Falha ao processar pontuação pendente: ${pendente.numero_nota}`);
                }
            } catch (error) {
                // Erro - incrementar tentativas
                await pool.request()
                    .input('id', sql.Int, pendente.id)
                    .query('UPDATE PontuacaoPendente SET tentativas = tentativas + 1, ultima_tentativa = GETDATE() WHERE id = @id');

                resultados.falha++;
                resultados.detalhes.push({
                    numero_nota: pendente.numero_nota,
                    status: 'erro',
                    mensagem: error.message
                });

                console.error(`❌ Erro ao processar pontuação pendente ${pendente.numero_nota}:`, error);
            }
        }

        await pool.close();

        res.json({
            success: true,
            message: 'Processamento concluído',
            resultados
        });
    } catch (error) {
        console.error('❌ Erro ao processar pontuações pendentes:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao processar pontuações pendentes',
            error: error.message
        });
    }
});

// Rota para buscar última venda NÃO USADA
app.get('/api/sql/last-sale-unused', async (req, res) => {
    let poolPDV = null;
    let poolAPP = null;

    try {
        // Buscar do banco PDV
        poolPDV = await sql.connect(DB_PDV_CONFIG);
        const result = await poolPDV.request().query(QUERY_LAST_SALE);
        poolPDV.close()

        if (result.recordset.length === 0) {
            return res.json({
                success: false,
                message: 'Nenhuma venda encontrada'
            });
        }

        const lastSale = result.recordset[0];
        let numeroNota = null;

        // Tentar encontrar campo numero_nota
        for (const key in lastSale) {
            if (key.includes('COD_VND_NOTA') || key.toLowerCase().includes('numero') || key.toLowerCase().includes('nota')) {
                numeroNota = lastSale[key]+"";
                break;
            }
        }

        // Verificar se a ÚLTIMA nota já foi usada (no banco APP)
        console.log('numeroNota:', numeroNota);
        if (numeroNota) {
            poolAPP = await sql.connect(DB_APP_CONFIG);
            console.log('DB_APP_CONFIG:', DB_APP_CONFIG);
            const checkResult = await poolAPP.request()
                .input('numero_nota', sql.VarChar(50), numeroNota)
                .query('SELECT COUNT(*) as count FROM NotasUsadas WHERE numero_nota = @numero_nota');

            const isUsed = checkResult.recordset[0].count > 0;

            poolAPP.close()

            if (isUsed) {
                // Última nota JÁ FOI USADA - retorna vazio
                return res.json({
                    success: false,
                    message: `Última nota (${numeroNota}) já foi usada`,
                    already_used: true,
                    numero_nota: numeroNota
                });
            }
        }

        // Extrair valor da última nota (não usada)
        const valorFields = ['VLR_TOTAL','VLR_PRECO_TOTAL','valor'];
        let valor = 0;

        // Tentar encontrar campo de valor pelos nomes conhecidos (case insensitive)
        for (const fieldName of valorFields) {
            for (const key in lastSale) {
                if (key.toLowerCase() == fieldName.toLowerCase()) {
                    valor = lastSale[key];
                    break;
                }
            }
            if (valor > 0) break;
        }


        res.json({
            success: true,
            data: {
                valor: valor,
                raw: lastSale
            },
            numero_nota: numeroNota || 'não encontrado'
        });
    } catch (error) {
        console.error('❌ Erro ao buscar última venda não usada:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar última venda',
            error: error.message
        });
    } finally {
        if (poolPDV) await poolPDV.close();
        if (poolAPP) await poolAPP.close();
    }
});

// ==================== ROTINA AUTOMÁTICA DE REPROCESSAMENTO ====================

// Função para processar pendentes automaticamente
async function processarPendentesAutomatico() {
    let pool = null;

    try {
        pool = await sql.connect(DB_APP_CONFIG);

        // Buscar pontuações pendentes (máximo 5 tentativas)
        const pendentes = await pool.request()
            .query(`
                SELECT id, dados_completos, numero_nota, tentativas
                FROM PontuacaoPendente
                WHERE processado = 0 AND tentativas < 5
                ORDER BY data_criacao ASC
            `);

        if (pendentes.recordset.length === 0) {
            await pool.close();
            console.log('✅ Rotina de reprocessamento: Nenhuma pendente para processar');
            return;
        }

        console.log(`🔄 Rotina de reprocessamento: ${pendentes.recordset.length} pendente(s) encontrada(s)`);

        let sucessos = 0;
        let falhas = 0;

        // Tentar processar cada uma
        for (const pendente of pendentes.recordset) {
            try {
                const dadosOriginais = JSON.parse(pendente.dados_completos);

                const requestBody = {
                    pontuacao_reais: dadosOriginais.pontuacao_reais
                };

                if (dadosOriginais.cpf) requestBody.cpf = dadosOriginais.cpf;
                if (dadosOriginais.telefone) requestBody.telefone = dadosOriginais.telefone;
                if (dadosOriginais.cartao) requestBody.cartao = dadosOriginais.cartao;
                if (dadosOriginais.tipo_compra) requestBody.tipo_compra = dadosOriginais.tipo_compra;
                if (dadosOriginais.verificador) requestBody.verificador = dadosOriginais.verificador;
                if (dadosOriginais.estorno !== undefined) requestBody.estorno = dadosOriginais.estorno;

                const response = await fetch(`${API_CONFIG.baseUrl}/PontuaConsumidor`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'AuthToken': API_CONFIG.authToken
                    },
                    body: JSON.stringify(requestBody)
                });

                const data = await response.json();

                if (response.ok) {
                    // Sucesso - marcar como processado
                    await pool.request()
                        .input('id', sql.Int, pendente.id)
                        .query('UPDATE PontuacaoPendente SET processado = 1, ultima_tentativa = GETDATE() WHERE id = @id');

                    sucessos++;
                    console.log(`✅ Rotina: Pontuação pendente processada com sucesso - Nota ${pendente.numero_nota}`);
                } else {
                    // Falha - incrementar tentativas
                    await pool.request()
                        .input('id', sql.Int, pendente.id)
                        .query('UPDATE PontuacaoPendente SET tentativas = tentativas + 1, ultima_tentativa = GETDATE() WHERE id = @id');

                    falhas++;
                    console.log(`⚠️  Rotina: Falha ao processar pendente - Nota ${pendente.numero_nota} (Tentativa ${pendente.tentativas + 1}/5)`);
                }
            } catch (error) {
                // Erro - incrementar tentativas
                try {
                    await pool.request()
                        .input('id', sql.Int, pendente.id)
                        .query('UPDATE PontuacaoPendente SET tentativas = tentativas + 1, ultima_tentativa = GETDATE() WHERE id = @id');
                } catch (updateError) {
                    console.error(`❌ Erro ao atualizar tentativas:`, updateError.message);
                }

                falhas++;
                console.error(`❌ Rotina: Erro ao processar pendente ${pendente.numero_nota}:`, error.message);
            }
        }

        console.log(`📊 Rotina concluída: ${sucessos} sucesso(s), ${falhas} falha(s)`);

    } catch (error) {
        console.error('❌ Erro na rotina de reprocessamento:', error);
    } finally {
        // Garantir que o pool seja fechado
        try {
            if (pool) {
                await pool.close();
            }
        } catch (closeError) {
            // Ignorar erro ao fechar
        }
    }
}

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📂 Arquivos estáticos servidos de: ${__dirname}`);

    // Iniciar rotina de reprocessamento automático
    console.log(`⏰ Rotina de reprocessamento iniciada (a cada ${INTERVALO_REPROCESSAMENTO} minutos)`);

    // Executar primeira vez após 1 minuto
    setTimeout(() => {
        processarPendentesAutomatico();
    }, 60000);

    // Executar a cada X minutos
    setInterval(() => {
        processarPendentesAutomatico();
    }, INTERVALO_REPROCESSAMENTO * 60 * 1000);
});
