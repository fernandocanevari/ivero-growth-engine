import { useNavigate } from "react-router-dom";
import { Building2, Check, ChevronsUpDown, LayoutGrid } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAgencyBrands, useActiveBrandId, useSwitchBrand } from "@/hooks/useAgencyBrands";

/** Seletor de marca ativa — exibido apenas para contas de agência. */
export function BrandSwitcher() {
  const navigate = useNavigate();
  const { data: brands = [] } = useAgencyBrands();
  const activeId = useActiveBrandId();
  const switchBrand = useSwitchBrand();
  const active = brands.find((b) => b.id === activeId) ?? brands[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Trocar marca"
        className="w-full flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left hover:border-primary/50 transition-colors"
      >
        <Building2 className="h-4 w-4 text-primary shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Marca ativa</span>
          <span className="block truncate text-sm font-semibold text-foreground">
            {active?.brand_name || "Selecione uma marca"}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Marcas da agência</DropdownMenuLabel>
        {brands.map((b) => (
          <DropdownMenuItem
            key={b.id}
            onSelect={() => {
              if (b.id !== active?.id) switchBrand(b.id);
              navigate(b.onboarding_completed_at ? "/dashboard" : "/onboarding/perguntas");
            }}
          >
            <span className="flex-1 truncate">{b.brand_name || "Marca sem nome"}</span>
            {b.id === active?.id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/dashboard/marcas")}>
          <LayoutGrid className="h-4 w-4 mr-2" /> Ver todas as marcas
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
