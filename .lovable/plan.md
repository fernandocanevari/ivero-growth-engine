

## Refinos no PreviewPage — alinhar copy ao modelo "conta grátis + dashboard pago"

### Decisão de negócio confirmada
Não é freemium. Lead cria conta grátis para acessar o **diagnóstico completo + histórico**, mas o **dashboard executivo** (5 pilares aprofundados, monitoramento contínuo, alertas, comparativo) exige assinatura. Os selos precisam refletir isso sem mentir nem assustar.

---

### 1. Cards de Pilar — limpeza visual (`PreviewPage.tsx` ~1031-1033 e 1047-1055)

- Remover o pill duplicado `pillar.status` ("Moderado", "Forte", etc.) — fica só a badge da banda + score `INSUFICIENTE 43/100`.
- Remover o bloco "Detalhamento por sub-critério (rubrica de 3 fatores ponderados...)" — protege o segredo do modelo.

### 2. CTA WhatsApp (~1100)
Remover **"Fale com a gente e descubra como."** Manter apenas: *"Sua marca merece aparecer nas respostas das IAs."*

### 3. CTA dark principal — corrigir promessa enganosa

Trocar selos atuais por copy honesto e ainda atraente:

| Antes (engana) | Depois (verdadeiro + sedutor) |
|---|---|
| ✓ 100% grátis | ✓ **Diagnóstico grátis** |
| ✓ Sem cartão | ✓ **Sem cartão para começar** |
| ✓ Cancele quando quiser | ✓ **Cancele quando quiser** |

Subtítulo do botão muda de "Criar conta gratuita" para **"Criar minha conta — é grátis"** (deixa claro que a *conta* é grátis, não tudo).

### 4. Loading screen — copy emocional (linhas 67-74)

Substituir os 6 textos técnicos por narrativa de tensão/desejo (ícones permanecem):

| # | Atual | Novo |
|---|---|---|
| 1 | Analisando seu site... | **Investigando como as IAs enxergam sua marca...** |
| 2 | Coletando dados estruturais... | **Mapeando sua presença em ChatGPT, Gemini, Claude...** |
| 3 | Processando informações comportamentais... | **Cruzando seu posicionamento com o dos concorrentes...** |
| 4 | Consultando modelos de IA... | **Detectando onde sua marca está sendo ignorada...** |
| 5 | Consolidando insights... | **Calculando o custo da sua invisibilidade...** |
| 6 | Gerando diagnóstico final... | **Revelando o caminho para virar referência...** |

### 5. Novo CTA final — fechamento estratégico (após linha 1213)

Bloco compacto dark gradient (mesma identidade do CTA principal, porém **menor**: `p-5`, headline `text-xl/2xl`, botão `h-11`, max-w-2xl centralizado). Aparece como última coisa do report.

```text
┌─────────────────────────────────────────────────────┐
│  Sua marca pode dominar as respostas das IAs.       │
│  Comece grátis hoje.                                │
│                                                     │
│       [ Quero subir de patamar  → ]                 │
│                                                     │
│  Diagnóstico completo grátis · sem cartão           │
└─────────────────────────────────────────────────────┘
```

- Headline: **"Sua marca pode dominar as respostas das IAs."** + linha 2 em gradiente magenta: *"Comece grátis hoje."*
- Botão branco sólido sobre fundo escuro: **"Quero subir de patamar"** (seta com slide-right no hover) → `/auth?intent=signup`
- Microcopy abaixo do botão: *"Diagnóstico completo grátis · sem cartão"*

### Arquivo modificado

- `src/pages/PreviewPage.tsx` — 5 edições pontuais (linhas 67-74, 1031-1033, 1047-1055, 1100, selos do CTA dark) + inserção de novo bloco final após 1213.

