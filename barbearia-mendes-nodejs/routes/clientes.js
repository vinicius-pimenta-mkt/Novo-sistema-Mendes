import express from 'express';
import db from '../database/init.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Listar todos os clientes
router.get('/', verifyToken, (req, res) => {
  db.all('SELECT * FROM clientes ORDER BY nome', (err, clientes) => {
    if (err) {
      console.error('Erro ao buscar clientes:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    res.json(clientes);
  });
});

// Buscar cliente por ID
router.get('/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM clientes WHERE id = ?', [id], (err, cliente) => {
    if (err) {
      console.error('Erro ao buscar cliente:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    res.json(cliente);
  });
});

// Criar novo cliente
router.post('/', verifyToken, (req, res) => {
  const { nome, telefone, email } = req.body;

  if (!nome) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }

  db.run(
    'INSERT INTO clientes (nome, telefone, email) VALUES (?, ?, ?)',
    [nome, telefone, email],
    function(err) {
      if (err) {
        console.error('Erro ao criar cliente:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      res.status(201).json({
        id: this.lastID,
        nome,
        telefone,
        email,
        message: 'Cliente criado com sucesso'
      });
    }
  );
});

// Atualizar cliente
router.put('/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const { nome, telefone, email } = req.body;

  if (!nome) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }

  db.run(
    'UPDATE clientes SET nome = ?, telefone = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [nome, telefone, email, id],
    function(err) {
      if (err) {
        console.error('Erro ao atualizar cliente:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }
      
      res.json({ message: 'Cliente atualizado com sucesso' });
    }
  );
});

// Deletar cliente
router.delete('/:id', verifyToken, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM clientes WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Erro ao deletar cliente:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    res.json({ message: 'Cliente deletado com sucesso' });
  });
});

export default router;

