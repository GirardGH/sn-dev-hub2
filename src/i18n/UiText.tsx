"use client";
import { useT } from './LanguageProvider';
/** Only for application-owned labels; never wrap user-authored titles or scripts. */
export function UiText({ text }: { text: string }) { const t = useT(); return <>{t(text)}</>; }
