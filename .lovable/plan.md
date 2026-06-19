Renomear o item de menu "Relatórios" para "Análise de Resultados" e manter a consistência entre sidebar, breadcrumb e título da página.

Mudanças:
1. `src/components/dashboard/DashboardSidebar.tsx` — alterar o título do item `/dashboard/auditorias` de "Relatórios" para "Análise de Resultados".
2. `src/components/dashboard/DashboardBreadcrumb.tsx` — espelhar a mesma alteração no breadcrumb (menuGroups).
3. `src/components/dashboard/DashboardBreadcrumb.test.tsx` — atualizar o teste de rota aninhada `/dashboard/auditorias/abc-123` para esperar "Análise de Resultados".
4. `src/pages/dashboard/AuditoriasPage.tsx` — ajustar o título da página e o subtítulo para refletir o novo nome (ex.: "Análise de Resultados" / "Histórico completo das análises da sua marca.").

Resultado esperado: o menu na Visão Geral passa a se chamar "Análise de Resultados", o breadcrumb acompanha e a página exibe o novo título, eliminando a confusão com "Exportar Dados" nos Extras.