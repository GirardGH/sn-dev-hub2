"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Paperclip, X, FileText, Download, Trash2, RotateCcw, Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { listDevelopmentAttachments, reserveDevelopmentAttachment, completeDevelopmentAttachment, cancelDevelopmentAttachment, setDevelopmentAttachmentRemoved } from "./attachment.actions";
import { ATTACHMENT_BUCKET, attachmentSize, validateAttachment, type DevelopmentAttachment } from "./attachment.types";

export function DevelopmentAttachments({ developmentId, children }: {
  developmentId?: string;
  children: (ui: { header: ReactNode; strip: ReactNode; busy: boolean }) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<DevelopmentAttachment[]>([]);
  const [loading, setLoading] = useState(Boolean(developmentId));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [transfer, setTransfer] = useState("");
  const [dragging, setDragging] = useState(false);
  const [trash, setTrash] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const refresh = useCallback(async () => {
    if (!developmentId) { setLoading(false); return; }
    setLoading(true);
    try { setFiles(await listDevelopmentAttachments(developmentId)); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Impossible de charger les fichiers."); }
    finally { setLoading(false); }
  }, [developmentId]);
  useEffect(() => { void refresh(); }, [refresh]);
  const active = files.filter(f => !f.deleted_at);
  const removed = files.filter(f => f.deleted_at);

  async function upload(selected: File[]) {
    if (!developmentId || lock.current || !selected.length) return;
    lock.current = true; setBusy(true); setError(""); setTrash(false);
    const db = createClient(); let successes = 0;
    const failures: string[] = [];
    try {
      for (const file of selected) {
        let reservation: DevelopmentAttachment | undefined;
        setTransfer(file.name);
        try {
          validateAttachment(file);
          reservation = await reserveDevelopmentAttachment(developmentId, {name: file.name, size: file.size, type: file.type});
          const { error: uploadError } = await db.storage.from(ATTACHMENT_BUCKET).upload(reservation.storage_path, file, { contentType: reservation.content_type, upsert: false, cacheControl: "0" });
          if (uploadError) throw new Error("Transfert impossible. Vérifiez votre connexion ou le quota de stockage.");
          await completeDevelopmentAttachment(reservation.id);
          successes++;
        } catch (e) {
          failures.push(`${file.name} : ${e instanceof Error ? e.message : "échec du transfert"}`);
          // Pending uploads only. A completed attachment cannot be removed by
          // this cleanup, even if the final response was lost on the network.
          if (reservation) try { await cancelDevelopmentAttachment(reservation.id); } catch { /* Retain pending metadata for later diagnosis. */ }
        }
      }
      await refresh();
      if (successes) toast.success(`${successes} pièce${successes > 1 ? "s" : ""} jointe${successes > 1 ? "s" : ""} ajoutée${successes > 1 ? "s" : ""}.`);
      if (failures.length) setError(failures.join("\n"));
    } finally { lock.current = false; setBusy(false); setTransfer(""); if (input.current) input.current.value = ""; }
  }
  async function remove(file: DevelopmentAttachment, removed: boolean) {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      await setDevelopmentAttachmentRemoved(file.id, removed);
      await refresh();
      if (!removed) setTrash(false);
      toast.success(removed ? "Pièce jointe retirée. Elle reste restaurable dans la corbeille." : "Pièce jointe restaurée.");
    } catch (e) { setError(e instanceof Error ? e.message : "Opération impossible."); }
    finally { lock.current = false; setBusy(false); }
  }
  const href = (file: DevelopmentAttachment) => `/api/attachments/${file.id}/download`;
  const header = <button type="button" onClick={() => setOpen(true)} title="Gérer les pièces jointes" aria-label={`Gérer les pièces jointes${active.length ? ` (${active.length})` : ""}`} className="relative w-8 h-8 flex items-center justify-center rounded text-white/80 hover:text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sn-accent">
    <Paperclip className="w-[18px] h-[18px]" />
    {active.length > 0 && <span className="absolute -top-1 -right-1 min-w-4 px-1 rounded-full bg-sn-accent text-white text-[10px]">{active.length}</span>}
  </button>;
  const strip = active.length > 0 || error || loading ? <div className="border-b border-sn-border bg-[#f7fafb] px-4 py-2 flex items-center gap-x-4 gap-y-1 flex-wrap text-xs" aria-label="Pièces jointes du développement">
    <button type="button" className="flex items-center gap-1.5 text-sn-text-muted hover:text-sn-accent" onClick={() => setOpen(true)}><Paperclip className="w-3.5 h-3.5" />Pièces jointes ({active.length})</button>
    {loading ? <span className="text-sn-text-muted">Chargement…</span> : active.slice(0, 3).map(file => <a key={file.id} href={href(file)} className="text-sn-accent hover:underline max-w-64 truncate" title={`Télécharger ${file.file_name}`}>{file.file_name}</a>)}
    {active.length > 3 && <button type="button" onClick={() => setOpen(true)} className="text-sn-accent hover:underline">+{active.length - 3} autres</button>}
    {error && <button type="button" onClick={() => { setOpen(true); }} className="text-sn-danger">Chargement incomplet — ouvrir la gestion</button>}
  </div> : null;
  return <>
    {children({header, strip, busy})}
    <Dialog.Root open={open} onOpenChange={value => { if (!lock.current) { setOpen(value); if (!value) setTrash(false); } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content className="fixed z-50 top-[12vh] left-1/2 -translate-x-1/2 w-[calc(100%_-_2rem)] max-w-[600px] max-h-[80vh] bg-white border border-sn-border rounded-lg shadow-2xl flex flex-col" onEscapeKeyDown={e => { if (busy) e.preventDefault(); }} onPointerDownOutside={e => { if (busy) e.preventDefault(); }}>
          <div className="flex items-center justify-between border-b border-sn-border px-4 py-2.5">
            <Dialog.Title className="text-base text-sn-text">Pièces jointes {active.length ? `(${active.length})` : ""}</Dialog.Title>
            <Dialog.Close disabled={busy} aria-label="Fermer les pièces jointes" className="w-7 h-7 rounded flex items-center justify-center text-sn-text-muted hover:bg-sn-table-header focus-visible:ring-2 focus-visible:ring-sn-accent"><X className="w-4 h-4" /></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Ajouter des fichiers au développement. Cliquer sur un nom télécharge le fichier sur votre appareil.</Dialog.Description>
          <div className="p-5 overflow-y-auto">
            {!developmentId ? <div className="text-center py-8"><Paperclip className="mx-auto w-14 h-14 text-[#5c8794] mb-4" /><p className="text-sm text-sn-text">Enregistrez d’abord le développement pour joindre des fichiers.</p></div> : <>
              <input ref={input} type="file" multiple aria-label="Choisir des fichiers" className="sr-only" disabled={busy} onChange={e => { void upload(Array.from(e.target.files ?? [])); }} />
              <div onDragOver={e => { e.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (!busy) void upload(Array.from(e.dataTransfer.files)); }} className={`rounded border-2 border-dashed py-7 px-4 text-center transition-colors ${dragging ? "border-sn-accent bg-blue-50" : "border-transparent"}`}>
                {busy ? <Loader2 className="mx-auto h-12 w-12 text-[#5c8794] animate-spin mb-3" /> : <div className="mx-auto w-16 h-20 border-2 border-[#d9e1e4] rounded-lg flex items-center justify-center bg-[#f5f8f9] mb-4"><Paperclip className="w-9 h-9 text-[#5c8794]" /></div>}
                <p className="text-sm text-sn-text mb-3">{busy ? `Transfert : ${transfer || "mise à jour…"}` : active.length ? "Glissez des fichiers ici pour les ajouter" : "Aucune pièce jointe"}</p>
                <Button type="button" size="sm" onClick={() => input.current?.click()} disabled={busy} icon={<Upload className="w-3.5 h-3.5" />}>Choisir des fichiers</Button>
                <p className="text-[11px] text-sn-text-muted mt-2">ou glissez-déposez vos fichiers · 25 Mo maximum par fichier</p>
              </div>
              {error && <div role="alert" className="p-3 mt-2 bg-red-50 border border-red-200 rounded text-xs text-sn-danger whitespace-pre-wrap">{error}<button type="button" onClick={() => void refresh()} disabled={busy} className="block underline mt-2">Réessayer le chargement</button></div>}
              <div className="mt-3 border-t border-sn-border">
                {(trash ? removed : active).map(file => <div key={file.id} className="flex items-center gap-3 py-3 border-b border-sn-border">
                  <FileText className="w-5 h-5 flex-shrink-0 text-[#5c8794]" />
                  <div className="min-w-0 flex-1">{trash ? <span className="text-sm break-all">{file.file_name}</span> : <a href={href(file)} className="text-sm text-sn-accent hover:underline break-all" title="Télécharger le fichier">{file.file_name}</a>}<p className="text-[11px] text-sn-text-muted mt-0.5">{attachmentSize(file.size_bytes)} · {new Date(file.created_at).toLocaleDateString("fr-FR")}</p></div>
                  {!trash && <a href={href(file)} aria-label={`Télécharger ${file.file_name}`} className="p-1.5 text-sn-text-muted hover:text-sn-accent"><Download className="w-4 h-4" /></a>}
                  <button type="button" disabled={busy} title={trash ? "Restaurer" : "Retirer (restaurable)"} aria-label={`${trash ? "Restaurer" : "Retirer"} ${file.file_name}`} onClick={() => void remove(file, !trash)} className="p-1.5 text-sn-text-muted hover:text-sn-accent disabled:opacity-40">{trash ? <RotateCcw className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}</button>
                </div>)}
              </div>
              <div className="flex justify-between items-center mt-4 gap-4 text-[11px] text-sn-text-muted"><span>Cliquer sur un nom télécharge le fichier.</span>{removed.length > 0 && <button type="button" className="text-sn-accent hover:underline" onClick={() => setTrash(!trash)}>{trash ? "Fichiers actifs" : `Corbeille (${removed.length})`}</button>}</div>
            </>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>;
}
