import { humanizeTag } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/translations";

/**
 * Aesthetic microtrend names (Old Money, Y2K, Clean Girl, Techwear, ...) are
 * left untranslated on purpose — they function as internationally recognized
 * labels in German and Brazilian fashion media too, and a literal translation
 * would read as wrong rather than helpful. Everything else below (occasions,
 * fabric/fit, materials, colors, gender, body shape) gets a real translation.
 */
const TAG_LABELS: Record<string, { de: string; pt: string }> = {
  // Occasions
  casual_everyday: { de: "Alltag / Casual", pt: "Casual / Dia a dia" },
  date_night: { de: "Date Night", pt: "Date Night" },
  work_office: { de: "Arbeit / Büro", pt: "Trabalho / Escritório" },
  girls_night: { de: "Girls Night", pt: "Noite com as amigas" },
  festival: { de: "Festival", pt: "Festival" },
  weekend_chill: { de: "Wochenende / Chill", pt: "Fim de semana tranquilo" },
  formal_event: { de: "Festliches Event", pt: "Evento formal" },
  travel: { de: "Reise", pt: "Viagem" },
  brunch: { de: "Brunch", pt: "Brunch" },
  wedding_guest: { de: "Hochzeitsgast", pt: "Convidada de casamento" },
  night_out: { de: "Ausgehen", pt: "Balada" },
  gym: { de: "Fitnessstudio", pt: "Academia" },
  sports: { de: "Sport", pt: "Esporte" },

  // Fabric, fit & materials
  oversized: { de: "Oversized", pt: "Oversized" },
  fitted: { de: "Eng anliegend", pt: "Justo" },
  flowy: { de: "Fließend", pt: "Fluido" },
  structured: { de: "Strukturiert", pt: "Estruturado" },
  breathable: { de: "Atmungsaktiv", pt: "Respirável" },
  sustainable: { de: "Nachhaltig", pt: "Sustentável" },
  cotton: { de: "Baumwolle", pt: "Algodão" },
  linen: { de: "Leinen", pt: "Linho" },
  silk: { de: "Seide", pt: "Seda" },
  wool: { de: "Wolle", pt: "Lã" },
  cashmere: { de: "Kaschmir", pt: "Cashmere" },
  denim: { de: "Denim", pt: "Jeans" },
  leather: { de: "Leder", pt: "Couro" },
  sheer: { de: "Transparent", pt: "Transparente" },
  bodycon: { de: "Bodycon", pt: "Bodycon" },
  wrap: { de: "Wickel", pt: "Envelope" },
  slim_fit: { de: "Slim Fit", pt: "Slim Fit" },
  regular_fit: { de: "Regular Fit", pt: "Regular Fit" },
  relaxed_fit: { de: "Relaxed Fit", pt: "Relaxed Fit" },
  technical_fabric: { de: "Funktionsstoff", pt: "Tecido técnico" },
  fleece: { de: "Fleece", pt: "Fleece" },

  // Colors
  black: { de: "Schwarz", pt: "Preto" },
  white: { de: "Weiß", pt: "Branco" },
  beige: { de: "Beige", pt: "Bege" },
  navy: { de: "Marineblau", pt: "Azul-marinho" },
  green: { de: "Grün", pt: "Verde" },
  brown: { de: "Braun", pt: "Marrom" },
  red: { de: "Rot", pt: "Vermelho" },
  pink: { de: "Rosa", pt: "Rosa" },

  // Gender
  female: { de: "Weiblich", pt: "Feminino" },
  male: { de: "Männlich", pt: "Masculino" },
  "non-binary": { de: "Nicht-binär", pt: "Não-binário" },
  prefer_not_to_say: { de: "Keine Angabe", pt: "Prefiro não dizer" },

  // Body shapes
  hourglass: { de: "Sanduhr", pt: "Ampulheta" },
  rectangle: { de: "Rechteck", pt: "Retângulo" },
  pear: { de: "Birne", pt: "Pêra" },
  apple: { de: "Apfel", pt: "Maçã" },
  inverted_triangle: { de: "Umgekehrtes Dreieck", pt: "Triângulo invertido" },
};

/** Locale-aware label for a tag/enum value, falling back to the humanized English form. */
export function tagLabel(tag: string, locale: Locale): string {
  return TAG_LABELS[tag]?.[locale] ?? humanizeTag(tag);
}
