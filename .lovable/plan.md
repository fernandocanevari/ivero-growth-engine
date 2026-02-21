

## Conectar Backend Real ao Supabase -- Campanhas e Configuracoes

### O que sera feito

Criar as tabelas no Supabase para persistir dados de **campanhas** e **configuracoes da marca**, substituindo os dados mockados por dados reais do banco. Como a autenticacao sera implementada depois, as tabelas terao RLS desabilitado temporariamente.

### Tabelas a criar

**1. brand_settings** (configuracoes da marca)

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | Identificador unico |
| brand_name | text | Nome da marca |
| website | text | URL do site |
| sector | text | Setor de atuacao |
| main_competitor | text | Concorrente principal |
| other_competitors | text | Outros concorrentes (separados por virgula) |
| created_at | timestamptz | Data de criacao |
| updated_at | timestamptz | Data de atualizacao |

**2. campaigns** (campanhas)

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | Identificador unico |
| name | text | Nome da campanha |
| objective | text | Objetivo da campanha |
| status | text | Status: draft, active, completed |
| start_date | date | Data inicio |
| end_date | date | Data fim |
| keywords | text | Palavras-chave |
| mentions | integer | Total de mencoes (default 0) |
| score | integer | Score da campanha (default 0) |
| created_at | timestamptz | Data de criacao |
| updated_at | timestamptz | Data de atualizacao |

### Dados iniciais

Inserir um registro de `brand_settings` com os dados mockados atuais (TechNova) e os 4 registros de campanhas ja existentes no mock.

### Alteracoes no codigo

**Novos arquivos:**
- `src/hooks/useBrandSettings.ts` -- hook com React Query para buscar/atualizar configuracoes da marca
- `src/hooks/useCampaigns.ts` -- hook com React Query para CRUD de campanhas

**Arquivos modificados:**
- `src/pages/dashboard/ConfiguracoesPage.tsx` -- substituir inputs estaticos por formulario controlado que salva no Supabase
- `src/pages/dashboard/CampanhasPage.tsx` -- buscar campanhas do banco ao inves do mock-data
- `src/pages/dashboard/NovaCampanhaPage.tsx` -- salvar nova campanha no Supabase
- `src/pages/dashboard/DashboardOverview.tsx` -- buscar dados reais de campanhas/marca para os cards de resumo

### Seguranca (temporario)

Como a autenticacao ainda nao foi implementada:
- RLS ficara **desabilitado** temporariamente nas duas tabelas
- Quando implementarmos login, adicionaremos uma coluna `user_id` e politicas RLS para cada usuario ver apenas seus dados

### Ordem de implementacao

1. Criar as tabelas no Supabase via migration
2. Inserir dados iniciais (mock -> banco)
3. Criar hooks React Query (useBrandSettings, useCampaigns)
4. Atualizar ConfiguracoesPage para ler/salvar do Supabase
5. Atualizar CampanhasPage para listar do Supabase
6. Atualizar NovaCampanhaPage para inserir no Supabase

