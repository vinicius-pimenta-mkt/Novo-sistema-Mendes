import express from 'express';
import { query } from '../database/supabase.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Listar todos os agendamentos
router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, status } = req.query;
    let queryText = 'SELECT * FROM agendamentos';
    let params = [];

    if (data || status) {
      queryText += ' WHERE';
      const conditions = [];
      
      if (data) {
        conditions.push(' data = $' + (params.length + 1));
        params.push(data);
      }
      
      if (status) {
        conditions.push(' status = $' + (params.length + 1));
        params.push(status);
      }
      
      queryText += conditions.join(' AND');
    }
    
    queryText += ' ORDER BY data, hora';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Agendamentos de hoje
router.get('/hoje', verifyToken, async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const result = await query(
      'SELECT * FROM agendamentos WHERE data = $1 ORDER BY hora',
      [hoje]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar agendamentos de hoje:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar agendamento por ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM agendamentos WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo agendamento
router.post('/', async (req, res) => {
  try {
    const { cliente_nome, servico, data, hora, status = 'Pendente', preco, observacoes, cliente_id } = req.body;

    if (!cliente_nome || !servico || !data || !hora) {
      return res.status(400).json({ error: 'Cliente, serviço, data e hora são obrigatórios' });
    }

    const result = await query(
      'INSERT INTO agendamentos (cliente_id, cliente_nome, servico, data, hora, status, preco, observacoes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [cliente_id, cliente_nome, servico, data, hora, status, preco, observacoes]
    );
    
    res.status(201).json({
      ...result.rows[0],
      message: 'Agendamento criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar agendamento
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { cliente_nome, servico, data, hora, status, preco, observacoes } = req.body;

    if (!cliente_nome || !servico || !data || !hora) {
      return res.status(400).json({ error: 'Cliente, serviço, data e hora são obrigatórios' });
    }

    const result = await query(
      'UPDATE agendamentos SET cliente_nome = $1, servico = $2, data = $3, hora = $4, status = $5, preco = $6, observacoes = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
      [cliente_nome, servico, data, hora, status, preco, observacoes, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    res.json({ message: 'Agendamento atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar agendamento
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM agendamentos WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    res.json({ message: 'Agendamento deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;

