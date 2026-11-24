# Segurança — Buffet Manager

## Autenticação e senhas

O acesso ao aplicativo exige e-mail e senha. As senhas nunca são armazenadas em texto puro: `bcryptjs` gera hashes com fator de custo 12 e cada hash usa salt próprio. A senha inicial do primeiro gestor é configurável por `ADMIN_INITIAL_PASSWORD` e deve ser alterada/rotacionada antes de uso real. O primeiro usuário é criado somente quando a tabela `usuarios` está vazia.

## Perfis e autorização

- **Gestor:** pode consultar e editar cadastros, excluir registros, gerar backups e criar contas.
- **Atendente:** pode consultar e cadastrar/editar informações operacionais, mas não pode excluir registros, gerar backups nem criar usuários.

A autorização é validada no processo principal do Electron em cada chamada IPC; esconder controles na interface não é considerado mecanismo de segurança.

## Banco de dados

O MySQL 8 com InnoDB é a única persistência da aplicação. Consultas com valores usam prepared statements. O nome das tabelas usado em consultas dinâmicas é validado por uma lista fixa de módulos. Configure um usuário MySQL dedicado, com permissões mínimas sobre a base `buffet_manager`; evite usar `root` em produção.

## Integrações externas

As chaves e credenciais de e-mail ficam em `.env`, nunca no renderer. Resend usa HTTPS; SMTP deve usar TLS/STARTTLS conforme o provedor. ViaCEP, Open-Meteo e OSRM são serviços externos e podem ficar indisponíveis; os dados retornados devem ser conferidos antes de fechar contratos ou calcular preço final.

## Boas práticas de implantação

1. Copie `.env.example` para `.env` e preencha credenciais fortes.
2. Não versione `.env`; ele está coberto pelo `.gitignore`.
3. Altere `ADMIN_INITIAL_PASSWORD` antes da primeira inicialização e proteja o acesso ao computador.
4. Restrinja acesso à máquina e ao servidor MySQL, mantenha backups SQL protegidos e teste a restauração.
5. Atualize dependências e mantenha o sistema operacional atualizado.
6. As sessões são mantidas em memória no processo principal e expiram ao encerrar o aplicativo.

## Limitações conhecidas

O login é local ao aplicativo desktop e não substitui uma solução centralizada de identidade para múltiplas máquinas. O tráfego entre o desktop e o MySQL deve ocorrer em rede confiável ou com TLS configurado no servidor/driver. Antes de produção, recomenda-se provisionar contas nominais para cada funcionário e substituir a senha inicial.
