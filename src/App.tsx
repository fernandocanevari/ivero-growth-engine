import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import PreviewPage from "./pages/PreviewPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import BemVindoPage from "./pages/BemVindoPage";
import OnboardingPerguntasPage from "./pages/OnboardingPerguntasPage";
import OnboardingSitePage from "./pages/OnboardingSitePage";
import OnboardingDiagnosticoPlaceholderPage from "./pages/OnboardingDiagnosticoPlaceholderPage";
import EscolherPlanoPage from "./pages/EscolherPlanoPage";
import RetornoAsaasPage from "./pages/RetornoAsaasPage";
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
import OAuthConsentPage from "./pages/OAuthConsentPage";
import { CookieConsentBanner } from "./components/CookieConsentBanner";
import { FeatureGate } from "./components/dashboard/FeatureGate";
import { supabase } from "./integrations/supabase/client";

const queryClient = new QueryClient();

// Clear cached per-user queries (roles, subscription, etc.) whenever auth state
// changes so admin data does not leak across login sessions in the same tab.
// Limpa só em troca REAL de usuário (ou logout). Renovação de sessão dispara
// SIGNED_IN/USER_UPDATED com o mesmo usuário e limpar o cache aí fazia cards
// voltarem ao estado "carregando" (piscada no Painel).
let lastAuthUserId: string | null | undefined = undefined;
supabase.auth.onAuthStateChange((event, session) => {
  const uid = session?.user?.id ?? null;
  if (event === "SIGNED_OUT") {
    lastAuthUserId = null;
    queryClient.clear();
    return;
  }
  if (event === "SIGNED_IN" || event === "USER_UPDATED") {
    if (lastAuthUserId !== undefined && lastAuthUserId !== uid) queryClient.clear();
    lastAuthUserId = uid;
  }
});

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
          <Route path="/.lovable/oauth/consent" element={<OAuthConsentPage />} />
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
          <Route path="/welcome" element={<ProtectedRoute requireSubscription={false}><BemVindoPage /></ProtectedRoute>} />
          <Route path="/bem-vindo" element={<ProtectedRoute requireSubscription={false}><BemVindoPage /></ProtectedRoute>} />
          <Route path="/escolher-plano" element={<ProtectedRoute requireSubscription={false}><EscolherPlanoPage /></ProtectedRoute>} />
          <Route path="/retorno-asaas" element={<RetornoAsaasPage outcome="success" />} />
          <Route path="/retorno-asaas-upgrade" element={<RetornoAsaasPage outcome="upgrade" />} />
          <Route path="/retorno-asaas-cancelado" element={<RetornoAsaasPage outcome="cancelado" />} />
          <Route path="/retorno-asaas-expirado" element={<RetornoAsaasPage outcome="expirado" />} />
          <Route path="/onboarding/perguntas" element={<ProtectedRoute requireSubscription={false}><OnboardingPerguntasPage /></ProtectedRoute>} />
          <Route path="/onboarding/site" element={<ProtectedRoute requireSubscription={false}><OnboardingSitePage /></ProtectedRoute>} />
          <Route path="/onboarding/diagnostico" element={<ProtectedRoute requireSubscription={false}><OnboardingDiagnosticoPlaceholderPage /></ProtectedRoute>} />

          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardOverview />} />
            <Route path="diagnostico" element={<DiagnosticoPage />} />
            <Route path="auditorias" element={<FeatureGate><AuditoriasPage /></FeatureGate>} />
            <Route path="auditorias/:id" element={<FeatureGate><AuditoriaDetalhePage /></FeatureGate>} />
            <Route path="pilares" element={<FeatureGate><PilaresPage /></FeatureGate>} />
            <Route path="monitoramento" element={<FeatureGate><MonitoramentoPage /></FeatureGate>} />
            <Route path="comparativo" element={<FeatureGate><ComparativoPage /></FeatureGate>} />
            <Route path="score" element={<FeatureGate><ScorePage /></FeatureGate>} />
            <Route path="tags-percepcao" element={<FeatureGate><TagsPercepcaoPage /></FeatureGate>} />
            <Route path="sentimento" element={<FeatureGate><SentimentoPage /></FeatureGate>} />
            <Route path="acoes" element={<FeatureGate><AcoesPage /></FeatureGate>} />
            <Route path="conteudo" element={<FeatureGate><GeradorConteudoPage /></FeatureGate>} />
            <Route path="alertas" element={<AlertasPage />} />
            <Route path="prompts" element={<FeatureGate><PromptsPage /></FeatureGate>} />
            <Route path="dominancia" element={<FeatureGate><DominanciaPage /></FeatureGate>} />
            <Route path="simulador" element={<FeatureGate><SimuladorPage /></FeatureGate>} />
            <Route path="llms-txt" element={<FeatureGate><LlmsTxtPage /></FeatureGate>} />
            <Route path="campanhas" element={<FeatureGate><CampanhasPage /></FeatureGate>} />
            <Route path="campanhas/nova" element={<FeatureGate><NovaCampanhaPage /></FeatureGate>} />
            <Route path="prompt-tester" element={<FeatureGate><PromptTesterPage /></FeatureGate>} />
            <Route path="relatorios" element={<FeatureGate><RelatoriosPage /></FeatureGate>} />
            <Route path="assinatura" element={<AssinaturaPage />} />
            <Route path="configuracoes" element={<ConfiguracoesPage />} />
            <Route path="ajuda" element={<AjudaPage />} />
            <Route path="admin/respostas" element={<AdminRespostasPage />} />
            <Route path="admin" element={<AdminDashboardPage />} />
            <Route path="admin/clientes" element={<AdminClientesPage />} />
            {/* Leads agora vivem dentro de Clientes (toggle "Leads (sem conta)") */}
            <Route path="admin/leads" element={<Navigate to="/dashboard/admin/clientes" replace />} />

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
