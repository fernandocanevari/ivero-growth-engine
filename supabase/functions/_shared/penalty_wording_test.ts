// P64 — frase do bloqueio sem "multa", idêntica no servidor e no site.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { penaltyBlockedMessage } from "./penalty.ts";
import { penaltyBlockedMessage as sitePenaltyBlockedMessage } from "../../../src/lib/penalty.ts";

const EXPECTED = "Para assinar de novo, falta pagar a diferença do desconto anual do plano anterior: R$ 600,00.";
const nb = (s: string) => s.replace(/\u00a0/g, " ");

Deno.test("servidor: penaltyBlockedMessage", () => assertEquals(nb(penaltyBlockedMessage(600)), EXPECTED));
Deno.test("site: mesma frase", () => assertEquals(nb(sitePenaltyBlockedMessage(600)), EXPECTED));
