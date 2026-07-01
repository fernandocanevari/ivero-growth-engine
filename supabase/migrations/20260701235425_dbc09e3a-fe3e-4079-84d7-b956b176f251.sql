
-- PROMPT 3.5 — Migração de concorrentes
WITH legacy AS (
  SELECT id AS brand_id, trim(main_competitor) AS nome
  FROM public.brand_settings
  WHERE main_competitor IS NOT NULL AND length(trim(main_competitor)) > 0
  UNION ALL
  SELECT bs.id AS brand_id, trim(item) AS nome
  FROM public.brand_settings bs,
       LATERAL regexp_split_to_table(coalesce(bs.other_competitors, ''), '[,;\n]') AS item
  WHERE length(trim(item)) > 0
)
INSERT INTO public.competitors (brand_id, nome, sugerido_por_ia, aprovado_pelo_usuario)
SELECT DISTINCT ON (l.brand_id, lower(l.nome)) l.brand_id, l.nome, false, true
FROM legacy l
WHERE NOT EXISTS (
  SELECT 1 FROM public.competitors c
  WHERE c.brand_id = l.brand_id
    AND lower(c.nome) = lower(l.nome)
);

ALTER TABLE public.brand_settings DROP COLUMN IF EXISTS main_competitor;
ALTER TABLE public.brand_settings DROP COLUMN IF EXISTS other_competitors;
