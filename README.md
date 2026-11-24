# Buffet Manager — Projeto Final DAD

Aplicativo desktop para gestão de buffet e eventos, desenvolvido com Electron, TypeScript, HTML, CSS e MySQL 8. A interface e os módulos de clientes, eventos, cardápios, itens, fornecedores, profissionais, equipe, fretes e orçamentos foram preservados e ampliados.

## Requisitos

- Node.js 22 ou superior
- MySQL 8 em execução
- Base de dados `buffet_manager`

## Instalação e execução

1. Extraia o projeto.
2. Execute `npm install`.
3. Crie a base MySQL: `CREATE DATABASE buffet_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`.
4. Copie `.env.example` para `.env` e configure host, porta, usuário e senha MySQL. Na versão instalada, o arquivo também pode ser colocado em `%APPDATA%/BuffetManager/.env`.
5. Defina `ADMIN_INITIAL_EMAIL` e uma `ADMIN_INITIAL_PASSWORD` forte antes do primeiro acesso.
6. Execute `npm run db:init` para criar as tabelas e inserir os dados demonstrativos. A primeira inicialização do aplicativo também cria as tabelas e popula a base vazia.
7. Execute `npm start`.

O primeiro gestor é criado automaticamente apenas quando ainda não existe nenhum usuário. Com o `.env.example` sem alterações, o acesso inicial será `admin@buffet.local` / `AltereEstaSenhaForte123!`. Se não houver variáveis de administrador, o fallback de demonstração é `admin@buffet.local` / `Buffet@123`. Troque a senha antes de qualquer uso real.

## Comandos

| Comando | Finalidade |
|---|---|
| `npm start` | Compila TypeScript e inicia o Electron |
| `npm run build:ts` | Compila para `dist/` |
| `npm run check:ts` | Verifica tipos TypeScript |
| `npm run check` | Verifica TypeScript e sintaxe do renderer |
| `npm run db:init` | Cria o schema MySQL e insere amostras se a base estiver vazia |
| `npm run populate:event-costs` | Executa a carga complementar de custos de eventos |
| `npm run dist` | Gera instalador Windows |

## Funcionalidades e integrações

- **ViaCEP:** consulta CEP e preenche endereço, cidade e UF ao sair do campo CEP no cadastro de evento.
- **Open-Meteo:** previsão de temperatura e probabilidade de chuva para eventos, quando a data estiver dentro da janela de previsão.
- **OSRM + Nominatim:** geocodifica origem/destino e estima distância e duração para fretes. Serviços públicos possuem limites e disponibilidade externa.
- **E-mail real:** Resend (`RESEND_API_KEY`) ou SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`). Sem provedor configurado, o aplicativo informa que é necessário configurar o envio.
- **Autenticação:** senha com bcrypt e perfis gestor/atendente. Gestor pode excluir registros, gerar backup e criar usuários; atendente pode consultar e editar os dados operacionais.

Consulte [`docs/seguranca.md`](docs/seguranca.md) para decisões, perfis e recomendações de implantação.

## Dados demonstrativos

A seed `database/seeds/001_sample_data.sql` cadastra clientes fictícios, cardápios, itens, fornecedores, profissionais, três eventos e orçamentos. A carga automática ocorre somente quando a tabela de clientes está vazia, preservando bancos já utilizados.

## Estrutura

- `src/main/main.ts`: processo principal Electron e IPC protegido.
- `src/preload/preload.ts`: API isolada disponibilizada ao renderer.
- `src/main/services/`: classes de domínio, autenticação e integrações externas.
- `src/main/database-mysql-service.ts`, `mysql-connection.ts` e `database-auto-init.ts`: persistência MySQL e inicialização compiladas pelo TypeScript.
- `src/renderer/`: interface original preservada e ampliada.
- `database/migrations/` e `database/seeds/`: estrutura e dados de demonstração MySQL.
- `docs/seguranca.md`: documentação de segurança.

## Observação

O aplicativo usa um único banco: MySQL. O processo principal e o preload são TypeScript compilados para `dist/`; a interface original foi mantida visualmente e seu código também é compilado de TypeScript para `dist/renderer/renderer.js`.
