/** Camada de domínio: serviços e repositórios orientados a objetos. */
const service = (): any => require('../database-mysql-service');

export class ClienteRepository {
  listar(): Promise<unknown[]> { return service().list('clientes'); }
  buscar(id: number): Promise<unknown> { return service().get('clientes', id); }
  salvar(data: Record<string, unknown>): Promise<number> { return service().save('clientes', data); }
}
export class EventoService {
  listar(): Promise<unknown[]> { return service().list('eventos'); }
  salvar(data: Record<string, unknown>): Promise<number> { return service().save('eventos', data); }
  async confirmar(id: number): Promise<number> { const event = await service().get('eventos', id); if (!event) throw new Error('Evento não encontrado.'); return service().save('eventos', { ...event, status: 'Confirmado' }); }
}
export class OrcamentoService {
  detalhar(id: number): Promise<unknown> { return service().quoteDetail(id); }
  salvar(data: Record<string, unknown>): Promise<number> { return service().save('orcamentos', data); }
}
