---
name: Navigation Structure
description: Dashboard sidebar grouped into Overview, Intelligence, Actions, Extras (with Assinatura) and Administração
type: feature
---

A navegação do dashboard é organizada em quatro grupos lógicos para clareza executiva:

1. **Visão Geral**: Dashboard, Diagnóstico IA, Evolução Estratégica.
2. **Inteligência**: Monitoramento Multi-IA, Análise Comparativa, Dominância por Modelo, Score GEO, Análise de Sentimento, Simulador de Influência, Prompt Tester.
3. **Ações**: Planos de Ação, Mapa de Prompts, Alertas, Campanhas.
4. **Extras**: Relatórios, **Assinatura** (área financeira/pagamento), Configurações.

Grupo extra **Administração** (visível só para admins): Painel Admin, Clientes, Leads.

Item "Assinatura" (`/dashboard/assinatura`, ícone `CreditCard`) é a área onde o cliente vê plano atual, próxima cobrança, forma de pagamento e histórico de faturas. Atualmente em modo "Demonstração" — interface visual realista com mocks até o gateway (Stripe/Paddle) ser plugado. Botões sensíveis abrem modal "Disponível em breve". O CTA "Mudar plano" abre o `UpgradeModal` (mesmo do TrialBanner) para manter consistência.
