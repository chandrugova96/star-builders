import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const source=readFileSync(new URL('../src/features/settings/userModel.ts',import.meta.url),'utf8');
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const {validateUser,normalizeUser,assignSiteSupervisor}=await import('data:text/javascript;base64,'+Buffer.from(output).toString('base64'));
const sites=[{id:'S1'},{id:'S2'}];
const draft={name:'Demo Supervisor',email:'',phone:'',role:'Supervisor',siteIds:['S1']};

test('user creation accepts optional contacts and validates required name and role',()=>{
 assert.equal(validateUser(draft,[],sites),'');
 assert.match(validateUser({...draft,name:'  '},[],sites),/full name/);
 assert.match(validateUser({...draft,role:'Other'},[],sites),/Admin or Supervisor/);
});
test('phone remains a digits-only string, preserving leading zeros',()=>{
 assert.equal(validateUser({...draft,phone:'0012345678'},[],sites),'');
 assert.equal(normalizeUser({...draft,phone:'0012345678'},'U1').phone,'0012345678');
 for(const phone of ['123abc','123.45','1e10'])assert.match(validateUser({...draft,phone},[],sites),/digits only/);
});
test('email uniqueness ignores case and permits editing the same user',()=>{
 const users=[{...draft,id:'U1',email:'demo@example.test'}];
 assert.match(validateUser({...draft,email:'DEMO@example.test'},users,sites),/already/);
 assert.equal(validateUser({...draft,email:'DEMO@example.test'},users,sites,'U1'),'');
 assert.match(validateUser({...draft,email:'invalid'},[],sites),/valid email/);
});
test('supervisor assignments reference real sites and do not mutate the form',()=>{
 assert.match(validateUser({...draft,siteIds:['missing']},[],sites),/no longer exists/);
 const assigned={...draft,siteIds:['S1','S2','S1']};const user=normalizeUser(assigned,'U2');
 assert.deepEqual(user.siteIds,['S1','S2']);assert.deepEqual(assigned.siteIds,['S1','S2','S1']);
 assert.equal(validateUser({...draft,siteIds:[]},[],sites),'');
});
test('switching a supervisor to Admin clears individual site restrictions',()=>{
 const user=normalizeUser({...draft,name:'  Demo Admin  ',role:'Admin',siteIds:['S1']},'U3');
 assert.equal(user.name,'Demo Admin');assert.deepEqual(user.siteIds,[]);assert.equal(user.role,'Admin');
});

test('site assignment allows only supervisors and moves the site without losing other assignments',()=>{
 const users=[{...draft,id:'A',role:'Admin',siteIds:[]},{...draft,id:'S1',siteIds:['SITE1','SITE2']},{...draft,id:'S2',siteIds:[]}];
 const result=assignSiteSupervisor(users,'SITE1','S2');
 assert.equal(result.error,'');assert.deepEqual(result.users[1].siteIds,['SITE2']);assert.deepEqual(result.users[2].siteIds,['SITE1']);
 assert.deepEqual(users[1].siteIds,['SITE1','SITE2']);
 assert.match(assignSiteSupervisor(users,'SITE1','A').error,/Supervisor/);
 assert.match(assignSiteSupervisor(users,'SITE1','missing').error,/Supervisor/);
 const cleared=assignSiteSupervisor(users,'SITE1','');assert.equal(cleared.error,'');assert.deepEqual(cleared.users[1].siteIds,['SITE2']);
});
