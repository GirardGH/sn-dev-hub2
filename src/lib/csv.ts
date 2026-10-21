/** Keep shared text as text when opening an export in a spreadsheet. */
export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  // Spreadsheet applications may ignore leading whitespace/control characters.
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '\"\"')}"`;
}
