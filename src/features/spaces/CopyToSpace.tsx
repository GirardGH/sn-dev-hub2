"use client";
import { useEffect, useState } from 'react';
import { Copy, Loader2 } from 'lucide-react';
import { useSpace } from './SpaceProvider';
import { canWrite, type CopyKind, type CopyPreview, type CopyResult } from './space.types';
import { copyToSpaceBatch, previewSpaceCopyBatch } from './space.actions';
import { useT } from '@/i18n/LanguageProvider';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';

export function CopyToSpace({ kind, id, ids }: { kind: CopyKind; id?: string; ids?: string[] }) {
  const context = useSpace(); const t = useT();
  const [open,setOpen]=useState(false),[target,setTarget]=useState('');
  const [preview,setPreview]=useState<CopyPreview|null>(null),[result,setResult]=useState<CopyResult|null>(null);
  const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const targets=context?.spaces.filter(space=>space.id!==context.active.id && canWrite(space.role)) ?? [];
  const selectionKey=JSON.stringify(Array.from(new Set(ids ?? (id ? [id] : []))).sort());
  const count=(JSON.parse(selectionKey) as string[]).length;
  useEffect(()=>{
    let current=true;setPreview(null);setResult(null);setError('');setLoading(false);
    if(!open||!target)return;
    if((JSON.parse(selectionKey) as string[]).length>100){setError('Select between 1 and 100 records');return;}
    setLoading(true);
    previewSpaceCopyBatch(kind,JSON.parse(selectionKey),target)
      .then(plan=>{if(current)setPreview(plan);})
      .catch(err=>{if(current)setError(err instanceof Error ? err.message : String(err));})
      .finally(()=>{if(current)setLoading(false);});
    return()=>{current=false;};
  },[open,target,kind,selectionKey]);
  const ambiguity=error.match(/^Ambiguous destination name: (.*) \((client|story|development)\)\. Resolve the duplicates before copying\.$/);
  const errorText=ambiguity ? t('Multiple destination records match {name}. Resolve the duplicates before copying.', {name: ambiguity[1]}) : t(error);
  if(!targets.length||!count)return null;
  return <>
    <Button variant="secondary" size="sm" icon={<Copy size={14}/>} onClick={()=>setOpen(true)}>
      {t('Copy to a space')}{ids ? ` (${count})` : ''}
    </Button>
    <Modal open={open} onClose={()=>{if(!busy)setOpen(false);}} title={t('Copy to a space')} size="md" footer={<>
      <Button variant="secondary" disabled={busy} onClick={()=>setOpen(false)}>{t('Close')}</Button>
      {!result&&<Button disabled={!preview||loading||busy} loading={busy} onClick={async()=>{
        setBusy(true);setError('');
        try{setResult(await copyToSpaceBatch({kind,ids:JSON.parse(selectionKey),target}));}
        catch(err){setError(err instanceof Error ? err.message : String(err));}
        finally{setBusy(false);}
      }}>{t('Copy independently')}</Button>}
    </>}>
      <p className="text-sm text-sn-text-muted mb-3">{t('The source stays unchanged. Copies and files are independent, without automatic synchronisation.')}</p>
      <p className="text-sm text-sn-text-muted mb-4">{t('Parents are included automatically. Names are matched ignoring case and extra spaces: client in the destination, story under that client, development under that story. Existing content is never overwritten.')}</p>
      <Select label={t('Destination space')} disabled={busy||!!result} value={target} onChange={event=>setTarget(event.target.value)} options={[{value:'',label:t('Select a destination')},...targets.map(space=>({value:space.id,label:space.kind==='personal'?t('Personal workspace'):space.name}))]}/>
      {loading&&<p role="status" className="flex gap-2 mt-4 text-sm text-sn-text-muted"><Loader2 size={16} className="animate-spin"/>{t('Preparing preview…')}</p>}
      {preview&&<div className="my-4 rounded-lg bg-sn-table-header p-4 text-sm space-y-2">
        <p className="font-semibold">{t('New records to create')}</p>
        <p>{preview.clients} {t('Clients')} · {preview.stories} {t('Stories')} · {preview.developments} {t('Developments')} · {preview.attachments} {t('Attachments')}</p>
        <p className="text-xs text-sn-text-muted">{t('Existing or shared parents reused')}: {preview.reused_clients ?? 0} {t('Clients')} · {preview.reused_stories ?? 0} {t('Stories')} · {preview.reused_developments ?? 0} {t('Developments')}</p>
        <p className="text-xs text-sn-text-muted">{t('Same-name developments are kept as they are, including their existing attachments. Only missing developments and their files are copied.')}</p>
      </div>}
      {busy&&<p className="text-xs text-sn-text-muted mt-4" role="status">{t('Copying content and files. Keep this window open.')}</p>}
      {error&&<p role="alert" className="text-sm text-sn-danger mt-4 break-words">{errorText}<span className="block mt-2">{t('An interrupted file copy can be resumed from Spaces. The destination stays hidden until completion.')}</span></p>}
      {result&&<div role="status" className="mt-4 rounded-lg bg-sn-success-light text-green-800 p-3 text-sm">
        <p>{t('Copy complete. Switch to the destination space to view it.')}</p>
        <p className="mt-1">{t('Created')}: {result.created_clients} {t('Clients')} · {result.created_stories} {t('Stories')} · {result.created_developments} {t('Developments')}</p>
      </div>}
    </Modal>
  </>;
}
