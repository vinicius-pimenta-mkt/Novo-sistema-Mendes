import express from 'express';
import { query } from '../database/supabase.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Dashboard - dados gerais
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Buscar dados em paralelo
    const [
      agendamentosHojeResult,
      receitaHojeResult,
      receitaMensalResult,
      proximosAgendamentosResult
    ] = await Promise.all([
      query('SELECT COUNT(*) as total FROM agendamentos WHERE data = $1', [hoje]),
      query('SELECT SUM(preco) as total FROM agendamentos WHERE data = $1 AND status = $2', [hoje, 'Confirmado']),
      query('SELECT SUM(preco) as total FROM agendamentos WHERE data::text LIKE $1 AND status = $2', [`${mesAtual}%`, 'Confirmado']),
      query('SELECT * FROM agendamentos WHERE data >= $1 ORDER BY data, hora LIMIT 5', [hoje])
    ]);

    res.json({
      agendamentosHoje: parseInt(agendamentosHojeResult.rows[0].total) || 0,
      receitaHoje: parseFloat(receitaHojeResult.rows[0].total) || 0,
      receitaMensal: parseFloat(receitaMensalResult.rows[0].total) || 0,
      proximosAgendamentos: proximosAgendamentosResult.rows
    });
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Relatório mensal
router.get('/mensal', verifyToken, async (req, res) => {
  try {
    const { mes, ano } = req.query;
    const mesAtual = mes && ano ? `${ano}-${mes.padStart(2, '0')}` : new Date().toISOString().slice(0, 7);

    const result = await query(`
      SELECT 
        data,
        COUNT(*) as total_agendamentos,
        SUM(CASE WHEN status = 'Confirmado' THEN preco ELSE 0 END) as receita_dia,
        STRING_AGG(servico, ', ') as servicos
      FROM agendamentos 
      WHERE data::text LIKE $1 
      GROUP BY data 
      ORDER BY data
    `, [`${mesAtual}%`]);
    
    res.json({
      mes: mesAtual,
      dados: result.rows
    });
  } catch (error) {
    console.error('Erro ao gerar relatório mensal:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Webhook para N8N
router.post('/n8n', async (req, res) => {
  try {
    const { tipo, cliente, telefone, servico, data, hora } = req.body;

    if (tipo === 'novo_agendamento') {
      if (!cliente || !servico || !data || !hora) {
        return res.status(400).json({ error: 'Dados incompletos para agendamento' });
      }

      const result = await query(
        'INSERT INTO agendamentos (cliente_nome, servico, data, hora, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [cliente, servico, data, hora, 'Pendente']
      );
      
      res.json({
        id: result.rows[0].id,
        message: 'Agendamento criado com sucesso via N8N'
      });
    } else {
      res.status(400).json({ error: 'Tipo de operação não suportado' });
    }
  } catch (error) {
    console.error('Erro ao processar webhook N8N:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;

