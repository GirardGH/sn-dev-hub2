export const ATTACHMENT_BUCKET = "development-attachments";
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export type DevelopmentAttachment = {
  id: string;
  development_id: string;
  user_id: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  storage_path: string;
  status: "pending" | "ready";
  created_at: string;
  deleted_at: string | null;
};
export function validateAttachment(file: { name: string; size: number; type?: string }) {
  const name = file.name.trim().replace(/[\x00-\x1f\x7f/\\]/g, "_");
  if (!name || name.length > 255) throw new Error("Le nom du fichier doit contenir entre 1 et 255 caractères.");
  if (!Number.isSafeInteger(file.size) || file.size <= 0) throw new Error("Le fichier est vide ou sa taille est invalide.");
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error("Le fichier dépasse la limite de 25 Mo.");
  const type = file.type && /^[\w.+-]+\/[\w.+-]+$/.test(file.type) ? file.type : "application/octet-stream";
  return { file_name: name, size_bytes: file.size, content_type: type };
}
export function attachmentSize(bytes: number) {
  return bytes < 1024 ? `${bytes} o` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} Ko` : `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}
