import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, AlertTriangle } from "lucide-react";
import { InfoTooltip } from "@/components/InfoTooltip";
import { BRAZIL_UFS, type CoverageType } from "@/lib/brand-coverage";

export interface BrandCoverageValues {
  coverage_type: CoverageType;
  coverage_city: string;
  coverage_state: string;
  coverage_region: string;
}

interface Props {
  values: BrandCoverageValues;
  onChange: (next: BrandCoverageValues) => void;
}

/**
 * Card editável de Abrangência Geográfica.
 * Reutilizado em Configurações e Diagnóstico.
 *
 * IMPORTANTE: o objetivo é capturar onde a marca ATUA comercialmente,
 * não onde fica a sede da empresa. Toda a copy reforça isso para evitar
 * que clientes nacionais (com sede em uma cidade) marquem por engano
 * "Regional" e tenham o diagnóstico calibrado como marca de bairro.
 */
export function BrandCoverageSection({ values, onChange }: Props) {
  const isRegional = values.coverage_type === "regional";

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">
            Onde sua marca <span className="text-primary">atua e quer ser encontrada</span>
          </h2>
          <InfoTooltip text="Se sua sede é em SP mas você vende para todo o Brasil, escolha Nacional. Regional é só para quem atende exclusivamente uma área específica." />
        </div>
        <p className="text-xs text-muted-foreground">
          Isso define o recorte do diagnóstico de IA — <strong>não é o endereço da sua empresa</strong>.
          Marque pela sua <strong>operação comercial</strong>, não pela localização da sede.
        </p>

        <RadioGroup
          value={values.coverage_type}
          onValueChange={(v) =>
            onChange({
              ...values,
              coverage_type: v as CoverageType,
              ...(v === "national"
                ? { coverage_city: "", coverage_state: "", coverage_region: "" }
                : {}),
            })
          }
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <label
            htmlFor="coverage-national"
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              !isRegional ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/40"
            }`}
          >
            <RadioGroupItem value="national" id="coverage-national" className="mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Nacional</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Atendo/vendo em todo o Brasil (e-commerce, SaaS, franquia/rede com presença ampla, marca nacional).
              </p>
            </div>
          </label>

          <label
            htmlFor="coverage-regional"
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              isRegional ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/40"
            }`}
          >
            <RadioGroupItem value="regional" id="coverage-regional" className="mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Regional</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Meu público está concentrado em uma cidade, estado ou região (padaria de bairro, clínica local, imobiliária regional, restaurante de uma cidade).
              </p>
            </div>
          </label>
        </RadioGroup>

        {isRegional && (
          <>
            <Alert className="border-amber-300 bg-amber-50 text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <AlertDescription className="text-xs leading-relaxed">
                <strong>Confirme:</strong> marque Regional apenas se sua <strong>operação comercial</strong> for restrita a essa área.
                Se você só tem sede aqui mas vende para o Brasil inteiro, volte e escolha <strong>Nacional</strong> —
                caso contrário, o diagnóstico vai te avaliar como marca de bairro.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <Label>
                  Cidade onde <span className="text-primary">a marca atua</span> <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={values.coverage_city}
                  onChange={(e) => onChange({ ...values, coverage_city: e.target.value })}
                  className="mt-1"
                  placeholder="Ex: São Paulo"
                />
              </div>
              <div>
                <Label>
                  Estado (UF) <span className="text-primary">de atuação</span> <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={values.coverage_state || undefined}
                  onValueChange={(v) => onChange({ ...values, coverage_state: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAZIL_UFS.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Região de atuação comercial (opcional)</Label>
                <Input
                  value={values.coverage_region}
                  onChange={(e) => onChange({ ...values, coverage_region: e.target.value })}
                  className="mt-1"
                  placeholder='Ex: "Grande SP", "Vale do Paraíba"'
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function validateBrandCoverage(v: BrandCoverageValues): string | null {
  if (v.coverage_type === "regional") {
    if (!v.coverage_city.trim()) return "Informe a cidade da abrangência regional.";
    if (!v.coverage_state.trim()) return "Informe o estado (UF) da abrangência regional.";
  }
  return null;
}
