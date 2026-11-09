import {after, test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

// Exercise the real App/screens under React Router without requiring a browser.
// esbuild is already installed by Vite; bundle once into an isolated temp folder.
const folder=mkdtempSync(join(tmpdir(),'star-builders-router-'));
after(()=>rmSync(folder,{recursive:true,force:true}));
const bundle=await build({
  stdin:{contents:`
    import {renderToStaticMarkup} from 'react-dom/server';
    import {MemoryRouter} from 'react-router-dom';
    import App from './src/App';
    import {AuthContext} from './src/features/auth/AuthProvider';
    export function renderRoute(path, role = 'ADMIN') {
      const auth = {user: {id:'test-admin',name:'Test Admin',phone:'0000000000',email:'',role,active:true},status:'authenticated',message:'',login:async()=>{},logout:()=>{},retry:()=>{},updateUser:()=>{},request:async()=>{throw new Error('No API during static rendering');}};
      return renderToStaticMarkup(<MemoryRouter initialEntries={[path]}><AuthContext.Provider value={auth}><App/></AuthContext.Provider></MemoryRouter>);
    }
  `,resolveDir:process.cwd(),loader:'tsx'},
  bundle:true,platform:'node',format:'cjs',jsx:'automatic',write:false,
});
const compiled=join(folder,'app.cjs');writeFileSync(compiled,bundle.outputFiles[0].text);
const {renderRoute}=createRequire(import.meta.url)(compiled);
const screens=[
  ['/dashboard','Dashboard','Dashboard Overview'],
  ['/sites','Sites','Site Management'],
  ['/labourers','Labourers','Labour Management'],
  ['/attendance','Attendance','Daily Attendance'],
  ['/weekly-payroll','Weekly Payroll','Labour-wise Payroll'],
  ['/advances','Advances','Advance Register'],
  ['/payments','Payments','Payment History'],
  ['/reports','Reports','Reports &amp; Analytics'],
  ['/settings','Settings','Company Settings'],
];
for(const [path,label,heading] of screens){
  test(`direct ${path} renders its screen, breadcrumb and active sidebar link`,()=>{
    const html=renderRoute(path);
    assert.ok(html.includes(heading),`Missing ${heading}`);
    const header=html.match(/<header[\s\S]*?<\/header>/)?.[0];
    assert.ok(header?.includes(`>${label}</span>`));
    assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
    assert.match(html,new RegExp(`aria-current="page"[^>]*href="${path}"`));
    for(const [href] of screens)assert.ok(html.includes(`href="${href}"`));
  });
}
test('trailing slash resolves the same screen and active navigation',()=>{
  const html=renderRoute('/sites/');assert.ok(html.includes('Site Management'));assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
});
test('payroll route keeps only arrow controls for week navigation',()=>{
  const html=renderRoute('/weekly-payroll');
  assert.ok(html.includes('Previous payroll week'));assert.ok(html.includes('Next payroll week'));
  assert.ok(!html.includes('Choose payroll week'));
});

test('Settings separates user management and company settings into accessible tabs',()=>{
  const html=renderRoute('/settings');
  for(const text of ['Company Settings','User Management','Add User','Loading users'])assert.ok(html.includes(text));
  assert.ok(!html.includes('type="password"'));
  assert.ok(!html.includes('Assigned Sites'));
  assert.ok(html.includes('Assign supervisors from the Sites page'));
  assert.match(html, /role="tab" aria-selected="false"[^>]*>Settings<\/button>/);
  assert.match(html, /role="tab" aria-selected="true"[^>]*>User Management<\/button>/);
  assert.match(html, /role="tabpanel"[^>]*hidden=""[^>]*>[\s\S]*?Company Settings/);
});

 test('Sites exposes supervisor assignment on existing cards',()=>{
 const html=renderRoute('/sites');
 assert.equal((html.match(/aria-label="Assign supervisor for /g)||[]).length,0);
 assert.ok(!html.includes('Suresh K'));assert.ok(!html.includes('Anna Nagar Residence'));
 });

test('Supervisor routes show no wage, payroll or user-management information',()=>{
 const html=renderRoute('/sites','SUPERVISOR');
 assert.ok(html.includes('Site Management'));assert.ok(!html.includes('Anna Nagar Residence'));
 for(const path of ['/dashboard','/labourers','/weekly-payroll','/payments','/advances','/reports','/settings'])assert.ok(!html.includes(`href="${path}"`));
 assert.ok(!html.includes('Project Budget'));assert.ok(!html.includes('₹'));
});
