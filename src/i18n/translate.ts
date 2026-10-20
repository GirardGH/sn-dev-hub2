import messages from './messages.json';
export type Language = 'fr' | 'en';
export const LANGUAGE_COOKIE = 'sn-dev-hub-language';
export function isLanguage(value: unknown): value is Language { return value === 'fr' || value === 'en'; }
export function translate(text: string, language: Language, values: Record<string, string | number> = {}): string {
  const catalogue = messages[language] as Record<string, string>;
  const message = Object.prototype.hasOwnProperty.call(catalogue, text) ? catalogue[text] : text;
  return message.replace(/\{(\w+)\}/g, (token, key: string) => Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : token);
}
