const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Dependency-free .env loader. Secrets stay server-side and are never sent to the browser.
(function loadLocalEnv(){
  const envPath=path.join(__dirname,".env");
  if(!fs.existsSync(envPath)) return;
  try{for(const line of fs.readFileSync(envPath,"utf8").split(/\r?\n/)){const m=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^(["'])(.*)\1$/,"$2")}}catch{}
})();

const APP_VERSION = "1.6.3";
const PORT = Number(process.env.PORT || 3100);
const AUTO_SELECT_PORT = !process.env.PORT;
let ACTIVE_PORT = PORT;
let dbPool = null;
let dbWriteQueue = Promise.resolve();
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA = path.join(ROOT, "data");
fs.mkdirSync(DATA, {recursive:true});
const USERS_FILE = path.join(DATA, "users.json");
const SOUNDS_FILE = path.join(DATA, "sounds.json");
const CHATS_FILE = path.join(DATA, "public-chats.json");
let publicChats = loadJson(CHATS_FILE, []);
if (!Array.isArray(publicChats)) publicChats = [];
const sessions = new Map();
const voiceRooms = new Map();
const discordOAuthStates = new Map();
let visitorCount = 0;

const demoSounds = [
  {id:"demo-1", name:"Coin Spark", category:"Gaming", icon:"🪙", volume:0.95, hotkey:"1", combo:"", pitch:1, speed:1, file:"/audio/coin.wav"},
  {id:"demo-2", name:"Bass Impact", category:"Impact", icon:"💥", volume:0.95, hotkey:"2", combo:"", pitch:1, speed:1, file:"/audio/bassdrop.wav"},
  {id:"demo-3", name:"Laser Zap", category:"FX", icon:"⚡", volume:0.95, hotkey:"3", combo:"CTRL+SHIFT+3", pitch:1, speed:1, file:"/audio/laser.wav"},
  {id:"demo-4", name:"Positive Pop", category:"UI", icon:"✨", volume:0.95, hotkey:"4", combo:"", pitch:1, speed:1, file:"/audio/pop.wav"},
  {id:"demo-5", name:"Retro Glitch", category:"Meme", icon:"👾", volume:0.95, hotkey:"5", combo:"CTRL+SHIFT+5", pitch:1, speed:1, file:"/audio/glitch.wav"},
  {id:"demo-6", name:"Air Horn", category:"Meme", icon:"📣", volume:0.9, hotkey:"6", combo:"CTRL+SHIFT+6", pitch:1, speed:1, file:"/audio/airhorn.wav"},
  {id:"demo-7", name:"Rimshot", category:"Meme", icon:"🥁", volume:0.9, hotkey:"7", combo:"", pitch:1, speed:1, file:"/audio/rimshot.wav"},
  {id:"demo-8", name:"Crowd Cheer", category:"Crowd", icon:"🙌", volume:0.9, hotkey:"8", combo:"", pitch:1, speed:1, file:"/audio/crowd_cheer.wav"},
  {id:"demo-9", name:"Record Scratch", category:"DJ", icon:"💿", volume:0.9, hotkey:"9", combo:"CTRL+SHIFT+9", pitch:1, speed:1, file:"/audio/record_scratch.wav"},
  {id:"demo-10", name:"Notification", category:"UI", icon:"🔔", volume:0.9, hotkey:"0", combo:"", pitch:1, speed:1, file:"/audio/notification.wav"},
  {id:"demo-11", name:"Whoosh", category:"FX", icon:"💨", volume:0.9, hotkey:"Q", combo:"", pitch:1, speed:1, file:"/audio/whoosh.wav"},
  {id:"demo-12", name:"Heartbeat", category:"FX", icon:"💓", volume:0.9, hotkey:"W", combo:"", pitch:1, speed:1, file:"/audio/heartbeat.wav"},
  {id:"demo-13", name:"Error Buzz", category:"UI", icon:"⚠️", volume:0.9, hotkey:"E", combo:"", pitch:1, speed:1, file:"/audio/error_buzz.wav"},
  {id:"demo-14", name:"Magic Chime", category:"FX", icon:"✨", volume:0.9, hotkey:"R", combo:"", pitch:1, speed:1, file:"/audio/magic_chime.wav"},
  {id:"demo-15", name:"Victory Fanfare", category:"Gaming", icon:"🏆", volume:0.9, hotkey:"T", combo:"CTRL+SHIFT+T", pitch:1, speed:1, file:"/audio/victory_fanfare.wav"}
];
function loadJson(file,fallback){try{return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,"utf8")):fallback}catch{return fallback}}
function saveJson(file,value){
  if (dbPool) return queueDatabasePersist();
  fs.writeFileSync(file,JSON.stringify(value,null,2));
  return Promise.resolve();
}
function cloneRecord(value){return value==null?value:JSON.parse(JSON.stringify(value));}
function queueDatabasePersist(){
  if(!dbPool) return Promise.resolve();
  const next=dbWriteQueue.catch(()=>{}).then(async()=>{
    // Accounts are canonical in foglabs_users. Persist only records changed by this
    // process, so an instance with a stale in-memory map cannot overwrite other users.
    for(const [email,record] of Object.entries(users)){
      if(JSON.stringify(persistedUsers[email] ?? null)===JSON.stringify(record)) continue;
      await dbPool.query(
        "INSERT INTO foglabs_users (email, record, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (email) DO UPDATE SET record = EXCLUDED.record, updated_at = NOW()",
        [email,JSON.stringify(record)]
      );
      persistedUsers[email]=cloneRecord(record);
    }
    await dbPool.query(
      "INSERT INTO foglabs_state (id, state, updated_at) VALUES (1, $1::jsonb, NOW()) ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()",
      [JSON.stringify({users, sounds, publicChats})]
    );
  }).then(()=>undefined);
  dbWriteQueue=next;
  next.catch(err=>console.error("Database persist failed:",err.message));
  return next;
}
async function initDatabase(){
  if(!process.env.DATABASE_URL){
    if(process.env.NODE_ENV === "production") throw new Error("DATABASE_URL mancante: configura PostgreSQL nel servizio di hosting prima della pubblicazione.");
    return;
  }
  const {Pool}=require("pg");
  const options={connectionString:process.env.DATABASE_URL,max:5,idleTimeoutMillis:30000,connectionTimeoutMillis:10000};
  if(process.env.NODE_ENV === "production" && process.env.PGSSLMODE !== "disable") options.ssl={rejectUnauthorized:false};
  dbPool=new Pool(options);
  await dbPool.query("CREATE TABLE IF NOT EXISTS foglabs_state (id integer PRIMARY KEY CHECK (id = 1), state jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT NOW())");
  await dbPool.query("CREATE TABLE IF NOT EXISTS foglabs_assets (name text PRIMARY KEY, content_type text NOT NULL, data bytea NOT NULL, updated_at timestamptz NOT NULL DEFAULT NOW())");
  await dbPool.query("CREATE TABLE IF NOT EXISTS foglabs_users (email text PRIMARY KEY, record jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT NOW())");

  const result=await dbPool.query("SELECT state FROM foglabs_state WHERE id = 1");
  let legacyUsers={};
  if(result.rows.length){
    const state=result.rows[0].state||{};
    legacyUsers=state.users&&typeof state.users==="object"?state.users:{};
    sounds=Array.isArray(state.sounds)&&state.sounds.length?state.sounds:demoSounds;
    publicChats=Array.isArray(state.publicChats)?state.publicChats:[];
  } else {
    legacyUsers={...users};
    await dbPool.query("INSERT INTO foglabs_state (id,state,updated_at) VALUES (1,$1::jsonb,NOW())",[JSON.stringify({users:legacyUsers,sounds,publicChats})]);
  }

  // One-time-compatible migration from the legacy JSONB account map.
  for(const [email,record] of Object.entries(legacyUsers)){
    if(!record || typeof record!=="object") continue;
    await dbPool.query(
      "INSERT INTO foglabs_users (email, record, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (email) DO NOTHING",
      [email,JSON.stringify({...record,email:record.email||email})]
    );
  }
  const accounts=await dbPool.query("SELECT email, record FROM foglabs_users ORDER BY email");
  users={};
  for(const row of accounts.rows){
    if(row.record&&typeof row.record==="object") users[row.email]={...row.record,email:row.record.email||row.email};
  }
  persistedUsers=cloneRecord(users)||{};
  // Keep the legacy state row in sync for older app builds, without using it as the
  // canonical source of account records anymore.
  await dbPool.query("UPDATE foglabs_state SET state = jsonb_set(state, '{users}', $1::jsonb, true), updated_at = NOW() WHERE id = 1",[JSON.stringify(users)]);
  console.log(`PostgreSQL collegato: ${Object.keys(users).length} account caricati; account persistenti in foglabs_users.`);
}
function cookieClear(){return `dsb_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`}
async function saveUploadedAsset(fileName,contentType,data){
  if(dbPool){await dbPool.query("INSERT INTO foglabs_assets (name,content_type,data,updated_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT (name) DO UPDATE SET content_type=EXCLUDED.content_type,data=EXCLUDED.data,updated_at=NOW()",[fileName,contentType||"application/octet-stream",data]);return;}
  fs.writeFileSync(path.join(DATA,fileName),data);
}
async function removeUploadedAsset(fileName){
  if(dbPool){await dbPool.query("DELETE FROM foglabs_assets WHERE name=$1",[fileName]);return;}
  const target=path.join(DATA,path.basename(fileName));try{if(fs.existsSync(target))fs.unlinkSync(target)}catch{}
}
async function sendStoredAudio(res,fileName){
  if(dbPool && /^upload-[a-f0-9]+\.(wav|mp3|ogg|m4a)$/i.test(fileName)){
    const result=await dbPool.query("SELECT content_type,data FROM foglabs_assets WHERE name=$1",[fileName]);
    if(result.rows.length){const row=result.rows[0];res.writeHead(200,{"Content-Type":row.content_type,"Content-Length":row.data.length,"Cache-Control":"private, max-age=300"});res.end(row.data);return true;}
  }
  return false;
}
let users=loadJson(USERS_FILE,{});
let persistedUsers={};
let sounds=loadJson(SOUNDS_FILE,demoSounds);
if(!Array.isArray(sounds)||!sounds.length) sounds=demoSounds;

function send(res, code, body, type="application/json; charset=utf-8", extra={}) {
  res.writeHead(code, {"Content-Type":type, "Cache-Control":"no-store", ...extra});
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}
function sessionUser(req) {
  const c=req.headers.cookie||""; const m=c.match(/(?:^|;\s*)dsb_session=([^;]+)/);
  return m ? sessions.get(m[1]) || null : null;
}
function createSession(user={id:"test",username:"TestUser",email:null,canEdit:false,vip:false}) {
  const sid=crypto.randomBytes(18).toString("hex");
  const session={...user}; sessions.set(sid,session); visitorCount+=1; return {sid,user:session};
}
function cookie(sid){return `dsb_session=${sid}; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`}
function requireAuth(req,res){const user=sessionUser(req);if(!user){send(res,401,{error:"not_authenticated"});return null}return user}
function safeName(v,fallback="Uploaded sound"){return String(v||fallback).replace(/[\\/:*?"<>|]/g," ").trim().slice(0,60)||fallback}
function publicSound(s){return {...s}}
function serveFile(res,filePath){const abs=path.resolve(filePath);if(!abs.startsWith(path.resolve(ROOT)))return send(res,403,"Forbidden","text/plain; charset=utf-8");if(!fs.existsSync(abs))return send(res,404,"Not found","text/plain; charset=utf-8");const ext=path.extname(abs).toLowerCase();const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".wav":"audio/wav",".mp3":"audio/mpeg",".ogg":"audio/ogg",".m4a":"audio/mp4",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png"};const stat=fs.statSync(abs);const cacheControl=[".html",".js",".css"].includes(ext)?"no-cache, no-store, must-revalidate":"public, max-age=300";res.writeHead(200,{"Content-Type":types[ext]||"application/octet-stream","Content-Length":stat.size,"Cache-Control":cacheControl,"X-Content-Type-Options":"nosniff"});fs.createReadStream(abs).pipe(res)}
function parseBody(req,cb){let raw="",tooLarge=false;req.on("data",c=>{if(tooLarge)return;if(raw.length+c.length>1024*1024){tooLarge=true;raw="";return;}raw+=c;});req.on("end",()=>{if(tooLarge)return cb(new Error("body_too_large"));try{cb(null,JSON.parse(raw||"{}"))}catch(e){cb(e)}})}
function parseMultipart(req,boundary,onDone){const chunks=[];req.on("data",c=>chunks.push(c));req.on("end",()=>{const body=Buffer.concat(chunks),marker=Buffer.from("--"+boundary);let idx=0,file=null;while(true){const start=body.indexOf(marker,idx);if(start<0)break;const next=body.indexOf(marker,start+marker.length);if(next<0)break;const part=body.slice(start+marker.length+2,next-2);const sep=part.indexOf(Buffer.from("\r\n\r\n"));if(sep>=0){const head=part.slice(0,sep).toString("utf8"),content=part.slice(sep+4);const fn=head.match(/filename="([^"]*)"/i),ct=head.match(/Content-Type:\s*([^\r\n]+)/i);if(fn&&fn[1])file={filename:fn[1],type:ct?ct[1].trim():"application/octet-stream",data:content}}idx=next}onDone(file)})}
function userRecord(user){return user&&user.email?users[user.email]||null:null}
function visibleSounds(user){return sounds.filter(s=>!s.ownerId || s.ownerId===user.id)}
function saveUserProgress(user,progress){const rec=userRecord(user);if(!rec)return false;const safe={
  favorites:Array.isArray(progress?.favorites)?progress.favorites.map(String).slice(0,500):[],
  scenes:(progress?.scenes&&typeof progress.scenes==="object")?Object.fromEntries(Object.entries(progress.scenes).slice(0,100).map(([k,v])=>[String(k).slice(0,80),Array.isArray(v)?v.map(String).slice(0,100):[]])):{},
  preferences:(progress?.preferences&&typeof progress.preferences==="object")?{rememberFavorites:!!progress.preferences.rememberFavorites,stopOthers:!!progress.preferences.stopOthers,keyboardHints:progress.preferences.keyboardHints!==false}: {},
  queue:Array.isArray(progress?.queue)?progress.queue.map(String).slice(0,100):[]
};
  rec.progress=safe; saveJson(USERS_FILE,users); return true;
}
function discordHttpJson(options,body=""){
  return new Promise((resolve,reject)=>{
    const req=https.request(options,res=>{let raw="";res.on("data",c=>raw+=c);res.on("end",()=>{let data=null;try{data=JSON.parse(raw||"{}")}catch{};if(res.statusCode>=200&&res.statusCode<300)return resolve(data);const e=new Error(data?.message||`discord_http_${res.statusCode}`);e.statusCode=res.statusCode;reject(e)})});
    req.on("error",reject);req.setTimeout(10000,()=>req.destroy(new Error("discord_timeout")));if(body)req.write(body);req.end();
  });
}
function discordApi(pathname,method="GET",headers={},body=""){return discordHttpJson({hostname:"discord.com",path:`/api/v10${pathname}`,method,headers:{"User-Agent":"VYBEX-Local/1.0","Accept":"application/json",...headers}},body)}
function discordOAuthConfigured(){return !!(process.env.DISCORD_CLIENT_ID&&process.env.DISCORD_CLIENT_SECRET)}
function discordRedirectUri(req){return process.env.DISCORD_REDIRECT_URI||`http://${req.headers.host||`localhost:${PORT}`}/api/discord/oauth/callback`}
function discordUserView(rec){return rec?.discord?{id:rec.discord.id,username:rec.discord.username,globalName:rec.discord.globalName||"",avatar:rec.discord.avatar||null,guilds:Array.isArray(rec.discord.guilds)?rec.discord.guilds:[],connectedAt:rec.discord.connectedAt||null}:null}
function simplifyGuilds(guilds){return (Array.isArray(guilds)?guilds:[]).map(g=>({id:g.id,name:g.name,icon:g.icon||null,owner:!!g.owner,permissions:g.permissions||"0"})).slice(0,200)}
async function discordFetchUserAndGuilds(accessToken){const auth={Authorization:`Bearer ${accessToken}`};const me=await discordApi("/users/@me","GET",auth);const guilds=await discordApi("/users/@me/guilds","GET",auth);return {me,guilds:simplifyGuilds(guilds)}}
async function discordRefreshToken(refreshToken,req){const body=new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,client_secret:process.env.DISCORD_CLIENT_SECRET,grant_type:"refresh_token",refresh_token:refreshToken,redirect_uri:discordRedirectUri(req)}).toString();return discordHttpJson({hostname:"discord.com",path:"/api/oauth2/token",method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Content-Length":Buffer.byteLength(body),"User-Agent":"VYBEX-Local/1.0"}},body)}
function discordRequest(webhookUrl,body,headers={}){return new Promise((resolve,reject)=>{let u;try{u=new URL(webhookUrl)}catch{return reject(new Error("invalid_webhook"))}if(u.protocol!=="https:"||!/^discord(?:app)?\.com$/i.test(u.hostname))return reject(new Error("invalid_webhook"));const req=https.request({hostname:u.hostname,path:u.pathname+u.search,method:"POST",headers:{"User-Agent":"VYBEX-Local/1.0",...headers}},res=>{let raw="";res.on("data",c=>raw+=c);res.on("end",()=>{if(res.statusCode>=200&&res.statusCode<300)resolve(raw);else reject(new Error("discord_http_"+res.statusCode))})});req.on("error",reject);req.write(body);req.end()})}
function discordGet(url,kind){return new Promise((resolve,reject)=>{let u;try{u=new URL(url)}catch{return reject(new Error(kind==="invite"?"invalid_invite":"invalid_webhook"))}if(u.protocol!=="https:")return reject(new Error(kind==="invite"?"invalid_invite":"invalid_webhook"));if(kind==="webhook"&&!/^discord(?:app)?\.com$/i.test(u.hostname))return reject(new Error("invalid_webhook"));const req=https.request({hostname:u.hostname,path:u.pathname+u.search,method:"GET",headers:{"User-Agent":"VYBEX-Local/1.0","Accept":"application/json"}},res=>{let raw="";res.on("data",c=>raw+=c);res.on("end",()=>{let data=null;try{data=JSON.parse(raw||"{}") }catch{} if(res.statusCode>=200&&res.statusCode<300)return resolve(data); if(kind==="invite")return reject(new Error(res.statusCode===404?"invite_not_found":"discord_invite_http_"+res.statusCode)); reject(new Error("discord_http_"+res.statusCode))})});req.on("error",reject);req.setTimeout(8000,()=>{req.destroy(new Error("discord_timeout"))});req.end()})}
function validateInvite(invite){let u;try{u=new URL(invite)}catch{return Promise.reject(new Error("invalid_invite"))}if(u.protocol!=="https:"||!/^((www\.)?discord\.gg|discord(?:app)?\.com)$/i.test(u.hostname))return Promise.reject(new Error("invalid_invite"));const m=u.pathname.match(/\/invite\/([^/]+)$/i);const code=m?m[1]:(/^discord\.gg$/i.test(u.hostname)?u.pathname.replace(/^\//,""):"");if(!code||!/^[A-Za-z0-9-]{2,100}$/.test(code))return Promise.reject(new Error("invalid_invite"));return discordGet(`https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true`,"invite").then(data=>({code,name:data?.guild?.name||"",guildId:data?.guild?.id||""}))}
function makeDiscordMultipart(sound,content){const boundary="----SoundboardBoundary"+crypto.randomBytes(12).toString("hex");
  // Sound URLs are always local /audio/... paths; resolve only against DATA for safety.
  const localName=path.basename(String(sound.file||"")); const actual=path.join(DATA,localName); if(!fs.existsSync(actual)) throw new Error("sound_file_missing");
  const file=fs.readFileSync(actual); const filename=safeName(sound.name,"sound")+path.extname(actual);
  const chunks=[]; const push=x=>chunks.push(Buffer.isBuffer(x)?x:Buffer.from(x));
  push(`--${boundary}\r\nContent-Disposition: form-data; name="payload_json"\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({content:content||`🔊 ${sound.name}`})}\r\n`);
  push(`--${boundary}\r\nContent-Disposition: form-data; name="files[0]"; filename="${filename.replace(/"/g,"_")}"\r\nContent-Type: ${sound.file.endsWith(".wav")?"audio/wav":sound.file.endsWith(".mp3")?"audio/mpeg":sound.file.endsWith(".ogg")?"audio/ogg":"audio/mp4"}\r\n\r\n`); push(file); push(`\r\n--${boundary}--\r\n`); return {body:Buffer.concat(chunks),boundary};
}

const server=http.createServer(async (req,res)=>{
  const u=new URL(req.url,`http://${req.headers.host}`);
  if(u.pathname==="/health" && req.method==="GET"){
    if(dbPool){try{await dbPool.query("SELECT 1");}catch{return send(res,503,{ok:false,database:false});}}
    return send(res,200,{ok:true,database:!!dbPool,guestAccess:true,version:APP_VERSION,environment:process.env.NODE_ENV==="production"?"production":"development"});
  }
  // Guest entry creates a read-only session. The old test alias is development-only.
  if(u.pathname==="/auth/guest"&&req.method==="GET"){const {sid,user}=createSession({id:"guest-"+crypto.randomBytes(8).toString("hex"),username:"Ospite",email:null,canEdit:false});return send(res,200,{ok:true,guest:true,user:{id:user.id,username:user.username,canEdit:false}},"application/json; charset=utf-8",{"Set-Cookie":cookie(sid),"Cache-Control":"no-store"})}
  if(u.pathname==="/auth/test"&&req.method==="GET"){
    if(process.env.NODE_ENV==="production")return send(res,404,{error:"not_found"});
    const {sid,user}=createSession({id:"guest-test-"+crypto.randomBytes(8).toString("hex"),username:"Ospite",email:null,canEdit:false});return send(res,200,{ok:true,guest:true,user:{id:user.id,username:user.username,canEdit:false}},"application/json; charset=utf-8",{"Set-Cookie":cookie(sid)})
  }
  if(u.pathname==="/auth/logout"&&req.method==="POST"){const m=(req.headers.cookie||"").match(/(?:^|;\s*)dsb_session=([^;]+)/);if(m)sessions.delete(m[1]);return send(res,200,{ok:true},"application/json; charset=utf-8",{"Set-Cookie":cookieClear()})}
  if(u.pathname==="/api/me"&&req.method==="GET"){const user=sessionUser(req);return send(res,200,{authenticated:!!user,user:user?{id:user.id,username:user.username,emailProvided:!!user.email,canEdit:!!user.canEdit,vip:!!user.vip}:null,mode:process.env.NODE_ENV === "production" ? "PRODUCTION" : "DEVELOPMENT",visitorCount})}
  if(u.pathname==="/api/progress"&&req.method==="GET"){const user=requireAuth(req,res);if(!user)return;const rec=userRecord(user);return send(res,200,{progress:rec?.progress||{favorites:[],scenes:{},preferences:{rememberFavorites:true,stopOthers:false,keyboardHints:true},queue:[]}})}
  if(u.pathname==="/api/progress"&&req.method==="POST"){const user=requireAuth(req,res);if(!user)return;return parseBody(req,(err,b)=>{if(err)return send(res,400,{error:"invalid_json"});if(!saveUserProgress(user,b))return send(res,404,{error:"account_not_found"});return send(res,200,{ok:true})})}
  // Account and VIP authentication are intentionally disabled in this guest-only rebuild.
  if(req.method==="POST" && ["/api/account","/api/login","/api/register","/api/email","/api/vip/unlock"].includes(u.pathname)){
    return send(res,410,{error:"account_features_disabled",message:"Account access is disabled in this build."});
  }
  if(u.pathname==="/api/chats"&&req.method==="GET"){
    const user=sessionUser(req);const chats=publicChats.map(c=>({id:c.id,name:c.name,owner:c.owner,memberCount:1+(c.admins||[]).length,createdAt:c.createdAt}));
    return send(res,200,{chats,authenticated:!!(user&&user.email)});
  }
  if(u.pathname==="/api/chats/create"&&req.method==="POST"){
    const user=requireAuth(req,res);if(!user)return;if(!user.email)return send(res,403,{error:"registered_account_required"});
    return parseBody(req,(err,b)=>{if(err)return send(res,400,{error:"invalid_json"});const name=String(b.name||"").trim().replace(/[<>]/g,"").slice(0,40);if(name.length<2)return send(res,400,{error:"invalid_chat_name"});if(publicChats.length>=100)return send(res,429,{error:"chat_limit_reached"});const chat={id:crypto.randomBytes(5).toString("hex").toUpperCase(),name,owner:user.id,ownerName:user.username,admins:[],messages:[],createdAt:new Date().toISOString()};publicChats.unshift(chat);saveJson(CHATS_FILE,publicChats);return send(res,200,{ok:true,chat:{id:chat.id,name:chat.name,owner:chat.owner,ownerName:chat.ownerName,admins:chat.admins,messages:chat.messages}})});
  }
  if(u.pathname==="/api/chats/messages"&&req.method==="GET"){
    const user=requireAuth(req,res);if(!user)return;if(!user.email)return send(res,403,{error:"registered_account_required"});const id=String(u.searchParams.get("id")||"");const c=publicChats.find(x=>x.id===id);if(!c)return send(res,404,{error:"chat_not_found"});const role=c.owner===user.id?"owner":(c.admins||[]).includes(user.id)?"admin":"member";return send(res,200,{chat:{id:c.id,name:c.name,owner:c.owner,ownerName:c.ownerName,admins:c.admins||[],role,messages:(c.messages||[]).map(m=>({...m,role:m.userId===c.owner?"owner":(c.admins||[]).includes(m.userId)?"admin":"member"}))}});
  }
  if(u.pathname==="/api/chats/send"&&req.method==="POST"){
    const user=requireAuth(req,res);if(!user)return;if(!user.email)return send(res,403,{error:"registered_account_required"});return parseBody(req,(err,b)=>{if(err)return send(res,400,{error:"invalid_json"});const c=publicChats.find(x=>x.id===String(b.id||""));if(!c)return send(res,404,{error:"chat_not_found"});const text=String(b.text||"").trim().slice(0,1000);if(!text)return send(res,400,{error:"empty_message"});c.messages=c.messages||[];c.messages.push({id:crypto.randomBytes(6).toString("hex"),userId:user.id,username:user.username,text,createdAt:new Date().toISOString()});if(c.messages.length>300)c.messages=c.messages.slice(-300);saveJson(CHATS_FILE,publicChats);return send(res,200,{ok:true});});
  }
  if(u.pathname==="/api/chats/admin"&&req.method==="POST"){
    const user=requireAuth(req,res);if(!user)return;if(!user.email)return send(res,403,{error:"registered_account_required"});return parseBody(req,(err,b)=>{if(err)return send(res,400,{error:"invalid_json"});const c=publicChats.find(x=>x.id===String(b.id||""));if(!c)return send(res,404,{error:"chat_not_found"});if(c.owner!==user.id)return send(res,403,{error:"owner_only"});const target=String(b.username||"").trim().toLowerCase();const rec=Object.values(users).find(x=>String(x.username||"").toLowerCase()===target);if(!rec)return send(res,404,{error:"user_not_found"});if(rec.id===c.owner)return send(res,400,{error:"owner_already_owner"});c.admins=c.admins||[];if(!c.admins.includes(rec.id))c.admins.push(rec.id);saveJson(CHATS_FILE,publicChats);return send(res,200,{ok:true});});
  }
  if(u.pathname==="/api/stats"&&req.method==="GET")return send(res,200,{visitorCount});
  if(u.pathname==="/api/sounds"&&req.method==="GET"){const user=requireAuth(req,res);if(!user)return;return send(res,200,{sounds:visibleSounds(user).map(publicSound)})}
  if(u.pathname==="/api/sounds/update"&&req.method==="POST"){const user=requireAuth(req,res);if(!user)return;if(!user.canEdit)return send(res,403,{error:"email_required"});return parseBody(req,(err,b)=>{if(err)return send(res,400,{error:"invalid_json"});const s=sounds.find(x=>x.id===String(b.id||"") && (!x.ownerId || x.ownerId===user.id));if(!s)return send(res,404,{error:"sound_not_found"});if(b.name!==undefined)s.name=safeName(b.name,s.name);if(b.category!==undefined)s.category=String(b.category||"Other").slice(0,30);if(b.icon!==undefined)s.icon=String(b.icon||"🔊").slice(0,8);if(b.volume!==undefined)s.volume=Math.max(0,Math.min(1,Number(b.volume)||0));if(b.hotkey!==undefined)s.hotkey=String(b.hotkey||"").slice(0,30).toUpperCase();if(b.combo!==undefined)s.combo=String(b.combo||"").slice(0,50).toUpperCase();if(b.pitch!==undefined)s.pitch=Math.max(.5,Math.min(2,Number(b.pitch)||1));if(b.speed!==undefined)s.speed=Math.max(.5,Math.min(2,Number(b.speed)||1));if(b.fadeIn!==undefined)s.fadeIn=Math.max(0,Math.min(5,Number(b.fadeIn)||0));if(b.fadeOut!==undefined)s.fadeOut=Math.max(0,Math.min(5,Number(b.fadeOut)||0));if(b.loops!==undefined)s.loops=Math.max(1,Math.min(20,Math.round(Number(b.loops)||1)));if(b.delay!==undefined)s.delay=Math.max(0,Math.min(5,Number(b.delay)||0));if(b.tags!==undefined)s.tags=String(b.tags||"").slice(0,120);if(b.description!==undefined)s.description=String(b.description||"").slice(0,240);if(b.stopOthers!==undefined)s.stopOthers=!!b.stopOthers;saveJson(SOUNDS_FILE,sounds);return send(res,200,{ok:true,sound:publicSound(s)})})}
  if(u.pathname==="/api/sounds/duplicate"&&req.method==="POST"){const user=requireAuth(req,res);if(!user)return;if(!user.canEdit)return send(res,403,{error:"email_required"});return parseBody(req,(err,b)=>{if(err)return send(res,400,{error:"invalid_json"});const src=sounds.find(x=>x.id===String(b.id||"") && (!x.ownerId || x.ownerId===user.id));if(!src)return send(res,404,{error:"sound_not_found"});const copy={...src,id:"copy-"+crypto.randomBytes(5).toString("hex"),name:safeName(src.name+" Copy"),ownerId:user.id};sounds.push(copy);saveJson(SOUNDS_FILE,sounds);return send(res,200,{ok:true,sound:publicSound(copy)})})}
  if(u.pathname==="/api/sounds/upload"&&req.method==="POST"){
    const user=requireAuth(req,res);if(!user)return;if(!user.canEdit)return send(res,403,{error:"email_required"});
    const maxUpload=25*1024*1024;if(Number(req.headers["content-length"]||0)>maxUpload)return send(res,413,{error:"file_too_large"});
    const ct=req.headers["content-type"]||"",bm=ct.match(/boundary=([^;]+)/i);if(!bm)return send(res,400,{error:"multipart_required"});
    return parseMultipart(req,bm[1],async file=>{
      try{
        if(!file||!file.data.length)return send(res,400,{error:"file_required"});
        const ext=path.extname(file.filename).toLowerCase();if(!new Set([".wav",".mp3",".ogg",".m4a"]).has(ext))return send(res,400,{error:"unsupported_format"});
        if(file.data.length>maxUpload)return send(res,413,{error:"file_too_large"});
        const id="upload-"+crypto.randomBytes(5).toString("hex"),fileName=id+ext;
        await saveUploadedAsset(fileName,file.type,file.data);
        const sound={id,name:safeName(path.basename(file.filename,ext)),category:"Uploads",icon:"🎵",volume:.95,hotkey:"",combo:"",pitch:1,speed:1,file:"/audio/"+fileName,ownerId:user.id};
        sounds.push(sound);await saveJson(SOUNDS_FILE,sounds);return send(res,200,{ok:true,sound:publicSound(sound)});
      }catch(err){console.error("Sound upload failed:",err.message);return send(res,500,{error:"upload_failed"});}
    });
  }
  if(u.pathname==="/api/sounds/delete"&&req.method==="POST"){
    const user=requireAuth(req,res);if(!user)return;if(!user.canEdit)return send(res,403,{error:"email_required"});
    return parseBody(req,async(err,b)=>{
      if(err)return send(res,400,{error:"invalid_json"});
      const idx=sounds.findIndex(x=>x.id===String(b.id||"") && x.ownerId===user.id);if(idx<0)return send(res,404,{error:"sound_not_found_or_not_owner"});
      const sound=sounds[idx],fileName=path.basename(String(sound.file||""));
      if(fileName.startsWith("upload-"))await removeUploadedAsset(fileName);
      sounds.splice(idx,1);await saveJson(SOUNDS_FILE,sounds);return send(res,200,{ok:true});
    });
  }
  if(u.pathname==="/api/discord/invite"&&req.method==="POST"){const user=requireAuth(req,res);if(!user)return;return parseBody(req,async(err,b)=>{if(err)return send(res,400,{error:"invalid_json"});const invite=String(b.invite||"").trim();try{const info=await validateInvite(invite);const rec=userRecord(user);if(rec){rec.discordInvite=invite;rec.discordInviteCode=info.code;rec.discordGuildId=info.guildId||"";rec.discordServerName=String(b.serverName||info.name||rec.discordServerName||"").slice(0,80);saveJson(USERS_FILE,users)}return send(res,200,{ok:true,...info})}catch(e){return send(res,400,{error:e.message||"invite_not_found"})}})}
  if(u.pathname==="/api/discord/oauth/start"&&req.method==="GET"){const user=requireAuth(req,res);if(!user)return;if(!discordOAuthConfigured())return send(res,503,{error:"discord_oauth_not_configured"});const sid=(req.headers.cookie||"").match(/(?:^|;\s*)dsb_session=([^;]+)/)?.[1]||"";const state=crypto.randomBytes(24).toString("hex");discordOAuthStates.set(state,{sid,createdAt:Date.now()});const q=new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,response_type:"code",redirect_uri:discordRedirectUri(req),scope:"identify guilds"});res.writeHead(302,{Location:`https://discord.com/oauth2/authorize?${q}`});res.end();return}
  if(u.pathname==="/api/discord/oauth/callback"&&req.method==="GET"){const q=new URL(`http://${req.headers.host||"localhost"}${req.url}`).searchParams;const state=q.get("state")||"",code=q.get("code")||"";const entry=discordOAuthStates.get(state);discordOAuthStates.delete(state);if(!entry||Date.now()-entry.createdAt>10*60*1000)return send(res,400,"Discord OAuth non valido o scaduto.","text/plain; charset=utf-8");const user=sessions.get(entry.sid);if(!user)return send(res,401,"Accedi prima a VYBEX.","text/plain; charset=utf-8");if(!code)return send(res,400,"Autorizzazione Discord annullata.","text/plain; charset=utf-8");try{const body=new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,client_secret:process.env.DISCORD_CLIENT_SECRET,grant_type:"authorization_code",code,redirect_uri:discordRedirectUri(req)}).toString();const token=await discordHttpJson({hostname:"discord.com",path:"/api/oauth2/token",method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Content-Length":Buffer.byteLength(body),"User-Agent":"VYBEX-Local/1.0"}},body);const data=await discordFetchUserAndGuilds(token.access_token);const rec=userRecord(user);if(!rec)throw new Error("account_not_found");rec.discord={id:data.me.id,username:data.me.username,globalName:data.me.global_name||data.me.globalName||"",avatar:data.me.avatar||null,guilds:data.guilds,accessToken:token.access_token,refreshToken:token.refresh_token||rec.discord?.refreshToken||"",expiresAt:Date.now()+Number(token.expires_in||604800)*1000,connectedAt:rec.discord?.connectedAt||new Date().toISOString()};saveJson(USERS_FILE,users);res.writeHead(302,{Location:"/vybex?discord=connected"});res.end();return}catch(e){console.error("Discord OAuth:",e);return send(res,502,`Collegamento Discord non riuscito: ${e.message||"errore"}`,"text/plain; charset=utf-8")}}
  if(u.pathname==="/api/discord/account"&&req.method==="GET"){const user=requireAuth(req,res);if(!user)return;const rec=userRecord(user);return send(res,200,{configured:discordOAuthConfigured(),connected:!!rec?.discord,discord:discordUserView(rec)})}
  if(u.pathname==="/api/discord/sync"&&req.method==="POST"){const user=requireAuth(req,res);if(!user)return;const rec=userRecord(user);if(!rec?.discord?.refreshToken)return send(res,400,{error:"discord_not_connected"});try{let access=rec.discord.accessToken;if(!access||Date.now()>Number(rec.discord.expiresAt||0)-60000){const token=await discordRefreshToken(rec.discord.refreshToken,req);access=token.access_token;rec.discord.accessToken=access;rec.discord.refreshToken=token.refresh_token||rec.discord.refreshToken;rec.discord.expiresAt=Date.now()+Number(token.expires_in||604800)*1000}const data=await discordFetchUserAndGuilds(access);rec.discord.id=data.me.id;rec.discord.username=data.me.username;rec.discord.globalName=data.me.global_name||data.me.globalName||"";rec.discord.avatar=data.me.avatar||null;rec.discord.guilds=data.guilds;saveJson(USERS_FILE,users);return send(res,200,{ok:true,discord:discordUserView(rec)})}catch(e){return send(res,502,{error:e.message||"discord_sync_failed"})}}
  if(u.pathname==="/api/discord/disconnect"&&req.method==="POST"){const user=requireAuth(req,res);if(!user)return;const rec=userRecord(user);if(rec){delete rec.discord;saveJson(USERS_FILE,users)}return send(res,200,{ok:true})}
  if(u.pathname==="/api/discord/config"&&req.method==="GET"){const user=requireAuth(req,res);if(!user)return;const rec=userRecord(user);return send(res,200,{configured:!!rec?.discordWebhook,serverName:rec?.discordServerName||"",invite:rec?.discordInvite||""})}
  if(u.pathname==="/api/discord/config"&&req.method==="POST"){const user=requireAuth(req,res);if(!user)return;return parseBody(req,async(err,b)=>{if(err)return send(res,400,{error:"invalid_json"});const rec=userRecord(user);if(!rec)return send(res,404,{error:"account_not_found"});const hasWebhook=Object.prototype.hasOwnProperty.call(b,"webhookUrl");const hasInvite=Object.prototype.hasOwnProperty.call(b,"invite");const hasServerName=Object.prototype.hasOwnProperty.call(b,"serverName");const url=hasWebhook?String(b.webhookUrl||"").trim():(rec.discordWebhook||"");const invite=hasInvite?String(b.invite||"").trim():(rec.discordInvite||"");let serverName=hasServerName?String(b.serverName||"").trim().slice(0,80):(rec.discordServerName||"");if(url){if(!/^https:\/\/discord(?:app)?\.com\/api\/webhooks\//i.test(url))return send(res,400,{error:"invalid_webhook"});try{await discordGet(url,"webhook")}catch(e){return send(res,400,{error:e.message||"webhook_unreachable"})}}if(invite){try{const info=await validateInvite(invite);if(!serverName)serverName=info.name||"";rec.discordInviteCode=info.code;rec.discordGuildId=info.guildId||""}catch(e){return send(res,400,{error:e.message||"invite_not_found"})}}rec.discordWebhook=url;rec.discordInvite=invite;rec.discordServerName=serverName;saveJson(USERS_FILE,users);return send(res,200,{ok:true,configured:!!url,serverName,invite,guildId:rec.discordGuildId||""})})}
  if(u.pathname==="/api/discord/test"&&req.method==="POST"){const user=requireAuth(req,res);if(!user)return;const rec=userRecord(user);if(!rec?.discordWebhook)return send(res,400,{error:"discord_not_configured"});const payload=Buffer.from(JSON.stringify({content:"✅ VYBEX collegato correttamente a questo webhook Discord."}),"utf8");discordRequest(rec.discordWebhook,payload,{"Content-Type":"application/json","Content-Length":payload.length}).then(()=>send(res,200,{ok:true})).catch(e=>send(res,502,{error:e.message||"discord_failed"}))}
  if(u.pathname==="/api/discord/share"&&req.method==="POST"){const user=requireAuth(req,res);if(!user)return;const rec=userRecord(user);if(!rec?.discordWebhook)return send(res,400,{error:"discord_not_configured"});return parseBody(req,(err,b)=>{if(err)return send(res,400,{error:"invalid_json"});const sound=visibleSounds(user).find(x=>x.id===String(b.id||""));if(!sound)return send(res,404,{error:"sound_not_found"});try{const {body,boundary}=makeDiscordMultipart(sound,String(b.message||"" ).slice(0,1900));discordRequest(rec.discordWebhook,body,{"Content-Type":`multipart/form-data; boundary=${boundary}`,"Content-Length":body.length}).then(()=>send(res,200,{ok:true})).catch(e=>send(res,502,{error:e.message||"discord_failed"}))}catch(e){return send(res,400,{error:e.message||"discord_failed"})}})}
  if(u.pathname==="/api/voice/create"&&req.method==="POST"){return parseBody(req,(err,b)=>{if(err)return send(res,400,{error:"invalid_json"});let room=String(b.room||"").trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,10);if(room.length<4)return send(res,400,{error:"room_code_invalid"});voiceRooms.set(room,{createdAt:Date.now(),messages:[],members:new Map()});return send(res,200,{ok:true,room})})}
  if(u.pathname==="/api/voice/join"&&req.method==="POST"){return parseBody(req,(err,b)=>{if(err)return send(res,400,{error:"invalid_json"});const room=String(b.room||"").trim().toUpperCase();const peer=String(b.peer||"").trim().slice(0,40);const r=voiceRooms.get(room);if(!r)return send(res,404,{error:"room_not_found"});if(!peer)return send(res,400,{error:"peer_required"});r.members.set(peer,Date.now());return send(res,200,{ok:true,room,peers:[...r.members.keys()].filter(x=>x!==peer)})})}
  if(u.pathname==="/api/voice/signal"&&req.method==="POST"){return parseBody(req,(err,b)=>{if(err)return send(res,400,{error:"invalid_json"});const r=voiceRooms.get(String(b.room||"").toUpperCase());if(!r)return send(res,404,{error:"room_not_found"});const to=String(b.to||"").slice(0,40);if(!to||!b.payload)return send(res,400,{error:"signal_invalid"});r.messages.push({id:crypto.randomUUID?crypto.randomUUID():crypto.randomBytes(12).toString("hex"),to,from:String(b.from||"").slice(0,40),payload:b.payload,at:Date.now()});if(r.messages.length>500)r.messages=r.messages.slice(-300);return send(res,200,{ok:true})})}
  if(u.pathname==="/api/voice/poll"&&req.method==="GET"){const room=String(u.searchParams.get("room")||"").toUpperCase(),peer=String(u.searchParams.get("peer")||"").slice(0,40);const r=voiceRooms.get(room);if(!r)return send(res,404,{error:"room_not_found"});r.members.set(peer,Date.now());const messages=r.messages.filter(m=>m.to===peer);r.messages=r.messages.filter(m=>m.to!==peer);for(const [k,t] of r.members)if(Date.now()-t>60000)r.members.delete(k);return send(res,200,{messages,peers:[...r.members.keys()].filter(x=>x!==peer)})}
  if(u.pathname==="/api/voice/leave"&&req.method==="POST"){return parseBody(req,(err,b)=>{const room=String(b?.room||"").toUpperCase(),peer=String(b?.peer||"").slice(0,40),r=voiceRooms.get(room);if(r){r.members.delete(peer);r.messages=r.messages.filter(m=>m.from!==peer&&m.to!==peer);if(!r.members.size&&Date.now()-r.createdAt>30000)voiceRooms.delete(room)}return send(res,200,{ok:true})})}
  if(u.pathname.startsWith("/sounds/")){
    const name=path.basename(u.pathname.slice("/sounds/".length));
    if(!/^[a-z0-9_-]+\.wav$/i.test(name))return send(res,404,"Not found","text/plain; charset=utf-8");
    return serveFile(res,path.join(PUBLIC,"sounds",name));
  }
  if(u.pathname.startsWith("/audio/")){
    const name=path.basename(u.pathname.slice(7));
    try{if(await sendStoredAudio(res,name))return;}catch(err){console.error("Audio database read failed:",err.message);return send(res,503,{error:"audio_temporarily_unavailable"});}
    return serveFile(res,path.join(DATA,name));
  }
  if(u.pathname==="/"||u.pathname==="/index.html")return serveFile(res,path.join(PUBLIC,"index.html"));
  if(u.pathname==="/vybex"||u.pathname==="/vybex/"||u.pathname==="/vybex.html")return serveFile(res,path.join(PUBLIC,"vybex.html"));
  if(u.pathname==="/foglabs"||u.pathname==="/foglabs/"||u.pathname==="/foglabs.html")return serveFile(res,path.join(PUBLIC,"foglabs.html"));
  if(u.pathname==="/foglabs.css")return serveFile(res,path.join(PUBLIC,"foglabs.css"));
  if(u.pathname==="/randomizer"||u.pathname==="/randomizer/"||u.pathname==="/randomizer.html")return serveFile(res,path.join(PUBLIC,"randomizer.html"));
  if(u.pathname==="/randomizer.js")return serveFile(res,path.join(PUBLIC,"randomizer.js"));
  if(u.pathname==="/randomizer.css")return serveFile(res,path.join(PUBLIC,"randomizer.css"));
  if(u.pathname==="/nametag"||u.pathname==="/nametag/"||u.pathname==="/nametag.html")return serveFile(res,path.join(PUBLIC,"nametag.html"));
  if(u.pathname==="/nametag.js")return serveFile(res,path.join(PUBLIC,"nametag.js"));
  if(u.pathname==="/nametag.css")return serveFile(res,path.join(PUBLIC,"nametag.css"));
  if(u.pathname==="/minewiki"||u.pathname==="/minewiki/"||u.pathname==="/minewiki.html")return serveFile(res,path.join(PUBLIC,"minewiki.html"));
  if(u.pathname==="/minewiki.css")return serveFile(res,path.join(PUBLIC,"minewiki.css"));
  if(u.pathname==="/downloads/MineWiki_Cubiomes.exe")return serveFile(res,path.join(PUBLIC,"downloads","MineWiki_Cubiomes.exe"));
  if(u.pathname==="/foglabs-logo.png")return serveFile(res,path.join(PUBLIC,"foglabs-logo.png"));
  if(u.pathname==="/app.js")return serveFile(res,path.join(PUBLIC,"app.js"));
  if(u.pathname==="/styles.css")return serveFile(res,path.join(PUBLIC,"styles.css"));
  if(u.pathname==="/favicon.svg")return serveFile(res,path.join(PUBLIC,"favicon.svg"));
  if(u.pathname==="/vybex-logo.png")return serveFile(res,path.join(PUBLIC,"vybex-logo.png"));
  send(res,404,"Not found","text/plain; charset=utf-8");
});
server.on("error",err=>{
  if(err.code==="EADDRINUSE" && AUTO_SELECT_PORT && ACTIVE_PORT < 3110){
    const busyPort=ACTIVE_PORT;
    ACTIVE_PORT += 1;
    console.warn(`La porta ${busyPort} è già occupata; provo automaticamente la ${ACTIVE_PORT}...`);
    server.listen(ACTIVE_PORT,"0.0.0.0");
    return;
  }
  if(err.code==="EADDRINUSE"){
    console.error(`La porta ${ACTIVE_PORT} è già in uso. Imposta PORT su una porta libera e riavvia VYBEX.`);
  }else console.error(err);
});
function listenServer(){
  server.listen(ACTIVE_PORT,"0.0.0.0",()=>{
    const scheme=process.env.NODE_ENV==="production"?"https":"http";
    const landingUrl=process.env.PUBLIC_BASE_URL?`${process.env.PUBLIC_BASE_URL.replace(/\/$/,"")}/foglabs`:`${scheme}://localhost:${ACTIVE_PORT}/foglabs`;
    console.log(`FogLabs attivo: ${landingUrl}`);
    console.log(`VYBEX: /vybex · Nametag Creator: /nametag · Randomizer: /randomizer · MineWiki: /minewiki`);
    if(process.platform==="win32" && process.env.NO_BROWSER!=="1" && process.env.NODE_ENV!=="production"){
      try { const {spawn}=require("child_process"); const browser=spawn("cmd.exe",["/c","start","",landingUrl],{detached:true,stdio:"ignore",windowsHide:true}); browser.unref(); } catch {}
    }
  });
}
initDatabase().then(listenServer).catch(err=>{console.error("Avvio FogLabs non riuscito:",err.message);process.exit(1)});
