import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {MongoClient} from 'mongodb';
import {fileURLToPath} from 'node:url';
const directory=await mkdtemp(join(tmpdir(),'star-builders-replica-'));
const socket=createServer();await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
const mongo=spawn(process.env.MONGOD_PATH||'mongod',['--dbpath',directory,'--port',String(port),'--bind_ip','127.0.0.1','--replSet','starBuildersTest','--logpath',join(directory,'mongod.log')],{stdio:'ignore'});
let failure;mongo.on('error',error=>{failure=error;});
const direct=`mongodb://127.0.0.1:${port}/?directConnection=true`;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
 let initialized=false;
 for(let i=0;i<40;i++){if(failure)throw failure;const client=new MongoClient(direct,{serverSelectionTimeoutMS:500});try{await client.connect();await client.db('admin').command({replSetInitiate:{_id:'starBuildersTest',members:[{_id:0,host:`127.0.0.1:${port}`}]}});initialized=true;break;}catch{await wait(250);}finally{await client.close();}}
 if(!initialized)throw new Error('Temporary MongoDB could not start. Install mongod or set MONGOD_PATH.');
 let ready=false;for(let i=0;i<40;i++){const client=new MongoClient(direct,{serverSelectionTimeoutMS:500});try{await client.connect();if((await client.db('admin').command({hello:1})).isWritablePrimary){ready=true;break;}}catch{}finally{await client.close();}await wait(250);}
 if(!ready)throw new Error('Temporary replica set did not elect a primary.');
 const child=spawn('npm',['test'],{cwd:fileURLToPath(new URL('..',import.meta.url)),stdio:'inherit',env:{...process.env,STAR_BUILDERS_TEST_MONGODB_URI:`mongodb://127.0.0.1:${port}/?replicaSet=starBuildersTest`}});
 process.exitCode=await new Promise(resolve=>{child.on('exit',code=>resolve(code??1));child.on('error',()=>resolve(1));});
}finally{
 if(mongo.exitCode===null&&!failure){mongo.kill('SIGTERM');await new Promise(resolve=>mongo.once('exit',resolve));}
 await rm(directory,{recursive:true,force:true});
}
