const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const sql = require('mssql');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Configuração da API Fidelimax
const API_CONFIG = {
    baseUrl: 'https://api.fidelimax.com.br/api/Integracao',
    authToken: '5e5c32ec-685b-456d-bf8f-a3151bb6a27e-636' // Substitua pelo token real
};

// Carregar configuração do SQL Server
let sqlConfig = null;
const SQL_CONFIG_PATH = path.join(__dirname, 'sql-config.json');

function loadSqlConfig() {
    try {
        if (fs.existsSync(SQL_CONFIG_PATH)) {
            const configData = fs.readFileSync(SQL_CONFIG_PATH, 'utf8');
            sqlConfig = JSON.parse(configData);
            console.log('✅ Configuração SQL Server carregada');
        } else {
            console.log('⚠️  Arquivo sql-config.json não encontrado');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar configuração SQL:', error.message);
    }
}

loadSqlConfig();

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
        const { cpf, telefone, pontuacao_reais, cartao, tipo_compra, verificador, estorno } = req.body;

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
            return res.status(response.status).json({
                error: 'Erro na API Fidelimax',
                details: data
            });
        }

        res.json(data);
    } catch (error) {
        console.error('Erro ao pontuar cliente:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
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

// Rota para obter configuração SQL atual (sem senha)
app.get('/api/sql/config', (req, res) => {
    if (!sqlConfig) {
        return res.json({ configured: false });
    }

    res.json({
        configured: true,
        server: sqlConfig.server,
        database: sqlConfig.database,
        user: sqlConfig.user,
        port: sqlConfig.port
    });
});

// Rota para salvar configuração SQL
app.post('/api/sql/config', (req, res) => {
    try {
        const { server, database, user, password, port, query } = req.body;

        const newConfig = {
            server: server || 'localhost',
            database: database || '',
            user: user || 'sa',
            password: password || '',
            port: port || 1433,
            options: {
                encrypt: true,
                trustServerCertificate: true,
                enableArithAbort: true
            },
            queries: {
                lastSale: query || 'SELECT TOP 1 numero_nota, valor_total FROM vendas ORDER BY data_venda DESC, id DESC'
            }
        };

        fs.writeFileSync(SQL_CONFIG_PATH, JSON.stringify(newConfig, null, 2));
        sqlConfig = newConfig;

        console.log('✅ Configuração SQL Server atualizada');

        res.json({ success: true, message: 'Configuração salva com sucesso!' });
    } catch (error) {
        console.error('❌ Erro ao salvar configuração SQL:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao salvar configuração',
            error: error.message
        });
    }
});

// Rota para testar conexão SQL
app.post('/api/sql/test', async (req, res) => {
    try {
        if (!sqlConfig) {
            return res.status(400).json({
                success: false,
                message: 'Configuração SQL não encontrada. Configure primeiro.'
            });
        }

        const pool = await sql.connect({
            server: sqlConfig.server,
            database: sqlConfig.database,
            user: sqlConfig.user,
            password: sqlConfig.password,
            port: sqlConfig.port,
            options: sqlConfig.options
        });

        await pool.close();

        res.json({ success: true, message: 'Conexão estabelecida com sucesso!' });
    } catch (error) {
        console.error('❌ Erro ao testar conexão SQL:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco de dados',
            error: error.message
        });
    }
});

// Rota para buscar última venda
app.get('/api/sql/last-sale', async (req, res) => {
    try {
        if (!sqlConfig) {
            return res.status(400).json({
                success: false,
                message: 'Configuração SQL não encontrada'
            });
        }

        const pool = await sql.connect({
            server: sqlConfig.server,
            database: sqlConfig.database,
            user: sqlConfig.user,
            password: sqlConfig.password,
            port: sqlConfig.port,
            options: sqlConfig.options
        });

        const result = await pool.request().query(sqlConfig.queries.lastSale);

        await pool.close();

        if (result.recordset.length > 0) {
            const sale = result.recordset[0];

            // Priorizar campos com nomes específicos de valor
            const valorFields = ['valor', 'valor_total', 'total', 'valor_venda', 'preco', 'preco_total'];
            let valor = 0;

            // Tentar encontrar campo de valor pelos nomes conhecidos (case insensitive)
            for (const fieldName of valorFields) {
                for (const key in sale) {
                    if (key.toLowerCase() === fieldName && typeof sale[key] === 'number' && sale[key] > 0) {
                        valor = sale[key];
                        break;
                    }
                }
                if (valor > 0) break;
            }

            // Se não encontrou, pega o primeiro campo numérico > 0
            if (valor === 0) {
                for (const key in sale) {
                    if (typeof sale[key] === 'number' && sale[key] > 0) {
                        valor = sale[key];
                        break;
                    }
                }
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

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📂 Arquivos estáticos servidos de: ${__dirname}`);
});
