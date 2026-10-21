const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),assert=require('node:assert/strict');
process.chdir(path.resolve(__dirname,'..'));
const calls=[],invalidations=[];let failure=false;
const client={auth:{getUser:async()=>({data:{user:{id:'user'}}})},rpc:async(name,args)=>{calls.push({name,args});return failure?{data:null,error:{message:'Commit failed'}}:{data:{created:1,updated:1,skipped:1},error:null}},from(){throw Error('A commit must not use multiple table writes')}};
const code=ts.transpileModule(fs.readFileSync('src/features/xml/xml.actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};new Function('require','module','exports',code)(name=>{
if(name==='@/lib/supabaseSpace')return{createSpaceSupabaseClient:async()=>client};
if(name==='@/features/spaces/space.server')return{getSpaceContext:async()=>({active:{id:'active-space'}})};
if(name==='next/cache')return{revalidatePath:p=>invalidations.push(p)};
throw Error('Unexpected import '+name);
},mod,mod.exports);
(async()=>{
const params={xmlImportId:'archive',storyId:'story',clientId:'client',components:[{xmlTag:'custom_table',developmentType:'custom_type',title:'Original title',targetTable:null,config:{script:'  keep();\n',custom:false},rawXml:'<original/>',selected:true}]};
const before=JSON.stringify(params);assert.deepEqual(await mod.exports.createDevelopmentsFromXmlImport(params),{created:1,updated:1,skipped:1});
assert.equal(calls.length,1);assert.equal(calls[0].name,'commit_xml_import');assert.equal(calls[0].args.p_space,'active-space');assert.deepEqual(calls[0].args.p_components,params.components);assert.equal(JSON.stringify(params),before);
assert.ok(invalidations.includes('/xml-imports'));const previous=invalidations.length;failure=true;
await assert.rejects(()=>mod.exports.createDevelopmentsFromXmlImport(params),/Commit failed/);assert.equal(invalidations.length,previous);
console.log('XML action checks passed: one transactional RPC, active-space scope, unchanged component payload, failures propagated without success invalidation.');
})().catch(error=>{console.error(error);process.exitCode=1});
