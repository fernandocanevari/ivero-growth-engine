import { Loader2 } from "lucide-react";

export default function OnboardingDiagnosticoPlaceholderPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F5FF] via-white to-[#FBF7FF] px-4 py-16 flex items-center justify-center">
      <div className="max-w-md text-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#6C5CE7] mx-auto mb-6" />
        <h1 className="font-display text-2xl font-bold text-[#1A1A2E] mb-2">
          Preparando seu diagnóstico...
        </h1>
        <p className="text-muted-foreground">
          Esta etapa será implementada em breve.
        </p>
      </div>
    </div>
  );
}
