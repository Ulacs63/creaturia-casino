/* ===== Créaturia Casino : version autonome (Firebase) ===== */
(function(){
const CFG=window.FIREBASE_CONFIG;
const $id=i=>document.getElementById(i);
function boot(){const code=$id('maincode').textContent;const s=document.createElement('script');s.textContent=code;document.body.appendChild(s)}
function gate(html){$id('gate').innerHTML=html;$id('gate').style.display='grid'}
if(!CFG||!CFG.apiKey||/COLLE/.test(CFG.apiKey)){gate(`<div class="gbox"><h1>CRÉATURIA<small>CASINO</small></h1><p>Le site n'est pas encore relié à Firebase.<br>Colle ta configuration Firebase en haut du fichier <b>index.html</b>.</p></div>`);return}
firebase.initializeApp(CFG);
const auth=firebase.auth(),fs=firebase.firestore();
let UID=null;
/* ---- base de données (même interface que dans Claude) ---- */
const wrapDoc=path=>({async get(){const s=await fs.doc(path).get();return{exists:s.exists,data:()=>s.data()}},set:v=>fs.doc(path).set(v)});
const wrapQ=q=>({where:(f,o,v)=>wrapQ(q.where(f,o,v)),onSnapshot:(cb,er)=>q.onSnapshot(s=>cb({docs:s.docs.map(d=>({id:d.id,data:()=>d.data()})),docChanges:()=>s.docChanges().map(c=>({type:c.type,doc:{id:c.doc.id,data:()=>c.doc.data()}}))}),er||(()=>{})),orderBy:(f,d)=>wrapQ(q.orderBy(f,d)),limit:n=>wrapQ(q.limit(n)),async get(){const s=await q.get();return{docs:s.docs.map(d=>({id:d.id,data:()=>d.data()}))}}});
const DB={doc:wrapDoc,collection:p=>wrapQ(fs.collection(p))};
/* ---- joueurs ---- */
const USER={id:async()=>UID,async profiles(ids){const o={};await Promise.all(ids.map(async id=>{try{const s=await fs.doc('board/'+id).get();if(s.exists)o[id]={name:s.data().n||''}}catch(e){}}));return o}};
/* ---- salons en direct (présence + messages) ---- */
const PEER=Math.random().toString(36).slice(2,10);
function makeRoom(name,hist){
  const base=fs.collection('rooms').doc(name),subs={},peerCbs=[];let peers=[],myP=null,hb=null,offs=[],known=new Set();const seen={};const me=UID+'_'+PEER;
  const pref=base.collection('peers').doc(me);const SV=firebase.firestore.FieldValue.serverTimestamp;
  const beat=()=>pref.set({by:UID,p:myP,t:Date.now(),st:SV()}).catch(()=>{});
  beat();hb=setInterval(beat,15000);
  const emitPeers=(j,l)=>peerCbs.forEach(cb=>{try{cb({peers,joined:j||[],left:l||[]})}catch(e){}});
  let docs={};
  offs.push(base.collection('peers').onSnapshot(s=>{const now=Date.now();s.docChanges().forEach(c=>{if(c.type==='removed'){delete docs[c.doc.id];delete seen[c.doc.id]}else{docs[c.doc.id]=c.doc.data();seen[c.doc.id]=now}});rebuild()},()=>{}));
  function rebuild(){const now=Date.now();const prev=peers;peers=Object.entries(docs).filter(([id])=>id===me||now-(seen[id]||0)<40000).map(([id,x])=>({peer:id,by:x.by,isMe:x.by===UID,sameTab:id===me,kind:'viewer',presence:x.p||null}));
    const joined=peers.filter(p=>!known.has(p.peer));peers.forEach(p=>known.add(p.peer));const left=prev.filter(p=>!peers.some(q=>q.peer===p.peer));left.forEach(p=>known.delete(p.peer));emitPeers(joined,left)}
  const prune=setInterval(rebuild,10000);
  let ready=!!hist;const got=new Set();
  const q=hist?base.collection('msgs').orderBy('t'):base.collection('msgs').orderBy('st','desc').limit(40);
  offs.push(q.onSnapshot(s=>{if(!ready){s.docs.forEach(d=>got.add(d.id));if(!s.metadata||!s.metadata.fromCache)ready=true;return}s.docChanges().forEach(c=>{if(c.type!=='added'||got.has(c.doc.id))return;got.add(c.doc.id);const x=c.doc.data();
    const msg={peer:x.peer,by:x.by,isMe:x.by===UID,sameTab:x.peer===me,data:x.data};(subs[x.topic]||[]).forEach(cb=>{try{cb(msg)}catch(e){}})})},()=>{}));
  const room={
    presence:async p=>{myP=p;await beat()},
    onPeers:(cb,err)=>{peerCbs.push(cb);setTimeout(()=>cb({peers,joined:peers,left:[]}),0);return()=>{const i=peerCbs.indexOf(cb);if(i>=0)peerCbs.splice(i,1)}},
    on:(topic,cb)=>{(subs[topic]=subs[topic]||[]).push(cb);return()=>{subs[topic]=subs[topic].filter(f=>f!==cb)}},
    emit:(topic,data)=>base.collection('msgs').add({topic,data:JSON.parse(JSON.stringify(data)),peer:me,by:UID,t:Date.now(),st:SV()}),
    join:async n=>makeRoom(name+'-'+n,true),
    leave:async()=>{clearInterval(hb);clearInterval(prune);offs.forEach(f=>f());await pref.delete().catch(()=>{})}};
  window.addEventListener('pagehide',()=>{pref.delete().catch(()=>{})});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)beat()});
  return room}
let MAIN=null;
window.claude={use:async n=>{if(n==='db')return DB;if(n==='user')return USER;if(n==='room')return MAIN||(MAIN=makeRoom('casino'));throw new Error('indisponible')}};
window.FB_LOGOUT=()=>auth.signOut().then(()=>{try{localStorage.removeItem('creaturia_casino')}catch(e){}location.reload()});
/* ---- écran de connexion ---- */
function loginUI(msg){gate(`<div class="gbox"><h1>CRÉATURIA<small>CASINO</small></h1>
  <div class="gseg"><button id="gt1" class="on">Connexion</button><button id="gt2">Créer un compte</button></div>
  <input id="gm" type="email" placeholder="Adresse e-mail" autocomplete="email"><input id="gp" type="password" placeholder="Mot de passe (6 caractères min.)" autocomplete="current-password">
  <input id="gn" maxlength="16" placeholder="Pseudo" style="display:none">
  <label class="grem"><input type="checkbox" id="grem"><span class="gbox2"></span>Se souvenir de moi</label>
  <button class="gbtn" id="ggo">Se connecter</button><button class="gbtn alt" id="ggg">Continuer avec Google</button>
  <p class="gerr" id="ge">${msg||''}</p><a href="#" id="gfp">Mot de passe oublié ?</a>
  <p class="gnote">Crédits 100 % virtuels : aucun argent réel, rien à acheter ni à retirer. Réservé aux 16 ans et plus.</p></div>`);
  const remOn=localStorage.getItem('cc_rem')!=='0';$id('grem').checked=remOn;localStorage.removeItem('cc_mail');
  const persist=async()=>{const on=$id('grem').checked;localStorage.setItem('cc_rem',on?'1':'0');;
    try{await auth.setPersistence(on?firebase.auth.Auth.Persistence.LOCAL:firebase.auth.Auth.Persistence.SESSION)}catch(e){}};
  let mode=1;const sw=m=>{mode=m;$id('gt1').classList.toggle('on',m===1);$id('gt2').classList.toggle('on',m===2);$id('gn').style.display=m===2?'block':'none';$id('ggo').textContent=m===1?'Se connecter':'Créer mon compte'};
  $id('gt1').onclick=()=>sw(1);$id('gt2').onclick=()=>sw(2);
  const err=e=>{const c=(e&&e.code)||'';$id('ge').textContent={'auth/invalid-credential':'E-mail ou mot de passe incorrect.','auth/wrong-password':'Mot de passe incorrect.','auth/user-not-found':'Aucun compte avec cet e-mail.','auth/email-already-in-use':'Un compte existe déjà avec cet e-mail.','auth/weak-password':'Mot de passe trop court (6 caractères minimum).','auth/invalid-email':'Adresse e-mail invalide.','auth/popup-closed-by-user':'Connexion annulée.','auth/too-many-requests':'Trop d\'essais, réessaie dans un moment.'}[c]||'Erreur : '+(e&&e.message||c)};
  $id('ggo').onclick=async()=>{const m=$id('gm').value.trim(),p=$id('gp').value;$id('ge').textContent='';
    try{await persist();if(mode===1)await auth.signInWithEmailAndPassword(m,p);else{const n=$id('gn').value.trim();if(!n){$id('ge').textContent='Choisis un pseudo.';return}localStorage.setItem('cc_newname',n);await auth.createUserWithEmailAndPassword(m,p)}}catch(e){err(e)}};
  $id('ggg').onclick=async()=>{try{await persist();await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())}catch(e){if(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-this-environment')auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider());else err(e)}};
  $id('gfp').onclick=async e=>{e.preventDefault();const m=$id('gm').value.trim();if(!m){$id('ge').textContent='Écris ton e-mail au-dessus.';return}try{await auth.sendPasswordResetEmail(m);$id('ge').textContent='E-mail de réinitialisation envoyé.'}catch(x){err(x)}};
  $id('gp').onkeydown=e=>{if(e.key==='Enter')$id('ggo').click()}}
/* ---- mise à jour automatique : évite d'avoir une vieille version en cache ---- */
const BUILD='__BUILD__';let NEWV=false;
const SAFE=['accueil','jeux','machines','profil','pass','quetes','coffres','boutique','collection','classement','amis','notifs','tournoi',''];
async function goNew(){try{await fetch(location.pathname,{cache:'reload'})}catch(e){}history.replaceState(null,'',location.pathname+'#accueil');location.reload()}
async function checkVer(){if(NEWV)return;try{const r=await fetch('version.txt?'+Date.now(),{cache:'no-store'});if(!r.ok)return;const v=(await r.text()).trim();if(!v||v===BUILD)return;NEWV=true;
  if(SAFE.includes(location.hash.slice(1))||document.hidden)return goNew();
  const d=document.createElement('div');d.id='upbar';d.textContent='🔄 Nouvelle version : le casino se met à jour dès que tu quittes ce jeu';document.body.appendChild(d)}catch(e){}}
window.addEventListener('hashchange',()=>{if(NEWV&&SAFE.includes(location.hash.slice(1)))goNew()});
document.addEventListener('visibilitychange',()=>{if(NEWV&&document.hidden)goNew();else if(!document.hidden)checkVer()});
setTimeout(checkVer,4000);setInterval(checkVer,20000);
let started=false;
gate('<div class="gbox"><h1>CRÉATURIA<small>CASINO</small></h1><p>Connexion…</p></div>');
auth.onAuthStateChanged(u=>{if(!u){if(started)location.reload();else loginUI();return}if(started)return;started=true;UID=u.uid;
  /* une sauvegarde locale par compte */
  try{const own=localStorage.getItem('cc_owner');if(own!==UID){if(own)localStorage.setItem('cc_save_'+own,localStorage.getItem('creaturia_casino')||'');const mine=localStorage.getItem('cc_save_'+UID);if(mine)localStorage.setItem('creaturia_casino',mine);else localStorage.removeItem('creaturia_casino');localStorage.setItem('cc_owner',UID)}
    const nn=localStorage.getItem('cc_newname');if(nn&&!localStorage.getItem('creaturia_casino')){localStorage.setItem('creaturia_casino',JSON.stringify({prof:{name:nn,av:'a_salam',fr:'base',ti:'Apprenti',bn:'ultime'},gift100k:true,gift1m:true,gift1m_b:true,gift5m:true}))}localStorage.removeItem('cc_newname')}catch(e){}
  $id('gate').style.display='none';boot()});
})();
