import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";
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
 */
export function BrandCoverageSection({ values, onChange }: Props) {
  const isRegional = values.coverage_type === "regional";

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Abrangência Geográfica</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Informe se a marca atua em todo o Brasil ou em uma região específica. Isso calibra o diagnóstico de GEO.
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
              <p className="text-xs text-muted-foreground mt-0.5">Atuação em todo o Brasil.</p>
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
              <p className="text-xs text-muted-foreground mt-0.5">Atuação em cidade, estado ou região específica.</p>
            </div>
          </label>
        </RadioGroup>

        {isRegional && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <Label>
                Cidade <span className="text-destructive">*</span>
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
                Estado (UF) <span className="text-destructive">*</span>
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
              <Label>Região / Sub-região (opcional)</Label>
              <Input
                value={values.coverage_region}
                onChange={(e) => onChange({ ...values, coverage_region: e.target.value })}
                className="mt-1"
                placeholder='Ex: "Grande SP", "Vale do Paraíba"'
              />
            </div>
          </div>
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
