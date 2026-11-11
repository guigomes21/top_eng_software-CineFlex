# CineFlex — Linha de Produto de Software

Projeto acadêmico de **Tópicos em Engenharia de Software**. Um catálogo de filmes que reutiliza uma arquitetura de **microserviços** e constrói variantes de produto com um **seletor de features**.

## Requisitos

- **Node.js 22.12 ou superior** e npm (consulte https://nodejs.org/).
- Windows, Linux ou macOS.
- Não precisa instalar banco de dados, Docker nem cadastrar chave de API.

## Como executar (Windows / PowerShell)

Abra o terminal **na pasta que contém este README** e execute:

```powershell
npm install
npm run dev
```

Depois acesse **http://localhost:5173**. O comando inicia os quatro servidores de backend e o frontend simultaneamente. Para parar tudo, pressione **Ctrl+C**.

O sistema inicial é o **CineFlex Básico**. Para iniciar diretamente na variante Plus (favoritos, filtros e tema escuro):

```powershell
npm run dev:plus
```

> A porta 5173 é do frontend, a 3000 é da API Gateway e as portas 4001, 4002 e 4003 são dos microserviços.

## O que já funciona

1. **Catálogo** de 18 filmes fictícios, busca e detalhes.
2. **Histórico**: ao abrir os detalhes, o frontend envia `POST /api/history`, que salva uma visualização para o perfil de demonstração em um arquivo JSON.
3. **Recomendação**: o microserviço consulta o histórico e o catálogo, conta os gêneros mais vistos, remove filmes já vistos e ordena os restantes. Sem histórico, recomenda filmes de maior nota.
4. **Variabilidade**: features obrigatórias (catálogo, detalhes, histórico e recomendações) e opcionais (favoritos, filtros e tema escuro).
5. **Configurador da LPS**: permite ativar/desativar opções, pré-visualizar as opções na interface e exportar um `.json`.
6. **Gerador de produtos**: o build utiliza a configuração selecionada para produzir uma versão estática separada do frontend.
7. **Painel de microserviços**: lista as portas e informa o status retornado pela Gateway.

## Construir duas variantes reais (LPS)

```powershell
npm run build:basic
npm run build:plus
```

Os builds ficam em:

- `dist/products/cineflex-basic`
- `dist/products/cineflex-plus`

Cada pasta contém um frontend compilado com **features fixadas no momento do build**. Os dois produtos compartilham os mesmos serviços do backend. Para executar um produto compilado, mantenha o backend ativo e, em outro terminal, execute (exemplo Plus):

```powershell
npm run preview -w @cineflex/web -- --outDir ../../dist/products/cineflex-plus
```

Abra **http://localhost:4173**.

### Gerar outra variante pelo configurador

1. Acesse **Configurador LPS** na barra lateral.
2. Marque as features opcionais, altere o nome e clique em **Pré-visualizar** para conferir o comportamento local (a pré-visualização não substitui o build).
3. Clique em **Baixar configuração JSON** e coloque o arquivo baixado na pasta `products`.
4. Gere a versão definitiva (substitua o nome do arquivo pelo nome escolhido):

```powershell
npm run build:product -- products/minha-variacao.json
```

> O configurador do navegador não compila diretamente o projeto. Ele exporta uma configuração que o gerador local utiliza para criar um **novo produto compilado**, sem editar manualmente o código do frontend.

## Estrutura

```text
cineflex/
├── apps/
│   └── web/                 # React + Vite + configurador de features
├── services/
│   ├── gateway/             # API Gateway HTTP (porta 3000)
│   ├── catalog/             # Catálogo de filmes (porta 4001)
│   ├── history/             # Histórico em JSON (porta 4002)
│   └── recommendation/      # Recomendação por gênero (porta 4003)
├── packages/
│   └── shared/              # Tipos e validador compartilhados
├── products/                # Definições dos produtos da LPS
├── scripts/build-product.mjs# Gera novo frontend a partir do JSON
└── README.md
```

## Rotas de API (Gateway)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/movies` | Lista todos os filmes |
| `GET` | `/api/movies/:id` | Busca um filme |
| `GET` | `/api/history/demo` | Recupera histórico do perfil Demo |
| `POST` | `/api/history` | Registra visualização (`{"profileId":"demo","movieId":3}`) |
| `GET` | `/api/recommendations/demo` | Retorna recomendações |
| `GET` | `/api/health` | Exibe status dos microserviços |

Para inspecionar no navegador: http://localhost:3000/api/health e http://localhost:3000/api/recommendations/demo.

## Testes e verificação

```powershell
npm test       # Testes unitários do recomendador e da validação de features
npm run check # Verificação estática de TypeScript
```

## Dados e persistência

O catálogo é carregado de `services/catalog/data/movies.json`. O histórico é criado automaticamente em `services/history/data/history.json` a partir de `history.seed.json` (esse arquivo gerado não é versionado). Para reiniciar a demonstração, pare o sistema e **exclua apenas** `history.json`; na próxima execução, os três registros de exemplo são restaurados. Favoritos são guardados no `localStorage` do navegador.

**Observação:** os filmes são inventados, e os ícones ilustrativos são emojis. O projeto não faz streaming, autenticação real ou integração com serviços externos. O registro simples em JSON é adequado ao protótipo acadêmico, não a uma aplicação concorrente em produção.

## Para documentar depois

Registre capturas de tela do catálogo, detalhes, histórico, recomendação, configurador, diferenças Básico/Plus e painel de portas. A estrutura permite preparar diagrama de features, diagrama de componentes, arquitetura em camadas, variabilidade, Product Backlog e Sprint Backlog. Essas partes do relatório ainda não foram redigidas.
