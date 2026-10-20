import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { safeAuthDestination } from '@/features/auth/authNavigation';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code=searchParams.get('code');
  const next=safeAuthDestination(searchParams.get('next'));
  function redirect(path: string) {
    const response=NextResponse.redirect(new URL(path,origin));
    response.headers.set('Cache-Control','no-store');
    return response;
  }
  if(searchParams.has('error'))return redirect(searchParams.get('error')==='access_denied'?'/login?error=access_denied':'/login?error=auth_error');
  if(code){
    try {
      const supabase=await createServerSupabaseClient();
      const {error}=await supabase.auth.exchangeCodeForSession(code);
      if(!error)return redirect(next);
    } catch { /* Return a generic error without exposing auth codes or tokens. */ }
  }
  return redirect('/login?error=auth_error');
}
