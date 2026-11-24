const { app, BrowserWindow, ipcMain, dialog } = require('electron') as any;
const fs = require('node:fs') as any;
const path = require('node:path') as any;
import { AuthService } from './services/auth';
import { ViaCepApi, WeatherApi, RouteApi, EmailService } from './services/integrations';
import { ClienteRepository, EventoService, OrcamentoService } from './services/domain';
const { ensureMySQLSchema } = require('./database-auto-init') as { ensureMySQLSchema: () => Promise<unknown> };
const viaCep = new ViaCepApi(); const weather = new WeatherApi(); const routes = new RouteApi(); const email = new EmailService();
const clientes = new ClienteRepository(); const eventos = new EventoService(); const orcamentos = new OrcamentoService();
const dataPath = path.join(app.getPath('appData'), 'BuffetManager');
fs.mkdirSync(dataPath, { recursive: true }); app.setPath('userData', dataPath); process.env.BUFFET_USER_DATA = dataPath;
const mysqlService = require('./database-mysql-service') as any;
const mysqlConnection = require('./mysql-connection') as { getPool: () => Promise<any>; closePool: () => Promise<void> };
const auth = new AuthService(mysqlConnection.getPool);
function createWindow(): void {
  const window = new BrowserWindow({ width: 1250, height: 820, minWidth: 900, minHeight: 650, title: 'Buffet Manager', backgroundColor: '#f5f7fb', webPreferences: { preload: path.join(__dirname, '../preload/preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  window.loadFile(path.join(__dirname, '../../src/renderer/index.html'));
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' })); window.webContents.on('will-navigate', (e: any) => e.preventDefault());
}
function session(token: string): void { auth.autenticar(token); }
function register(): void {
  ipcMain.handle('auth:login', (_e: any, emailValue: string, password: string) => auth.login(emailValue, password));
  ipcMain.handle('auth:logout', (_e: any, token: string) => auth.logout(token));
  ipcMain.handle('auth:me', (_e: any, token: string) => auth.autenticar(token));
  ipcMain.handle('auth:create-user', (_e: any, token: string, data: any) => auth.criarUsuario(token, data.nome, data.email, data.password, data.perfil));
  ipcMain.handle('definitions', (_e: any, token: string) => { session(token); return mysqlService.definitions; });
  ipcMain.handle('list', async (_e: any, token: string, table: string) => { session(token); return mysqlService.list(table); });
  ipcMain.handle('get', async (_e: any, token: string, table: string, id: number) => { session(token); return mysqlService.get(table, id); });
  ipcMain.handle('save', async (_e: any, token: string, table: string, data: any) => { session(token); return mysqlService.save(table, data); });
  ipcMain.handle('remove', async (_e: any, token: string, table: string, id: number) => { auth.exigirGestor(token); return mysqlService.remove(table, id); });
  ipcMain.handle('dashboard', async (_e: any, token: string) => { session(token); return mysqlService.dashboard(); });
  ipcMain.handle('quote-detail', async (_e: any, token: string, id: number) => { session(token); return orcamentos.detalhar(id); });
  ipcMain.handle('backup', async (_e: any, token: string) => { auth.exigirGestor(token); const { canceled, filePath } = await dialog.showSaveDialog({ title: 'Salvar backup do Buffet Manager', defaultPath: 'buffet-backup.sql', filters: [{ name: 'Backup MySQL', extensions: ['sql'] }] }); if (canceled || !filePath) return null; return mysqlService.backup(filePath); });
  ipcMain.handle('send-email', async (_e: any, token: string, payload: any) => { session(token); return email.enviar(payload?.to, payload?.subject, payload?.body); });
  ipcMain.handle('weather', (_e: any, token: string, location: string, date: string) => { session(token); return weather.previsao(location, date); });
  ipcMain.handle('via-cep', (_e: any, token: string, cep: string) => { session(token); return viaCep.buscar(cep); });
  ipcMain.handle('route', (_e: any, token: string, origin: string, destination: string) => { session(token); return routes.calcular(origin, destination); });
  ipcMain.handle('event:confirm', (_e: any, token: string, id: number) => { session(token); return eventos.confirmar(id); });
  ipcMain.handle('client:list', (_e: any, token: string) => { session(token); return clientes.listar(); });
}
app.whenReady().then(async () => {
  await ensureMySQLSchema();
  const pool = await mysqlConnection.getPool();
  const [sampleRows] = await pool.query('SELECT COUNT(*) AS total FROM clientes') as any;
  if (Number(sampleRows[0].total) === 0) {
    const seedPath = path.resolve(__dirname, '../../database/seeds/001_sample_data.sql');
    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf8').replace(/^\s*--.*$/gm, '');
      const statements = seedSql.split(/;\s*(?:\r?\n|$)/).map((sql: string) => sql.trim()).filter((sql: string) => sql);
      for (const statement of statements) await pool.query(statement);
    }
  }
  await auth.inicializar(); register(); createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}).catch((error: Error) => { console.error('[Inicialização]', error); app.whenReady().then(() => dialog.showErrorBox('Falha ao iniciar', `Não foi possível conectar ao MySQL. Verifique o .env e o serviço MySQL.\n\n${error.message}`)); });
app.on('before-quit', () => { void mysqlConnection.closePool(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
