ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf_cnpj text NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_cpf_cnpj_digits_chk
  CHECK (cpf_cnpj IS NULL OR cpf_cnpj ~ '^[0-9]{11}$' OR cpf_cnpj ~ '^[0-9]{14}$');