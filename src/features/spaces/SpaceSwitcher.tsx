"use client";
import Image from "next/image";
import { useTransition, useState, useId } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, UserRound } from 'lucide-react';
import { useSpace } from './SpaceProvider';
import { switchSpace } from './space.actions';
import { useT } from '@/i18n/LanguageProvider';
export function SpaceSwitcher({ compact = false }: { compact?: boolean }) {
  const inputId = useId();
  const context = useSpace(); const t = useT(); const router = useRouter(); const [pending, start] = useTransition(); const [error, setError] = useState('');
  if (!context) return null;
  return <div className={compact ? 'px-3 pt-4' : 'px-4 pt-5'}>
    {!compact && <label htmlFor={inputId} className="block text-[10px] uppercase tracking-wide text-sn-text-muted mb-1.5">{t('Current space')}</label>}
    <div className="flex items-center gap-2 rounded-lg border border-sn-border p-2" style={{borderLeftColor:context.active.color,borderLeftWidth:3}}>
      {context.active.logo_url ? <Image src={context.active.logo_url} alt="" width={20} height={20} unoptimized className="shrink-0 rounded object-contain"/> : context.active.kind === 'personal' ? <UserRound size={16} className="shrink-0 text-sn-accent"/> : <Building2 size={16} className="shrink-0 text-sn-accent"/>}
      <select id={inputId} aria-label={t('Current space')} disabled={pending} value={context.active.id} className="bg-transparent min-w-0 w-full text-xs outline-none disabled:opacity-50" title={context.active.kind === 'personal' ? t('Personal workspace') : context.active.name} onChange={event => {const id=event.target.value;setError('');start(async()=>{try {await switchSpace(id);router.push('/dashboard');router.refresh();}catch(err){setError(err instanceof Error ? t(err.message) : String(err));}});}}>
        {context.spaces.map(space => <option key={space.id} value={space.id}>{space.kind === 'personal' ? t('Personal workspace') : space.name}</option>)}
      </select>
    </div>
    {error && <p role="alert" className="text-xs text-sn-danger mt-2 break-words">{error}</p>}
  </div>;
}
