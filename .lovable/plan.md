

## Redesign completo da AudienceSection

O arquivo `src/components/landing/AudienceSection.tsx` sera completamente reescrito com o novo layout de duas colunas, ja com os textos corrigidos conforme solicitado.

### Estrutura

**Duas colunas** (grid `lg:grid-cols-2`):

- **Coluna esquerda**: Mockup de chat de IA simulado (busca + 3 resultados de produtos + input inferior), construido com HTML/CSS via Tailwind
- **Coluna direita**: Titulo + 4 pilulas com icones

### Textos finais (com acentos corretos)

**Titulo:** "A Ivero é para marcas que querem ser relevante nas IA's"

**Pilulas:**
1. Marcas que querem ser referências (icone: Building2)
2. Agências de MKT que querem vender o futuro (icone: Megaphone)
3. E-commerce que querem ser recomendados (icone: ShoppingBag)
4. Varejo que quer dominar a nova vitrine digital (icone: Store)

### Estilo visual

- Fundo escuro e limpo com gradientes sutis roxo/rosa (sem elementos tecnologicos pesados)
- Mockup do chat com fundo semi-transparente e bordas suaves
- Pilulas com icone, borda sutil e hover com `border-accent/30`
- Animacoes framer-motion mantidas

### Detalhes tecnicos

- Arquivo editado: `src/components/landing/AudienceSection.tsx`
- Icone `Store` importado de `lucide-react` (substituindo `Briefcase`)
- Chat mockup: divs estilizados com Tailwind simulando interface de IA
- Gradiente radial sutil no fundo da secao via divs com posicao absoluta

