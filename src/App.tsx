import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import PreviewPage from "./pages/PreviewPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import MonitoramentoPage from "./pages/dashboard/MonitoramentoPage";
import ComparativoPage from "./pages/dashboard/ComparativoPage";
import ScorePage from "./pages/dashboard/ScorePage";
import SentimentoPage from "./pages/dashboard/SentimentoPage";
import AcoesPage from "./pages/dashboard/AcoesPage";
import AlertasPage from "./pages/dashboard/AlertasPage";
import PromptsPage from "./pages/dashboard/PromptsPage";
import DominanciaPage from "./pages/dashboard/DominanciaPage";
import SimuladorPage from "./pages/dashboard/SimuladorPage";
import CampanhasPage from "./pages/dashboard/CampanhasPage";
import NovaCampanhaPage from "./pages/dashboard/NovaCampanhaPage";
import PromptTesterPage from "./pages/dashboard/PromptTesterPage";
import RelatoriosPage from "./pages/dashboard/RelatoriosPage";
import ConfiguracoesPage from "./pages/dashboard/ConfiguracoesPage";
import AdminRespostasPage from "./pages/dashboard/AdminRespostasPage";
import AdminDashboardPage from "./pages/dashboard/AdminDashboardPage";
import AdminClientesPage from "./pages/dashboard/AdminClientesPage";
import AdminLeadsPage from "./pages/dashboard/AdminLeadsPage";
import DiagnosticoPage from "./pages/dashboard/DiagnosticoPage";
import PilaresPage from "./pages/dashboard/PilaresPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/preview" element={<PreviewPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardOverview />} />
            <Route path="diagnostico" element={<DiagnosticoPage />} />
            <Route path="pilares" element={<PilaresPage />} />
            <Route path="monitoramento" element={<MonitoramentoPage />} />
            <Route path="comparativo" element={<ComparativoPage />} />
            <Route path="score" element={<ScorePage />} />
            <Route path="sentimento" element={<SentimentoPage />} />
            <Route path="acoes" element={<AcoesPage />} />
            <Route path="alertas" element={<AlertasPage />} />
            <Route path="prompts" element={<PromptsPage />} />
            <Route path="dominancia" element={<DominanciaPage />} />
            <Route path="simulador" element={<SimuladorPage />} />
            <Route path="campanhas" element={<CampanhasPage />} />
            <Route path="campanhas/nova" element={<NovaCampanhaPage />} />
            <Route path="prompt-tester" element={<PromptTesterPage />} />
            <Route path="relatorios" element={<RelatoriosPage />} />
            <Route path="configuracoes" element={<ConfiguracoesPage />} />
            <Route path="admin/respostas" element={<AdminRespostasPage />} />
            <Route path="admin" element={<AdminDashboardPage />} />
            <Route path="admin/clientes" element={<AdminClientesPage />} />
            <Route path="admin/leads" element={<AdminLeadsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
