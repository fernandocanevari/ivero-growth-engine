ALTER TABLE public.profiles
  ADD COLUMN cep text NULL CHECK (cep ~ '^[0-9]{8}$'),
  ADD COLUMN logradouro text NULL,
  ADD COLUMN numero_endereco text NULL,
  ADD COLUMN bairro text NULL,
  ADD COLUMN cidade text NULL,
  ADD COLUMN uf text NULL CHECK (uf ~ '^[A-Za-z]{2}$');