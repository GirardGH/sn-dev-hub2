const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
process.chdir(path.resolve(__dirname, '..'));
function load(file, mocks = {}) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('require', 'module', 'exports', code)(name => Object.hasOwn(mocks,name) ? mocks[name] : require(name), mod, mod.exports);
  return mod.exports;
}
(async () => {
  const { csvCell } = load('src/lib/csv.ts');
  for (const text of ['=SUM(A1:A2)', '  +SUM(A1:A2)', '-1+2', '@test', '\t=1', '\n=1']) assert.ok(csvCell(text).startsWith('"\''));
  assert.equal(csvCell('ordinary, "text"'), '"ordinary, ""text"""');
  assert.equal(csvCell('x\ny'), '"x\ny"');
  assert.equal(csvCell(null), '""');
  const { clientSchema } = load('src/features/clients/client.types.ts');
  assert.throws(() => clientSchema.parse({name:' ',status:'active'}));
  assert.throws(() => clientSchema.parse({name:'test',status:'x'.repeat(65)}));
  assert.equal(clientSchema.parse({name:' Client ',status:'active'}).name,'Client');
  const valid = {client_id:'00000000-0000-4000-8000-000000000001',story_id:'00000000-0000-4000-8000-000000000002',title:'Test',status:'draft',development_type:'business_rule',config:{script:'keep();'}};
  const { developmentSchema } = load('src/features/developments/development.types.ts');
  assert.equal(developmentSchema.parse(valid).config.script,'keep();');
  assert.equal(developmentSchema.safeParse({...valid,config:{script:'x'.repeat(2*1024*1024)}}).success,false);
  const { storySchema } = load('src/features/stories/story.types.ts');
  assert.equal(storySchema.safeParse({...valid,estimated_uo:-1}).success,false);
  for (const schema of [storySchema,developmentSchema]) assert.equal(schema.safeParse({...valid,client_id:'forged'}).success,false);
  for (const [entity,schema] of [['client',clientSchema],['story',storySchema],['development',developmentSchema]]) {
    let calls=0;
    const actions=load(`src/features/${entity==='story'?'stories':entity+'s'}/${entity}.actions.ts`, {
      '@/lib/supabaseSpace':{createSpaceSupabaseClient:async()=>{calls++;throw Error('Unexpected DB access');}},
      [`./${entity}.types`]:{[entity+'Schema']:schema},
      'next/cache':{revalidatePath(){}},
    });
    for (const operation of ['create','update']) {
      const fn=actions[operation+entity[0].toUpperCase()+entity.slice(1)];
      const invalid={...valid,name:' ',title:' '};
      await assert.rejects(()=> operation==='create'?fn(invalid):fn(valid.client_id,invalid));
    }
    assert.equal(calls,0,`${entity}: invalid input must not reach the database`);
  }
  console.log('Security checks passed: CSV formulas/quoting, JSON budgets, business validation, invalid server input refused before DB access.');
})().catch(error=>{console.error(error);process.exitCode=1});
