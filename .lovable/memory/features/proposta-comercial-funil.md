---
name: Funil Proposta de Valor + Comercial
description: Páginas públicas /propostadevalor (manifesto) e /propostacomercial (diagnóstico leve + proposta gerada por regras + lead capture no fim)
type: feature
---
Funil consultivo separado da landing principal, no padrão dark do Hero.

Fluxo:
- /propostadevalor → manifesto disruptivo (hero + problema + virada + 5 pilares + urgência + CTA), input do site → /propostacomercial?url=...
- /propostacomercial → loading premium 7s → diagnóstico enxuto (score + 5 barras coloridas) → proposta personalizada → CTA "Falar com especialista" → modal captura (nome+email+telefone) → insert em leads com source='proposta_comercial'

Edge function: `propose-diagnostic` (Gemini 2.0 Flash + Claude 3.5 Haiku em paralelo, ~10s, sem nuvem de percepção, sem JWT). Reutiliza prompt base da simulate-ai mas pede só score+justificativa por pilar.

Lib `src/lib/commercial-proposal.ts`: regras determinísticas — pilares <60 viram weakPoints com ação, score geral mapeia plano (0-39 Domínio, 40-59 Autoridade, 60-79 Influência, 80+ Presença), preços/highlights espelhados de InvestSection.

Captura SÓ no CTA final (modal shadcn Dialog), nunca antes — proposta totalmente aberta para máxima qualidade do lead.

Páginas NÃO entram na navbar pública nem no sitemap — são páginas de funil para outbound/campanhas.

Link no rodapé da /propostacomercial leva para /preview (análise completa com 5 modelos + nuvem de percepção).
