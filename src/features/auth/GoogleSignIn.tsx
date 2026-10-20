"use client";
import { useEffect, useState } from 'react';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n/LanguageProvider';
import { googleOAuthOptions } from './authNavigation';

export function GoogleSignIn() {
  const t = useT();
  const [loading,setLoading]=useState(false),[error,setError]=useState(false);
  if(process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== 'true') return null;
  return <div className="mb-5">
    <Button type="button" variant="secondary" className="w-full" size="lg" loading={loading} icon={<LogIn size={16}/>} onClick={async()=>{
      setLoading(true);setError(false);
      try {
        const {createClient}=await import('@/lib/supabaseClient');
        const {error:authError}=await createClient().auth.signInWithOAuth(googleOAuthOptions(window.location.origin));
        if(authError){setError(true);setLoading(false);}
      } catch {setError(true);setLoading(false);}
    }}>{t('Continue with Google')}</Button>
    {error&&<p role="alert" className="mt-2 text-xs text-sn-danger">{t('Google sign-in is unavailable. Try again or sign in with your email and password.')}</p>}
    <div className="flex items-center gap-3 mt-5 text-xs text-sn-text-muted"><span className="flex-1 border-t border-sn-border"/><span>{t('Or use your email')}</span><span className="flex-1 border-t border-sn-border"/></div>
  </div>;
}

export function AuthCallbackFeedback() {
  const t=useT();const [error,setError]=useState<string|null>(null);
  useEffect(()=>{setError(new URLSearchParams(window.location.search).get('error'));},[]);
  if(error!=='auth_error'&&error!=='access_denied')return null;
  return <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-sn-danger">{t(error==='access_denied'?'Google sign-in was cancelled. You can try again.':'We could not complete sign-in. Please start again from this page.')}</p>;
}
