import type { Orcamento, DashboardMetrics } from './models';
export {};
declare global {
  interface Window {
    buffet: {
      login(email: string, password: string): Promise<{ token: string; user: { id: number; nome: string; email: string; perfil: 'gestor' | 'atendente' } }>;
      logout(token: string): Promise<void>;
      me(token: string): Promise<{ id: number; nome: string; email: string; perfil: 'gestor' | 'atendente' }>;
      createUser(token: string, data: { nome: string; email: string; password: string; perfil: 'gestor' | 'atendente' }): Promise<number>;
      definitions(token: string): Promise<Record<string, { label: string; fields: Record<string, string> }>>;
      list(token: string, table: string): Promise<unknown[]>;
      get(token: string, table: string, id: number): Promise<unknown>;
      save(token: string, table: string, data: Record<string, unknown>): Promise<number>;
      remove(token: string, table: string, id: number): Promise<boolean>;
      dashboard(token: string): Promise<DashboardMetrics>;
      quoteDetail(token: string, id: number): Promise<Orcamento>;
      backup(token: string): Promise<string | null>;
      sendEmail(token: string, payload: { to: string; subject: string; body: string }): Promise<boolean>;
      weather(token: string, location: string, date: string): Promise<unknown>;
      viaCep(token: string, cep: string): Promise<unknown>;
      route(token: string, origin: string, destination: string): Promise<{ distanciaKm: number; duracaoMinutos: number }>;
      confirmEvent(token: string, id: number): Promise<number>;
    };
  }
}
