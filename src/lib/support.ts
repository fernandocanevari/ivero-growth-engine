/**
 * Canais oficiais de suporte da Ivero.
 * Helpers usam encodeURIComponent em todas as queries para evitar injeção
 * de parâmetros via brand_name (entrada do próprio usuário).
 */

export const WHATSAPP_NUMBER = "5514999043105"; // formato internacional sem +
export const WHATSAPP_DISPLAY = "(14) 99904-3105";
export const SUPPORT_EMAIL = "contato@ivero.com.br";
export const SUPPORT_HOURS = "Seg–Sex, 9h às 18h (BRT)";

const sanitize = (s?: string | null): string =>
  (s || "").trim().slice(0, 80); // hard limit para nunca explodir URL

export function getWhatsappUrl(brandName?: string | null): string {
  const brand = sanitize(brandName);
  const greeting = brand
    ? `Olá! Sou da marca "${brand}" e preciso de ajuda com a Ivero.`
    : "Olá! Sou cliente Ivero e preciso de ajuda.";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(greeting)}`;
}

export function getMailtoUrl(brandName?: string | null): string {
  const brand = sanitize(brandName);
  const subject = brand
    ? `Suporte Ivero — ${brand}`
    : "Suporte Ivero";
  const body = "Olá, equipe Ivero!\n\nPreciso de ajuda com:\n\n";
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
