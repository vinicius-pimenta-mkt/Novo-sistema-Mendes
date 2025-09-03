import express from 'express';
import db from '../database/init.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Listar todos os agendamentos
router.get('/', verifyToken, (req, res) => {
  const { data, status } = req.query;
  let query = 'SELECT * FROM agendamentos';
  let params = [];

  if (data || status) {
    query += ' WHERE';
    const conditions = [];
    
    if (data) {
      conditions.push(' data = ?');
      params.push(data);
    }
    
    if (status) {
      conditions.push(' status = ?');
      params.push(status);
    }
    
    query += conditions.join(' AND');
  }
  
  query += ' ORDER BY data, hora';

  db.all(query, params, (err, agendamentos) => {
    if (err) {
      console.error('Erro ao buscar agendamentos:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    res.json(agendamentos);
  });
});

// Agendamentos de hoje
router.get('/hoje', verifyToken, (req, res) => {
  const hoje = new Date().toISOString().split('T')[0];
  
  db.all(
    'SELECT * FROM agendamentos WHERE data = ? ORDER BY hora',
    [hoje],
    (err, agendamentos) => {
      if (err) {
        console.error('Erro ao buscar agendamentos de hoje:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      res.json(agendamentos);
    }
  );
});

// Buscar agendamento por ID
router.get('/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM agendamentos WHERE id = ?', [id], (err, agendamento) => {
    if (err) {
      console.error('Erro ao buscar agendamento:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    if (!agendamento) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    res.json(agendamento);
  });
});

// Criar novo agendamento
router.post('/', (req, res) => {
  const { cliente_nome, servico, data, hora, status = 'Pendente', preco, observacoes, cliente_id } = req.body;

  if (!cliente_nome || !servico || !data || !hora) {
    return res.status(400).json({ error: 'Cliente, serviço, data e hora são obrigatórios' });
  }

  db.run(
    'INSERT INTO agendamentos (cliente_id, cliente_nome, servico, data, hora, status, preco, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [cliente_id, cliente_nome, servico, data, hora, status, preco, observacoes],
    function(err) {
      if (err) {
        console.error('Erro ao criar agendamento:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      res.status(201).json({
        id: this.lastID,
        cliente_nome,
        servico,
        data,
        hora,
        status,
        preco,
        observacoes,
        message: 'Agendamento criado com sucesso'
      });
    }
  );
});

// Atualizar agendamento
router.put('/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const { cliente_nome, servico, data, hora, status, preco, observacoes } = req.body;

  if (!cliente_nome || !servico || !data || !hora) {
    return res.status(400).json({ error: 'Cliente, serviço, data e hora são obrigatórios' });
  }

  db.run(
    'UPDATE agendamentos SET cliente_nome = ?, servico = ?, data = ?, hora = ?, status = ?, preco = ?, observacoes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [cliente_nome, servico, data, hora, status, preco, observacoes, id],
    function(err) {
      if (err) {
        console.error('Erro ao atualizar agendamento:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Agendamento não encontrado' });
      }
      
      res.json({ message: 'Agendamento atualizado com sucesso' });
    }
  );
});

// Deletar agendamento
router.delete('/:id', verifyToken, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM agendamentos WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Erro ao deletar agendamento:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    res.json({ message: 'Agendamento deletado com sucesso' });
  });
});

export default router;

