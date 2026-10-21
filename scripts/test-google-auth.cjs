const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('node:assert/strict'),ts=require('typescript');
process.chdir(path.resolve(__dirname,'..'));
const {NextRequest,NextResponse}=require('next/server');
function load(file,imports={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:name=>{if(name in imports)return imports[name];throw Error('Unexpected import '+name)},URL,process});return exports;}
(async()=>{
const navigation=load('src/features/auth/authNavigation.ts');
for(const next of [null,'','https://evil.example','//evil.example','/\\evil.example','/auth/callback','/reset-password?next=https://evil.example','/dashboard#https://evil.example'])assert.equal(navigation.safeAuthDestination(next),'/dashboard');
assert.equal(navigation.safeAuthDestination('/reset-password'),'/reset-password');
const options=navigation.googleOAuthOptions('https://app.example');assert.equal(options.provider,'google');assert.equal(options.options.redirectTo,'https://app.example/auth/callback');assert.equal(options.options.scopes,'openid email profile');assert.equal(options.options.queryParams.prompt,'select_account');
let calls=[],failure=false,throws=false;
const route=load('src/app/auth/callback/route.ts',{'next/server':{NextResponse},'@/features/auth/authNavigation':navigation,'@/lib/supabaseServer':{createServerSupabaseClient:async()=>({auth:{exchangeCodeForSession:async code=>{calls.push(code);if(throws)throw Error('sensitive details');return {error:failure?{message:'sensitive details'}:null}}}})}});
const request=url=>new NextRequest('https://app.example'+url);
let response=await route.GET(request('/auth/callback?code=test-code&next=https://evil.example'));
assert.equal(response.headers.get('location'),'https://app.example/dashboard');assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(calls,['test-code']);
response=await route.GET(request('/auth/callback?code=recovery&next=/reset-password'));assert.equal(response.headers.get('location'),'https://app.example/reset-password');
response=await route.GET(request('/auth/callback?error=access_denied'));assert.equal(response.headers.get('location'),'https://app.example/login?error=access_denied');assert.equal(calls.length,2);
response=await route.GET(request('/auth/callback'));assert.equal(response.headers.get('location'),'https://app.example/login?error=auth_error');
failure=true;response=await route.GET(request('/auth/callback?code=bad'));assert.equal(response.headers.get('location'),'https://app.example/login?error=auth_error');throws=true;response=await route.GET(request('/auth/callback?code=bad'));assert.equal(response.headers.get('location'),'https://app.example/login?error=auth_error');
let user={id:'existing-user'};const middleware=load('src/proxy.ts',{'next/server':{NextResponse},'@supabase/ssr':{createServerClient:()=>({auth:{getUser:async()=>({data:{user}})}})}}).proxy;
response=await middleware(request('/auth/callback?code=existing-account'));assert.equal(response.headers.get('location'),null);
response=await middleware(request('/login'));assert.equal(response.headers.get('location'),'https://app.example/dashboard');
user=null;response=await middleware(request('/auth/callback?code=new-account'));assert.equal(response.headers.get('location'),null);
response=await middleware(request('/spaces'));assert.equal(response.headers.get('location'),'https://app.example/login');
console.log('Google auth checks passed: minimal scopes, PKCE callback options, safe redirects, recovery, cancellation/errors without secrets, callback allowed with an existing session, protected pages.');
})().catch(error=>{console.error(error);process.exitCode=1});
