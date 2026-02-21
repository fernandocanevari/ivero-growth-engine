import {
  AlertTriangle, UserX, TrendingDown, Activity, Zap, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const semAcesso = [
  { name: "TechWear Co.", plano: "Autoridade", ultimoAcesso: "2026-02-07", dias: 14 },
  { name: "SportMax", plano: "Influência", ultimoAcesso: "2026-01-28", dias: 24 },
  { name: "UrbanFit", plano: "Domínio", ultimoAcesso: "2026-01-20", dias: 32 },
  { name: "RunPro Brasil", plano: "Autoridade", ultimoAcesso: "2026-01-10", dias: 42 },
  { name: "Estilo & Forma", plano: "Presença", ultimoAcesso: "2025-12-28", dias: 55 },
];

const quedaIndice = [
  { name: "UrbanFit", scorAtual: 54, scoreAnterior: 72, queda: -18, semanas: 4 },
  { name: "RunPro Brasil", scorAtual: 48, scoreAnterior: 65, queda: -17, semanas: 6 },
  { name: "FashionHouse", scorAtual: 41, scoreAnterior: 53, queda: -12, semanas: 3 },
];

const altoUsoSemEvolucao = [
  { name: "Mizuno", logins: 42, tempoMedio: "32min", scoreVariacao: "+1", semanas: 8 },
  { name: "Asics Brasil", logins: 38, tempoMedio: "28min", scoreVariacao: "0", semanas: 6 },
  { name: "Fila Sports", logins: 35, tempoMedio: "25min", scoreVariacao: "-2", semanas: 5 },
];

const falhasTecnicas = [
  { name: "TechWear Co.", erros: 12, tipo: "Timeout API", ultimoErro: "2026-02-20" },
  { name: "SportMax", erros: 8, tipo: "Falha Parsing", ultimoErro: "2026-02-19" },
  { name: "NewBalance", erros: 5, tipo: "Rate Limit", ultimoErro: "2026-02-18" },
];

function RiskBadge({ dias }: { dias: number }) {
  if (dias >= 30) return <Badge className="bg-destructive/10 text-destructive text-[10px]">Crítico</Badge>;
  if (dias >= 14) return <Badge className="bg-amber-600/10 text-amber-600 text-[10px]">Atenção</Badge>;
  return <Badge variant="secondary" className="text-[10px]">OK</Badge>;
}

export function AdminSectionRisco() {
  return (
    <div className="space-y-6">
      {/* Sem acesso há 14+ dias */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <UserX className="h-4 w-4 text-destructive" />
            Sem Acesso há 14+ Dias
          </CardTitle>
          <p className="text-xs text-muted-foreground">Clientes com plano ativo mas sem login recente</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead className="text-center">Risco</TableHead>
                <TableHead className="text-right">Dias</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {semAcesso.map((c) => (
                <TableRow key={c.name}>
                  <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{c.plano}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(c.ultimoAcesso).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-center"><RiskBadge dias={c.dias} /></TableCell>
                  <TableCell className="text-right font-semibold text-destructive">{c.dias}d</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Queda contínua de índice */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            Queda Contínua de Índice
          </CardTitle>
          <p className="text-xs text-muted-foreground">Clientes com score em declínio por semanas consecutivas</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-center">Score Anterior</TableHead>
                <TableHead className="text-center">Score Atual</TableHead>
                <TableHead className="text-center">Queda</TableHead>
                <TableHead className="text-right">Semanas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quedaIndice.map((c) => (
                <TableRow key={c.name}>
                  <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{c.scoreAnterior}</TableCell>
                  <TableCell className="text-center font-semibold text-destructive">{c.scorAtual}</TableCell>
                  <TableCell className="text-center font-semibold text-destructive">{c.queda}</TableCell>
                  <TableCell className="text-right">{c.semanas} sem</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alto uso sem evolução */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-600" />
              Alto Uso Sem Evolução
            </CardTitle>
            <p className="text-xs text-muted-foreground">Clientes engajados mas sem melhoria de score</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Logins (30d)</TableHead>
                  <TableHead className="text-center">Tempo Médio</TableHead>
                  <TableHead className="text-center">Δ Score</TableHead>
                  <TableHead className="text-right">Semanas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {altoUsoSemEvolucao.map((c) => (
                  <TableRow key={c.name}>
                    <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                    <TableCell className="text-center">{c.logins}</TableCell>
                    <TableCell className="text-center">{c.tempoMedio}</TableCell>
                    <TableCell className="text-center font-semibold text-amber-600">{c.scoreVariacao}</TableCell>
                    <TableCell className="text-right">{c.semanas} sem</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Falhas técnicas */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-destructive" />
              Clientes com Falhas Técnicas
            </CardTitle>
            <p className="text-xs text-muted-foreground">Erros recorrentes que impactam a experiência</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Erros (30d)</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Último</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {falhasTecnicas.map((c) => (
                  <TableRow key={c.name}>
                    <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                    <TableCell className="text-center font-semibold text-destructive">{c.erros}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{c.tipo}</Badge></TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{new Date(c.ultimoErro).toLocaleDateString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
