const express = require('express');
const path = require('path');
const router = express.Router();

// Simulação de banco de dados
const users = []; // [{ username, email, password }]
const messagesStore = []; // [{ sender, recipient, message, timestamp }]

// Middleware para proteger rotas
const requireLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect('/');
  }
};

// Rota de login (GET)
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Rota de login (POST)
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Verifica se o usuário existe
  const user = users.find((u) => u.username === username);

  if (!user) {
    return res.status(401).json({ success: false, message: 'Usuário não encontrado!' });
  }

  // Verifica se a senha está correta
  if (user.password !== password) {
    return res.status(401).json({ success: false, message: 'Senha incorreta!' });
  }

  // Login bem-sucedido
  const now = new Date();
  req.session.loggedIn = true;
  req.session.username = username;

  res.cookie('lastAccess', now.toISOString(), { maxAge: 30 * 60 * 1000, httpOnly: true });
  res.json({ success: true });
});

// Rota para obter o usuário logado
router.get('/user', (req, res) => {
  if (req.session.loggedIn) {
    res.json({ username: req.session.username });
  } else {
    res.status(401).json({ error: 'Usuário não está logado' });
  }
});

// Rota de logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect('/main');
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

// Rota de cadastro (GET)
router.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/register.html'));
});

// Rota de cadastro (POST)
router.post('/cadastrarUsuario', (req, res) => {
  const { name: username, email, password } = req.body;

  // Validação de campos obrigatórios
  if (!username || username.length < 3) {
    return res.status(400).send('O nome de usuário deve ter pelo menos 3 caracteres.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).send('Insira um email válido.');
  }

  if (!password || password.length < 4) {
    return res.status(400).send('A senha deve ter pelo menos 4 caracteres.');
  }

  // Verificar se o usuário já existe
  const existingUser = users.find((u) => u.username === username || u.email === email);
  if (existingUser) {
    return res.status(400).send('Usuário ou email já cadastrado.');
  }

  // Cadastrar novo usuário
  users.push({ username, email, password });
  res.redirect('/');
});

// Rota para obter os usuários cadastrados
router.get('/users', (req, res) => {
  if (req.session.loggedIn) {
    const filteredUsers = users.filter((u) => u.username !== req.session.username);
    res.json(filteredUsers); // Retorna a lista de usuários, excluindo o logado
  } else {
    res.status(401).json({ error: 'Usuário não está logado' });
  }
});

// Rota para enviar mensagem
router.post('/send-message', (req, res) => {
  const { recipient, message } = req.body;
  const sender = req.session.username;

  if (!recipient || !message) {
    return res.status(400).json({ success: false, message: 'Destinatário e mensagem são obrigatórios.' });
  }

  // Adiciona a mensagem ao armazenamento
  messagesStore.push({
    sender,
    recipient,
    message,
    timestamp: new Date(),
  });

  res.json({ success: true });
});

// Rota para obter mensagens
router.get('/get-messages/:recipient', (req, res) => {
  const { recipient } = req.params;
  const username = req.session.username;

  if (!username) {
    return res.status(401).json({ error: 'Usuário não está logado' });
  }

  // Filtra mensagens que envolvam o usuário logado e o destinatário
  const conversation = messagesStore.filter(
    (msg) =>
      (msg.sender === username && msg.recipient === recipient) ||
      (msg.sender === recipient && msg.recipient === username)
  );

  res.json(conversation);
});

// Rota protegida para acessar o main
router.get('/main', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/main.html'));
});

module.exports = router;
