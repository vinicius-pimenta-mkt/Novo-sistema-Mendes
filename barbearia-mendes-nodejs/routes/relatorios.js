import express from 'express';
import db from '../database/init.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Dashboard - dados gerais
router.get('/dashboard', verifyToken, (req, res) => {
  const hoje = new Date().toISOString().split('T')[0];
  const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM

  // Buscar dados em paralelo
  const queries = {
    agendamentosHoje: new Promise((resolve, reject) => {
      db.all(
        'SELECT COUNT(*) as total FROM agendamentos WHERE data = ?',
        [hoje],
        (err, result) => {
          if (err) reject(err);
          else resolve(result[0].total);
        }
      );
    }),
    
    receitaHoje: new Promise((resolve, reject) => {
      db.all(
        'SELECT SUM(preco) as total FROM agendamentos WHERE data = ? AND status = "Confirmado"',
        [hoje],
        (err, result) => {
          if (err) reject(err);
          else resolve(result[0].total || 0);
        }
      );
    }),
    
    receitaMensal: new Promise((resolve, reject) => {
      db.all(
        'SELECT SUM(preco) as total FROM agendamentos WHERE data LIKE ? AND status = "Confirmado"',
        [`${mesAtual}%`],
        (err, result) => {
          if (err) reject(err);
          else resolve(result[0].total || 0);
        }
      );
    }),
    
    proximosAgendamentos: new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM agendamentos WHERE data >= ? ORDER BY data, hora LIMIT 5',
        [hoje],
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    })
  };

  Promise.all(Object.values(queries))
    .then(([agendamentosHoje, receitaHoje, receitaMensal, proximosAgendamentos]) => {
      res.json({
        agendamentosHoje,
        receitaHoje,
        receitaMensal,
        proximosAgendamentos
      });
    })
    .catch(err => {
      console.error('Erro ao buscar dados do dashboard:', err);
      res.status(500).json({ error: 'Erro interno do servidor' });
    });
});

// Relatório mensal
router.get('/mensal', verifyToken, (req, res) => {
  const { mes, ano } = req.query;
  const mesAtual = mes && ano ? `${ano}-${mes.padStart(2, '0')}` : new Date().toISOString().slice(0, 7);

  db.all(
    `SELECT 
      data,
      COUNT(*) as total_agendamentos,
      SUM(CASE WHEN status = 'Confirmado' THEN preco ELSE 0 END) as receita_dia,
      GROUP_CONCAT(servico) as servicos
     FROM agendamentos 
     WHERE data LIKE ? 
     GROUP BY data 
     ORDER BY data`,
    [`${mesAtual}%`],
    (err, relatorio) => {
      if (err) {
        console.error('Erro ao gerar relatório mensal:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      res.json({
        mes: mesAtual,
        dados: relatorio
      });
    }
  );
});

// Webhook para N8N
router.post('/n8n', (req, res) => {
  const { tipo, cliente, telefone, servico, data, hora } = req.body;

  if (tipo === 'novo_agendamento') {
    if (!cliente || !servico || !data || !hora) {
      return res.status(400).json({ error: 'Dados incompletos para agendamento' });
    }

    db.run(
      'INSERT INTO agendamentos (cliente_nome, servico, data, hora, status) VALUES (?, ?, ?, ?, ?)',
      [cliente, servico, data, hora, 'Pendente'],
      function(err) {
        if (err) {
          console.error('Erro ao criar agendamento via N8N:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        res.json({
          id: this.lastID,
          message: 'Agendamento criado com sucesso via N8N'
        });
      }
    );
  } else {
    res.status(400).json({ error: 'Tipo de operação não suportado' });
  }
});

export default router;

