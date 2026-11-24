import bcrypt from 'bcryptjs';
const { randomUUID } = require('node:crypto') as { randomUUID: () => string };
export type Perfil = 'gestor' | 'atendente';
export interface UsuarioSessao { id: number; nome: string; email: string; perfil: Perfil }
export class AuthService {
  private sessions = new Map<string, UsuarioSessao>();
  constructor(private poolProvider: () => Promise<any>) {}
  async inicializar(): Promise<void> {
    const pool = await this.poolProvider();
    await pool.query(`CREATE TABLE IF NOT EXISTS usuarios (id INT AUTO_INCREMENT PRIMARY KEY, nome VARCHAR(120) NOT NULL, email VARCHAR(190) NOT NULL UNIQUE, senha_hash VARCHAR(255) NOT NULL, perfil ENUM('gestor','atendente') NOT NULL DEFAULT 'atendente', ativo BOOLEAN NOT NULL DEFAULT TRUE, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    const [rows] = await pool.query('SELECT id FROM usuarios LIMIT 1') as any;
    if (!rows.length) {
      const hash = await bcrypt.hash(process.env.ADMIN_INITIAL_PASSWORD || 'Buffet@123', 12);
      await pool.execute('INSERT INTO usuarios (nome,email,senha_hash,perfil) VALUES (?,?,?,?)', ['Administrador', process.env.ADMIN_INITIAL_EMAIL || 'admin@buffet.local', hash, 'gestor']);
    }
  }
  async login(email: string, password: string): Promise<{ token: string; user: UsuarioSessao }> {
    if (typeof email !== 'string' || typeof password !== 'string' || password.length > 200) throw new Error('Informe e-mail e senha válidos.');
    const pool = await this.poolProvider();
    const [rows] = await pool.execute('SELECT id,nome,email,senha_hash,perfil FROM usuarios WHERE email=? AND ativo=1 LIMIT 1', [email.trim().toLowerCase()]) as any;
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.senha_hash))) throw new Error('E-mail ou senha incorretos.');
    const token = randomUUID();
    const session = { id: Number(user.id), nome: user.nome, email: user.email, perfil: user.perfil as Perfil };
    this.sessions.set(token, session);
    return { token, user: session };
  }
  autenticar(token: string): UsuarioSessao { const user = this.sessions.get(token); if (!user) throw new Error('Faça login para continuar.'); return user; }
  exigirGestor(token: string): UsuarioSessao { const user = this.autenticar(token); if (user.perfil !== 'gestor') throw new Error('Ação permitida somente ao gestor.'); return user; }
  logout(token: string): void { this.sessions.delete(token); }
  async criarUsuario(token: string, nome: string, email: string, password: string, perfil: Perfil): Promise<number> {
    this.exigirGestor(token);
    if (typeof nome !== 'string' || !nome.trim() || nome.trim().length > 120) throw new Error('Informe um nome válido.');
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) throw new Error('Informe um e-mail válido.');
    if (typeof password !== 'string' || password.length < 10 || password.length > 200) throw new Error('A senha deve ter entre 10 e 200 caracteres.');
    if (!['gestor', 'atendente'].includes(perfil)) throw new Error('Perfil inválido.');
    const hash = await bcrypt.hash(password, 12);
    const pool = await this.poolProvider();
    const [result] = await pool.execute('INSERT INTO usuarios (nome,email,senha_hash,perfil) VALUES (?,?,?,?)', [nome.trim(), email.trim().toLowerCase(), hash, perfil]) as any;
    return Number(result.insertId);
  }
}
