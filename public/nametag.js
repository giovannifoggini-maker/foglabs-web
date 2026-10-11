(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = 'foglabs_nametag_creator_v1';
  const styleNames = ['Gaming','Pro','Funny','Dark','Mystery','Cool','Cute','Aggressive','Futuristic','Cyber','Fantasy','Medieval','Retro','Minimal','Luxury','Meme','Horror','Sci-Fi'];
  const structures = ['One word','Two words','Word + number','Letters + numbers','Abbreviation','Initials','Syllables','Invented word','Random mix'];
  const languages = ['Italian','English','Latin','Japanese-inspired','French','German','Spanish'];
  const styles = {
    Gaming:['Pixel','Turbo','Clutch','Frag','Quest','Combo','Rush','XP','Apex','Raid'], Pro:['Prime','Elite','Core','Peak','Vanguard','Alpha','Vector','Ace','Nexus'],
    Funny:['Bonk','Potato','Waffle','Bacon','Goofy','Noodle','Pickle','Toast','Muffin'], Dark:['Void','Night','Shadow','Grim','Obsidian','Dread','Black','Raven'],
    Mystery:['Cipher','Enigma','Veil','Unknown','Phantom','Riddle','Echo','Secret'], Cool:['Nova','Frost','Blaze','Drift','Flux','Aero','Vortex','Zen'],
    Cute:['Mochi','Bunny','Berry','Panda','Peach','Cloud','Mimi','Cookie'], Aggressive:['Fury','Rage','Riot','Inferno','Rampage','Savage','Reaper','Titan'],
    Futuristic:['Quantum','Neon','Nova','Vector','Pulse','Orbit','Nexus','Axiom'], Cyber:['Cyber','Neon','Byte','Glitch','Nexus','Pixel','Quantum','Code'],
    Fantasy:['Arcane','Mystic','Dragon','Rune','Elder','Mythic','Astral','Phoenix'], Medieval:['Knight','Raven','Crown','Sword','King','Queen','Castle','Valor'],
    Retro:['Pixel','Turbo','Retro','Vapor','Arcade','Synth','Classic','Neon'], Minimal:['Zen','Void','Mono','Pure','Core','One','Solo','Calm'],
    Luxury:['Royal','Velvet','Gold','Crown','Elite','Luxe','Prime','Regal'], Meme:['Bonk','Sus','Yeet','Bruh','Potato','NPC','Goober','Oof'],
    Horror:['Grim','Haunt','Crypt','Phantom','Dread','Cursed','Wraith','Fright'], 'Sci-Fi':['Nova','Quantum','Orbit','Cosmo','Stellar','Ion','Vector','Nebula']
  };
  const wordBanks = {
    Italian:['Lupo','Ombra','Stella','Fuoco','Tuono','Notte','Luce','Drago','Vento','Furia','Falco','Gelo','Luna','Roccia','Raggio','Tempesta','Corvo','Volpe','Re','Regina','Spettro','Fiamma'],
    English:['Shadow','Nova','Pixel','Blaze','Frost','Storm','Raven','Ghost','Neon','Void','Lunar','Solar','Cyber','Turbo','Hyper','Mystic','Phantom','Cosmic','Echo','Venom','Drift','Flux','Glitch','Zero','Omega','Apex','Nexus','Pulse','Fury','Spark','Night','Dawn','Titan','Orbit','Comet','Zen','Cobra','Wolf','Dragon','Prime','Strike','Force','Quest','Realm','Blade','Shift','Code','Dash','Edge','Rider','Mind','Peak'],
    Latin:['Rex','Nox','Lux','Ignis','Aquila','Lupus','Umbra','Vita','Fatum','Astra','Caelum','Draco','Gladius','Mors','Sol','Luna','Vox','Vindex'],
    'Japanese-inspired':['Kage','Hikari','Yoru','Kaze','Ryu','Sora','Akuma','Hoshi','Kitsune','Raijin','Tsuki','Mizu','Tora','Kumo','Yami','Ren','Kira','Shiro'],
    French:['Ombre','Lune','Feu','Aube','Loup','Eclair','Nuit','Etoile','Roi','Reve','Givre','Flamme','Faucon'],
    German:['Nacht','Wolf','Feuer','Sturm','Schatten','Blitz','Eis','Kraft','Falken','Dunkel','Ritter','Flamme'],
    Spanish:['Lobo','Sombra','Fuego','Noche','Rayo','Luna','Furia','Viento','Dragon','Rey','Hielo','Tormenta']
  };
  const englishB = ['X','Core','Byte','Rush','Wave','Fire','Fox','Knight','Wolf','Dragon','Prime','Zone','Strike','Force','Quest','Realm','Blade','Storm','Spark','Shift','Link','Code','Dash','Edge','Rider','Mind','Lab','Arc','Peak','Mode'];
  const syllables = ['ka','zen','ra','vox','mi','no','shi','ta','neo','lu','va','rex','ki','ro','sa','yu'];
  const inventedParts = ['zy','x','v','ra','ki','no','ex','ly','za','or','ix','ae','xo','vi','ka','en'];
  const defaults = {
    preset:'Custom', style:'Random', structure:'Random', language:'Random', nameType:'Username', numberMode:'None', symbolMode:'None', caseMode:'Natural',
    minLen:4,maxLen:16,quantity:10,include:'',exclude:'',prefix:'',suffix:'',avoidCommon:true,pronounceable:true,
    creativity:70,originality:70,memorability:70,simplicity:60,rarity:60,vibe:70,seriousness:50,power:60,mystery:50,esports:60
  };
  let state = {settings:{...defaults}, results:[], history:[], favorites:[], activeSaved:'favorites'};

  function safeLoad() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        state.settings = {...defaults, ...(parsed.settings || {})};
        state.history = Array.isArray(parsed.history) ? parsed.history.filter(x => typeof x === 'string').slice(0,500) : [];
        state.favorites = Array.isArray(parsed.favorites) ? parsed.favorites.filter(x => typeof x === 'string').slice(0,500) : [];
      }
    } catch { /* Local storage may be disabled: the app still works for this tab. */ }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({settings:readSettings(),history:state.history.slice(-500),favorites:state.favorites.slice(-500)})); }
    catch { setStatus('Le modifiche funzionano, ma il browser non permette di salvarle in locale.'); }
  }
  function readSettings() {
    const cfg = {};
    for (const [key, value] of Object.entries(defaults)) {
      const el = $(key);
      if (!el) continue;
      cfg[key] = el.type === 'checkbox' ? el.checked : (el.type === 'number' || el.type === 'range' ? Number(el.value) : el.value);
    }
    return cfg;
  }
  function applySettings(settings) {
    Object.keys(defaults).forEach(key => {
      const el = $(key);
      if (!el || !(key in settings)) return;
      if (el.type === 'checkbox') el.checked = Boolean(settings[key]); else el.value = String(settings[key]);
    });
    updateSliderOutputs();
  }
  function saveSettingsOnly() { state.settings = readSettings(); save(); }
  function updateSliderOutputs() {
    document.querySelectorAll('.nt-slider input[type="range"]').forEach(el => { const out = $(el.id+'Value'); if (out) out.value = el.value; });
  }
  function setStatus(msg, isError=false) { const el=$('status'); el.textContent=msg; el.classList.toggle('is-error',isError); }
  function randomInt(max) { return Math.floor(Math.random()*max); }
  function pick(arr) { return arr[randomInt(arr.length)]; }
  function maybe(pct) { return Math.random()*100 < pct; }
  function pickWord(cfg) {
    let lang = cfg.language;
    if (lang === 'Random' || lang === 'Mixed') lang = pick(languages);
    let base = (wordBanks[lang] || wordBanks.English).slice();
    if (cfg.style !== 'Random' && styles[cfg.style] && maybe(65)) base = styles[cfg.style].slice();
    if (cfg.mystery >= 75) base.push('Cipher','Veil','Unknown','Echo','Null','Hidden');
    if (cfg.power >= 75) base.push('Titan','Apex','Prime','Rex','Force','Fury');
    if (cfg.vibe >= 75) base.push('Nova','Pulse','Neon','Blaze','Flux','Spark');
    if (cfg.seriousness >= 75) base.push('Vector','Vanguard','Prime','Axiom','Core','Valor');
    if (cfg.seriousness <= 25) base.push('Bonk','Noodle','Goober','Muffin','Potato');
    if (cfg.rarity >= 75) base.push('Vindex','Axiom','Caelum','Flux','Eclipse','Onyx','Nyx','Kryo');
    if (cfg.memorability >= 75) base = base.filter(word => word.length <= 7).concat(base.filter(word => word.length <= 7));
    return pick(base);
  }
  function randomLetters(count) { return Array.from({length:count},()=>String.fromCharCode(65+randomInt(26))).join(''); }
  function randomDigits(count) { return Array.from({length:count},()=>String(randomInt(10))).join(''); }
  function applyCase(name, mode) {
    if (mode === 'lowercase') return name.toLowerCase();
    if (mode === 'UPPERCASE') return name.toUpperCase();
    if (mode === 'Mixed case') return Array.from(name).map((c,i)=>/[a-z]/i.test(c) ? (i%2===0?c.toUpperCase():c.toLowerCase()) : c).join('');
    return name;
  }
  function makeBase(cfg) {
    let structure = cfg.structure;
    if (structure === 'Random') {
      let pool = ['One word','Two words','Word + number','Letters + numbers','Abbreviation','Initials','Syllables','Invented word'];
      if (cfg.creativity >= 70) pool = pool.concat('Invented word','Syllables');
      if (cfg.simplicity >= 80) pool = pool.concat('One word','One word');
      structure = pick(pool);
    }
    if (structure === 'Random mix') structure = pick(['One word','Two words','Word + number','Letters + numbers','Abbreviation','Initials','Syllables','Invented word']);
    const a = pickWord(cfg);
    const b = (['English','Random','Mixed'].includes(cfg.language) && maybe(70)) ? pick(englishB) : pickWord(cfg);
    let name = '';
    switch (structure) {
      case 'One word': name = a; break;
      case 'Two words': name = `${a}${b}`; break;
      case 'Word + number': name = `${a}${randomInt(99)+1}`; break;
      case 'Letters + numbers': name = randomLetters(3)+randomDigits(3); break;
      case 'Abbreviation': name = a.replace(/[^A-Za-z]/g,'').padEnd(3,'X').slice(0,3).toUpperCase(); break;
      case 'Initials': name = (a[0]||'X').toUpperCase()+(b[0]||'X').toUpperCase(); break;
      case 'Syllables': { const count = Math.min(5,2+Math.floor(cfg.creativity/50)+(cfg.memorability<30?1:0)); for(let i=0;i<count;i++) name+=pick(syllables); break; }
      case 'Invented word': { const count = cfg.simplicity>=70?2:(cfg.creativity>=70?4:3); for(let i=0;i<count;i++) name+=pick(inventedParts); break; }
      default: name = maybe(50) ? `${a}${b}` : a;
    }
    switch (cfg.nameType) {
      case 'Clan tag': name = name.replace(/[^A-Za-z0-9]/g,'').slice(0,5).toUpperCase(); break;
      case 'Nickname': name = name.slice(0,10); break;
      case 'Gamertag': if (cfg.originality>=65 || cfg.esports>=75) name += pick(['X','TV','GG','HD','OP']); break;
      case 'Streamer name': name += pick(['Live','TV','GG','Plays']); break;
      case 'YouTube name': name += pick(['YT','Gaming','TV']); break;
      case 'Social name': if (cfg.vibe>=50) name += pick(['HQ','Hub','Zone']); break;
      case 'Team name': name += pick(['Crew','Squad','Team','Force']); break;
      case 'Character name': name += pick(['','on','is','a','en']); break;
    }
    if (cfg.esports >= 85 && cfg.nameType !== 'Gamertag' && maybe(cfg.esports/2)) name = pick(['x','v','gg'])+name;
    if (cfg.memorability >= 80 && name.length>11) name = name.slice(0,11);
    if (cfg.rarity >= 85 && maybe(55)) name = pick(['Nyx','Kryo','Vex','Zyro','Xeno','Nox'])+name;
    if (cfg.seriousness <= 20 && cfg.nameType !== 'Team name' && maybe(25)) name = pick(['Lil','Its','Hey'])+name;
    return name;
  }
  function addNumber(name, mode) {
    switch (mode) {
      case 'Random': return name+(randomInt(9999)+1);
      case '2 digits': return name+(randomInt(90)+10);
      case '3 digits': return name+(randomInt(900)+100);
      case '4 digits': return name+(randomInt(9000)+1000);
      case 'Year': return name+(randomInt(31)+2000);
      default: return name;
    }
  }
  function createName(cfg, used) {
    const min=Math.min(40,Math.max(2,Number(cfg.minLen)||2));
    const max=Math.min(40,Math.max(2,Number(cfg.maxLen)||2));
    const low=Math.min(min,max), high=Math.max(min,max);
    const exclude=String(cfg.exclude||'').trim().toLowerCase();
    for(let tries=0;tries<400;tries++) {
      let name=makeBase(cfg);
      if(cfg.include) name=String(cfg.include)+name;
      if(cfg.prefix) name=String(cfg.prefix)+name;
      if(cfg.suffix) name+=String(cfg.suffix);
      name=addNumber(name,cfg.numberMode);
      if(cfg.symbolMode!=='None' && name.length>1) {
        const sym=cfg.symbolMode==='Underscore'?'_':cfg.symbolMode==='Dot'?'.':cfg.symbolMode==='Hyphen'?'-':pick(['!','_','-','x']);
        const pos=Math.max(1,Math.min(name.length-1,Math.floor(name.length/2)));
        name=name.slice(0,pos)+sym+name.slice(pos);
      }
      name=applyCase(name,cfg.caseMode);
      if(exclude && name.toLowerCase().includes(exclude)) continue;
      if(cfg.avoidCommon && ['Shadow','Dark','Wolf','Gaming','Pro'].includes(name)) continue;
      if(cfg.pronounceable) { const letters=name.replace(/[^A-Za-z]/g,'').toLowerCase(); if(letters && /[^aeiouy]{4,}/.test(letters)) continue; }
      if(used.has(name)) continue;
      if(name.length<low || name.length>high) continue;
      // The originality / rarity sliders increase the preference for unseen, distinctive forms.
      if ((cfg.originality >= 80 || cfg.rarity >= 80) && used.has(name.toLowerCase())) continue;
      return name;
    }
    let fallback=makeBase({...cfg,structure:'One word'});
    if(cfg.include) fallback=String(cfg.include)+fallback;
    if(cfg.prefix) fallback=String(cfg.prefix)+fallback;
    if(cfg.suffix) fallback+=String(cfg.suffix);
    fallback=applyCase(fallback,cfg.caseMode);
    if(fallback.length>high && high>=2) fallback=fallback.slice(0,high);
    if(fallback.length<low) fallback=fallback.padEnd(low,'X');
    if(used.has(fallback)) fallback=fallback.slice(0,Math.max(1,high-3))+(randomInt(999)+1);
    return fallback.slice(0,high);
  }
  function renderResults() {
    const root=$('results'); root.replaceChildren();
    $('resultCount').textContent=`${state.results.length} ${state.results.length===1?'nome':'nomi'}`;
    if (!state.results.length) {
      const empty=document.createElement('div'); empty.className='nt-empty';
      const icon=document.createElement('span'); icon.textContent='✧';
      const strong=document.createElement('strong'); strong.textContent='Qui nascono i nomi.';
      const p=document.createElement('p'); p.textContent='Premi “Genera nomi” per iniziare.';
      empty.append(icon,strong,p); root.append(empty); return;
    }
    state.results.forEach((name,index)=> {
      const card=document.createElement('article'); card.className='nt-name-card';
      const number=document.createElement('span'); number.className='nt-name-index'; number.textContent=String(index+1).padStart(2,'0');
      const value=document.createElement('div'); value.className='nt-name-value'; value.textContent=name;
      const meta=document.createElement('span'); meta.className='nt-name-meta'; meta.textContent=state.favorites.includes(name)?'NEI PREFERITI':'GENERATO LOCALMENTE'; value.append(meta);
      const actions=document.createElement('div'); actions.className='nt-mini-actions';
      const copy=makeMiniButton('▣','Copia nome',()=>copyText(name,'Nome copiato negli appunti.')); 
      const favorite=makeMiniButton(state.favorites.includes(name)?'♥':'♡',state.favorites.includes(name)?'Rimuovi dai preferiti':'Aggiungi ai preferiti',()=>toggleFavorite(name));
      favorite.classList.toggle('is-favorite',state.favorites.includes(name));
      const one=makeMiniButton('↻','Rigenera questo nome',()=>{const used=new Set(state.results.filter((_,i)=>i!==index));const replacement=createName(readSettings(),used);state.results[index]=replacement;state.history.push(replacement);state.history=state.history.slice(-500);save();renderResults();renderSaved();setStatus('Nome rigenerato.');});
      actions.append(copy,favorite,one); card.append(number,value,actions); root.append(card);
    });
  }
  function makeMiniButton(text,title,action) { const button=document.createElement('button'); button.type='button';button.className='nt-mini-button';button.textContent=text;button.title=title;button.setAttribute('aria-label',title);button.addEventListener('click',action);return button; }
  function renderSaved() {
    $('favoritesCount').textContent=state.favorites.length;
    $('historyCount').textContent=state.history.length;
    const panel=$('savedPanel'); panel.replaceChildren();
    const items=state.activeSaved==='favorites' ? [...state.favorites].reverse() : [...state.history].reverse();
    $('favoritesTab').classList.toggle('is-active',state.activeSaved==='favorites');
    $('historyTab').classList.toggle('is-active',state.activeSaved==='history');
    $('favoritesTab').setAttribute('aria-selected',String(state.activeSaved==='favorites'));
    $('historyTab').setAttribute('aria-selected',String(state.activeSaved==='history'));
    $('savedPanel').setAttribute('aria-labelledby',state.activeSaved==='favorites'?'favoritesTab':'historyTab');
    if(!items.length) { const empty=document.createElement('div');empty.className='nt-saved-empty';empty.textContent=state.activeSaved==='favorites'?'Non hai ancora salvato preferiti.':'La cronologia apparirà dopo la prima generazione.';panel.append(empty);return; }
    const shown=items.slice(0,70);
    shown.forEach((name)=>{
      const item=document.createElement('div');item.className='nt-saved-item';
      const text=document.createElement('strong');text.textContent=name;
      const copy=makeMiniButton('▣','Copia',()=>copyText(name,'Copiato.'));
      item.append(text,copy);
      if(state.activeSaved==='favorites') item.append(makeMiniButton('×','Rimuovi dai preferiti',()=>toggleFavorite(name)));
      panel.append(item);
    });
    if(items.length>shown.length){const more=document.createElement('div');more.className='nt-saved-empty';more.textContent=`Visualizzati ${shown.length} di ${items.length}.`;panel.append(more);}
  }
  async function copyText(text,success='Copiato!') {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else { const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.append(ta);ta.select();const ok=document.execCommand('copy');ta.remove();if(!ok)throw new Error('clipboard'); }
      setStatus(success);
    } catch { setStatus('Il browser non ha permesso la copia automatica: seleziona e copia il testo.',true); }
  }
  function toggleFavorite(name) {
    const idx=state.favorites.indexOf(name);
    if(idx>=0){state.favorites.splice(idx,1);setStatus('Rimosso dai preferiti.');}
    else {state.favorites.push(name);state.favorites=state.favorites.slice(-500);setStatus('Aggiunto ai preferiti.');}
    save();renderResults();renderSaved();
  }
  function generate(countOverride=0, append=false) {
    try {
      let cfg=readSettings();
      cfg.minLen=Math.max(2,Math.min(40,Number(cfg.minLen)||2));cfg.maxLen=Math.max(2,Math.min(40,Number(cfg.maxLen)||2));
      cfg.quantity=Math.max(1,Math.min(100,Number(cfg.quantity)||1));
      if(cfg.minLen>cfg.maxLen){[cfg.minLen,cfg.maxLen]=[cfg.maxLen,cfg.minLen];$('minLen').value=cfg.minLen;$('maxLen').value=cfg.maxLen;}
      const count=countOverride || cfg.quantity;
      const used=new Set(append?state.results:[]);
      if(!append) state.results=[];
      for(let i=0;i<count;i++) {
        const name=createName(cfg,used);state.results.push(name);used.add(name);state.history.push(name);
      }
      state.results=state.results.slice(-100);state.history=state.history.slice(-500);save();renderResults();renderSaved();setStatus(`Generati ${count} ${count===1?'nome':'nomi'}. Scegline uno da copiare o salvare.`);
    } catch(err) { console.error(err);setStatus('Non è stato possibile generare i nomi. Controlla i parametri e riprova.',true); }
  }
  function randomizeParams() {
    $('preset').value='Custom';$('style').value=pick(styleNames);$('structure').value=pick(structures);$('language').value=pick(['Random',...languages]);$('nameType').selectedIndex=randomInt($('nameType').options.length);$('numberMode').selectedIndex=randomInt($('numberMode').options.length);$('symbolMode').selectedIndex=randomInt($('symbolMode').options.length);$('caseMode').selectedIndex=randomInt($('caseMode').options.length);
    const min=randomInt(6)+3;$('minLen').value=min;$('maxLen').value=Math.min(40,min+randomInt(18)+3);$('quantity').value=randomInt(16)+5;
    ['creativity','originality','memorability','simplicity','rarity','vibe','seriousness','power','mystery','esports'].forEach(id=>$(id).value= id==='seriousness'?randomInt(81)+20:randomInt(61)+40);
    updateSliderOutputs();saveSettingsOnly();setStatus('Parametri randomizzati. Ora puoi generare i nomi.');
  }
  function applyPreset(preset) {
    const set=(key,value)=>$(key).value=String(value);
    switch(preset){
      case 'Sweaty':set('style','Aggressive');set('structure','One word');set('numberMode','None');set('esports',95);set('power',90);break;
      case 'Pro':set('style','Pro');set('structure','Two words');set('numberMode','None');set('esports',90);set('simplicity',75);break;
      case 'Dark':set('style','Dark');set('structure','One word');set('mystery',90);break;
      case 'Cyber':set('style','Cyber');set('symbolMode','Underscore');set('vibe',90);set('originality',85);break;
      case 'Clean':set('style','Minimal');set('structure','One word');set('symbolMode','None');set('numberMode','None');set('simplicity',95);break;
      case 'Funny':set('style','Funny');set('structure','Two words');set('seriousness',15);break;
      case 'Fantasy':set('style','Fantasy');set('structure','Invented word');set('mystery',75);break;
      case 'Minimal':set('style','Minimal');set('structure','One word');set('maxLen',10);set('simplicity',95);break;
      case 'Random':randomizeParams();return;
    }
    updateSliderOutputs();saveSettingsOnly();setStatus(`Preset “${preset}” applicato.`);
  }
  function resetConfig() { applySettings({...defaults});saveSettingsOnly();setStatus('Parametri ripristinati.'); }
  function init() {
    safeLoad(); applySettings(state.settings); updateSliderOutputs(); renderResults(); renderSaved();
    document.querySelectorAll('.nt-slider input[type="range"]').forEach(el=>el.addEventListener('input',()=>{updateSliderOutputs();saveSettingsOnly();}));
    Object.keys(defaults).forEach(key=>{const el=$(key);if(el && !['preset'].includes(key))el.addEventListener('change',saveSettingsOnly);});
    $('preset').addEventListener('change',()=>applyPreset($('preset').value));
    $('generateBtn').addEventListener('click',()=>generate());
    $('rerollBtn').addEventListener('click',()=>generate(1,true));
    $('randomizeBtn').addEventListener('click',randomizeParams);
    $('resetConfigBtn').addEventListener('click',resetConfig);
    $('resetAllBtn').addEventListener('click',()=>{state.results=[];renderResults();setStatus('Risultati azzerati. Cronologia e preferiti sono conservati.');});
    $('copyAllBtn').addEventListener('click',()=>state.results.length?copyText(state.results.join('\n'),'Lista copiata negli appunti.'):setStatus('Genera prima qualche nome.',true));
    $('favoritesTab').addEventListener('click',()=>{state.activeSaved='favorites';renderSaved();});
    $('historyTab').addEventListener('click',()=>{state.activeSaved='history';renderSaved();});
    $('quantity').addEventListener('change',()=>{$('quantity').value=Math.max(1,Math.min(100,Number($('quantity').value)||1));saveSettingsOnly();});
    ['minLen','maxLen'].forEach(id=>$(id).addEventListener('change',()=>{$(id).value=Math.max(2,Math.min(40,Number($(id).value)||2));saveSettingsOnly();}));
  }
  document.addEventListener('DOMContentLoaded',init);
})();
