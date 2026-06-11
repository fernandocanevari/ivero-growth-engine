import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import PreviewPage from "./pages/PreviewPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import WelcomePage from "./pages/WelcomePage";
import BemVindoPage from "./pages/BemVindoPage";
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
import AssinaturaPage from "./pages/dashboard/AssinaturaPage";
import AdminRespostasPage from "./pages/dashboard/AdminRespostasPage";
import AdminDashboardPage from "./pages/dashboard/AdminDashboardPage";
import AdminClientesPage from "./pages/dashboard/AdminClientesPage";
import AdminLeadsPage from "./pages/dashboard/AdminLeadsPage";
import DiagnosticoPage from "./pages/dashboard/DiagnosticoPage";
import PilaresPage from "./pages/dashboard/PilaresPage";
import GeradorConteudoPage from "./pages/dashboard/GeradorConteudoPage";
import TagsPercepcaoPage from "./pages/dashboard/TagsPercepcaoPage";
import AjudaPage from "./pages/dashboard/AjudaPage";
import AuditoriasPage from "./pages/dashboard/AuditoriasPage";
import AuditoriaDetalhePage from "./pages/dashboard/AuditoriaDetalhePage";
import LlmsTxtPage from "./pages/dashboard/LlmsTxtPage";
import AdminPropostasPage from "./pages/dashboard/AdminPropostasPage";
import AdminConvitesPage from "./pages/dashboard/AdminConvitesPage";
import PropostaComercialPage from "./pages/PropostaComercialPage";
import ConvitePage from "./pages/ConvitePage";
import PoliticaPrivacidadePage from "./pages/PoliticaPrivacidadePage";
import PoliticaCookiesPage from "./pages/PoliticaCookiesPage";
import BlogIndexPage from "./pages/BlogIndexPage";
import BlogPostPage from "./pages/BlogPostPage";
import LegalPage from "./pages/LegalPage";
import TermosDeUsoPage from "./pages/TermosDeUsoPage";
import SobrePage from "./pages/SobrePage";
import IveroAnalysisPage from "./pages/IveroAnalysisPage";
import { CookieConsentBanner } from "./components/CookieConsentBanner";

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
          <Route path="/signup" element={<AuthPage />} />
          <Route path="/auth" element={<AuthPage />} />

          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/preview" element={<PreviewPage />} />
          <Route path="/propostacomercial/:slug" element={<PropostaComercialPage />} />
          <Route path="/convite/:slug" element={<ConvitePage />} />
          <Route path="/politica-de-privacidade" element={<PoliticaPrivacidadePage />} />
          <Route path="/politica-de-cookies" element={<PoliticaCookiesPage />} />
          <Route path="/termos-de-uso" element={<TermosDeUsoPage />} />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/blog" element={<BlogIndexPage />} />
          <Route path="/sobre" element={<SobrePage />} />
          <Route path="/analise-ivero" element={<IveroAnalysisPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/welcome" element={<ProtectedRoute><WelcomePage /></ProtectedRoute>} />
          <Route path="/bem-vindo" element={<ProtectedRoute><BemVindoPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardOverview />} />
            <Route path="diagnostico" element={<DiagnosticoPage />} />
            <Route path="auditorias" element={<AuditoriasPage />} />
            <Route path="auditorias/:id" element={<AuditoriaDetalhePage />} />
            <Route path="pilares" element={<PilaresPage />} />
            <Route path="monitoramento" element={<MonitoramentoPage />} />
            <Route path="comparativo" element={<ComparativoPage />} />
            <Route path="score" element={<ScorePage />} />
            <Route path="tags-percepcao" element={<TagsPercepcaoPage />} />
            <Route path="sentimento" element={<SentimentoPage />} />
            <Route path="acoes" element={<AcoesPage />} />
            <Route path="conteudo" element={<GeradorConteudoPage />} />
            <Route path="alertas" element={<AlertasPage />} />
            <Route path="prompts" element={<PromptsPage />} />
            <Route path="dominancia" element={<DominanciaPage />} />
            <Route path="simulador" element={<SimuladorPage />} />
            <Route path="llms-txt" element={<LlmsTxtPage />} />
            <Route path="campanhas" element={<CampanhasPage />} />
            <Route path="campanhas/nova" element={<NovaCampanhaPage />} />
            <Route path="prompt-tester" element={<PromptTesterPage />} />
            <Route path="relatorios" element={<RelatoriosPage />} />
            <Route path="assinatura" element={<AssinaturaPage />} />
            <Route path="configuracoes" element={<ConfiguracoesPage />} />
            <Route path="ajuda" element={<AjudaPage />} />
            <Route path="admin/respostas" element={<AdminRespostasPage />} />
            <Route path="admin" element={<AdminDashboardPage />} />
            <Route path="admin/clientes" element={<AdminClientesPage />} />
            <Route path="admin/leads" element={<AdminLeadsPage />} />
            <Route path="admin/propostas" element={<AdminPropostasPage />} />
            <Route path="admin/convites" element={<AdminConvitesPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        <CookieConsentBanner />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
