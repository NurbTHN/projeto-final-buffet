'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const bcrypt = require('bcryptjs');

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, answer => resolve(answer.trim())));
}

async function main() {
  loadEnv();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let connection;
  try {
    const email = (await ask(rl, 'E-mail do administrador que deseja criar/recuperar: ')).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('E-mail inválido.');
    const password = await ask(rl, 'Nova senha (mínimo 10 caracteres): ');
    if (password.length < 10 || password.length > 200) throw new Error('A senha deve ter entre 10 e 200 caracteres.');
    const confirmation = await ask(rl, 'Confirme a nova senha: ');
    if (password !== confirmation) throw new Error('As senhas não coincidem.');

    const mysql = require('mysql2/promise');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'buffet_manager',
      connectTimeout: 10000
    });

    await connection.query(`CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(120) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      senha_hash VARCHAR(255) NOT NULL,
      perfil ENUM('gestor','atendente') NOT NULL DEFAULT 'atendente',
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    const hash = await bcrypt.hash(password, 12);
    const [rows] = await connection.execute('SELECT id FROM usuarios WHERE email=? LIMIT 1', [email]);
    if (rows.length) {
      await connection.execute("UPDATE usuarios SET senha_hash=?, perfil='gestor', ativo=1 WHERE id=?", [hash, rows[0].id]);
      console.log(`Senha redefinida. A conta ${email} agora tem perfil gestor e está ativa.`);
    } else {
      await connection.execute("INSERT INTO usuarios (nome,email,senha_hash,perfil,ativo) VALUES (?,?,?,'gestor',1)", ['Administrador', email, hash]);
      console.log(`Conta de gestor criada para ${email}.`);
    }
    console.log('Abra o Buffet Manager e entre com o e-mail e a nova senha informados.');
  } finally {
    rl.close();
    if (connection) await connection.end();
  }
}

main().catch(error => {
  console.error(`Não foi possível recuperar o acesso: ${error.message}`);
  process.exitCode = 1;
});
