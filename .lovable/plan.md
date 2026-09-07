# Banner "Perfil da Marca" desaparece após o primeiro "Revisar"

## Estado atual verificado

- O banner fica no Painel (`DashboardOverview`), sempre visível, com texto "Suas respostas estratégicas estão salvas. Revise quando quiser." e botão "Revisar" que abre o modal das 3 perguntas.
- Já existe um mecanismo de "dispensado" no projeto: o campo `dashboard_hint_dismissed_at` em `onboarding_responses`, usado pelo card "Comece por aqui".
- A tela de Configurações hoje tem os blocos Dados da Marca, Dados de Contato, Concorrentes e Modelos de IA — não tem nenhum acesso às respostas estratégicas.

## O que será feito

1. Novo campo `perfil_revisado_em` em `onboarding_responses` (mesmo padrão do "dispensado" já existente).
2. No Painel, ao clicar em "Revisar" pela primeira vez: grava a data e o banner desaparece imediatamente e em todas as visitas futuras. Sem opção de reexibir.
   - Para quem ainda não respondeu as perguntas, o banner continua aparecendo com "Responder" — ele só sai definitivamente após o clique em "Revisar" (perfil já respondido).
3. Em Configurações, um novo bloco "Respostas Estratégicas" com botão para abrir o mesmo modal de revisão — acesso permanente.

## Detalhes técnicos

- Migração: `ALTER TABLE public.onboarding_responses ADD COLUMN perfil_revisado_em timestamptz`.
- `useOnboardingResponses.ts`: expor o novo campo e adicionar mutation `markPerfilRevisado(id)` que grava `now()` apenas quando ainda nulo (mesma forma do `useDismissDashboardHint`).
- `DashboardOverview.tsx`: esconder o card quando `perfil_revisado_em != null`; no `onClick` do botão, disparar a mutation antes/junto de abrir o modal (só quando o perfil já está completo).
- `ConfiguracoesPage.tsx`: bloco novo com `BrandProfileModal` controlado por estado local, sem tocar na lógica do modal.
- Sem alterações em `simulate-ai`, pricing ou fluxos de checkout.

## Teste

- Conta que nunca clicou: banner presente no Painel.
- Após um clique em "Revisar": banner sai na hora e não volta ao navegar/recarregar.
- Configurações continua permitindo revisar/editar as respostas.
