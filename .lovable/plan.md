# Clarificar "Abrangência" vs "Endereço da empresa"

## Objetivo

Evitar que clientes nacionais (ex: SaaS com sede em Campinas/SP, mas que vende para todo o Brasil) marquem por engano "Regional → Campinas/SP", o que faria o diagnóstico tratá-los como uma padaria de bairro.

Mudança apenas de **copy + UX**. Sem alterações em schema, score, edge functions ou lógica de `getGeoContext`.

## Escopo

Arquivo único: `src/components/dashboard/BrandCoverageSection.tsx`.

## Mudanças

1. **Título e subtítulo do card**
   - Título: "Onde sua marca **atua e quer ser encontrada**"
   - Subtítulo: "Isso define o recorte do diagnóstico de IA — não é o endereço da sua empresa. Marque pela sua **operação comercial**, não pela localização da sede."

2. **Tooltip (InfoTooltip)** ao lado do título com a regra resumida: "Se sua sede é em SP mas você vende para todo o Brasil, escolha Nacional. Regional é só para quem atende exclusivamente uma área."

3. **Opções do RadioGroup reescritas com exemplos concretos**
   - **Nacional**: "Atendo/vendo em todo o Brasil (e-commerce, SaaS, franquia/rede com presença ampla, marca nacional)."
   - **Regional**: "Meu público está concentrado em uma cidade, estado ou região específica (padaria de bairro, clínica local, imobiliária regional, restaurante de uma cidade)."

4. **Alerta inline** (componente `Alert` do shadcn, variante padrão com ícone `AlertTriangle`) que aparece **apenas quando `coverage_type === 'regional'`**, acima dos campos de cidade/estado:
   > "Confirme: marque Regional apenas se sua **operação comercial** for restrita a essa área. Se você só tem sede aqui mas vende para o Brasil inteiro, volte e escolha **Nacional** — caso contrário, o diagnóstico vai te avaliar como marca de bairro."

5. **Label dos campos** — trocar "Cidade" / "Estado (UF)" por:
   - "Cidade onde **a marca atua**"
   - "Estado (UF) **de atuação**"
   - Placeholder da região: manter, mas o helper text deixa claro "região de atuação comercial".

## Fora de escopo

- Não criar campo separado "Endereço da empresa".
- Não tocar em `brand_settings`, `getGeoContext`, edge functions ou `BrandCoverageInlineCard`.
- Não mexer em `ConfiguracoesPage` (continua usando o componente como wrapper).

## Memória

Adicionar uma linha em `mem://features/geo-context-injection`: "Copy de BrandCoverageSection deixa explícito atuação ≠ sede; alerta inline aparece ao marcar Regional."
