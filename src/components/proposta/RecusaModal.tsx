import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MOTIVO_RECUSA_LABELS } from "@/lib/pricing-rules";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface RecusaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  onSuccess: () => void;
}

export function RecusaModal({ open, onOpenChange, slug, onSuccess }: RecusaModalProps) {
  const [motivo, setMotivo] = useState<string>("preco");
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const { error } = await supabase.functions.invoke("responder-proposta", {
      body: { slug, acao: "recusada", motivo_categoria: motivo, motivo_texto: texto || null },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sem problemas. Pode nos contar o motivo?</DialogTitle>
          <DialogDescription>
            Sua resposta nos ajuda a melhorar a proposta — leva menos de 30 segundos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <RadioGroup value={motivo} onValueChange={setMotivo} className="space-y-2">
            {Object.entries(MOTIVO_RECUSA_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center space-x-2">
                <RadioGroupItem value={key} id={`motivo-${key}`} />
                <Label htmlFor={`motivo-${key}`} className="text-sm font-normal cursor-pointer">
                  {label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div>
            <Label htmlFor="motivo-texto" className="text-xs text-muted-foreground">
              Algo mais que gostaria de compartilhar? (opcional)
            </Label>
            <Textarea
              id="motivo-texto"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Comentário livre..."
              className="mt-1.5"
              maxLength={1000}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Enviando..." : "Enviar resposta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
