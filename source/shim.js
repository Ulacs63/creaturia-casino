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
const wrapQ=q=>({orderBy:(f,d)=>wrapQ(q.orderBy(f,d)),limit:n=>wrapQ(q.limit(n)),async get(){const s=await q.get();return{docs:s.docs.map(d=>({id:d.id,data:()=>d.data()}))}}});
const DB={doc:wrapDoc,collection:p=>wrapQ(fs.collection(p))};
/* ---- joueurs ---- */
const USER={id:async()=>UID,async profiles(ids){const o={};await Promise.all(ids.map(async id=>{try{const s=await fs.doc('board/'+id).get();if(s.exists)o[id]={name:s.data().n||''}}catch(e){}}));return o}};
/* ---- salons en direct (présence + messages) ---- */
const PEER=Math.random().toString(36).slice(2,10);
function makeRoom(name){
  const base=fs.collection('rooms').doc(name),T0=Date.now()-2000,subs={},peerCbs=[];let peers=[],myP=null,hb=null,offs=[],known=new Set();
  const pref=base.collection('peers').doc(UID+'_'+PEER);
  const beat=()=>pref.set({by:UID,p:myP,t:Date.now()}).catch(()=>{});
  beat();hb=setInterval(beat,15000);
  offs.push(base.collection('peers').where('t','>',Date.now()-45000).onSnapshot(s=>{const now=Date.now();
    peers=s.docs.map(d=>{const x=d.data();const id=d.id.split('_')[1];return{peer:d.id,by:x.by,isMe:x.by===UID,sameTab:d.id===UID+'_'+PEER,kind:'viewer',presence:x.p||null,t:x.t}}).filter(p=>now-p.t<45000);
    const joined=peers.filter(p=>!known.has(p.peer));peers.forEach(p=>known.add(p.peer));peerCbs.forEach(cb=>{try{cb({peers,joined})}catch(e){}})},()=>{}));
  const prune=setInterval(()=>{const now=Date.now();const before=peers.length;peers=peers.filter(p=>now-p.t<45000||p.sameTab);if(peers.length!==before)peerCbs.forEach(cb=>{try{cb({peers,joined:[]})}catch(e){}})},10000);
  offs.push(base.collection('msgs').where('t','>',T0).onSnapshot(s=>{s.docChanges().forEach(c=>{if(c.type!=='added')return;const x=c.doc.data();
    const msg={peer:x.peer,by:x.by,isMe:x.by===UID,sameTab:x.peer===UID+'_'+PEER,data:x.data};(subs[x.topic]||[]).forEach(cb=>{try{cb(msg)}catch(e){}})})},()=>{}));
  const room={
    presence:async p=>{myP=p;await beat()},
    onPeers:(cb,err)=>{peerCbs.push(cb);setTimeout(()=>cb({peers,joined:peers}),0);return()=>{const i=peerCbs.indexOf(cb);if(i>=0)peerCbs.splice(i,1)}},
    on:(topic,cb)=>{(subs[topic]=subs[topic]||[]).push(cb);return()=>{subs[topic]=subs[topic].filter(f=>f!==cb)}},
    emit:(topic,data)=>base.collection('msgs').add({topic,data:JSON.parse(JSON.stringify(data)),peer:UID+'_'+PEER,by:UID,t:Date.now()}),
    join:async n=>makeRoom(name+'__'+n),
    leave:async()=>{clearInterval(hb);clearInterval(prune);offs.forEach(f=>f());await pref.delete().catch(()=>{})}};
  window.addEventListener('pagehide',()=>{pref.delete().catch(()=>{})});
  return room}
let MAIN=null;
window.claude={use:async n=>{if(n==='db')return DB;if(n==='user')return USER;if(n==='room')return MAIN||(MAIN=makeRoom('casino'));throw new Error('indisponible')}};
window.FB_LOGOUT=()=>auth.signOut().then(()=>{try{localStorage.removeItem('creaturia_casino')}catch(e){}location.reload()});
/* ---- écran de connexion ---- */
function loginUI(msg){gate(`<div class="gbox"><h1>CRÉATURIA<small>CASINO</small></h1>
  <div class="gseg"><button id="gt1" class="on">Connexion</button><button id="gt2">Créer un compte</button></div>
  <input id="gm" type="email" placeholder="Adresse e-mail" autocomplete="email"><input id="gp" type="password" placeholder="Mot de passe (6 caractères min.)" autocomplete="current-password">
  <input id="gn" maxlength="16" placeholder="Pseudo" style="display:none">
  <button class="gbtn" id="ggo">Se connecter</button><button class="gbtn alt" id="ggg">Continuer avec Google</button>
  <p class="gerr" id="ge">${msg||''}</p><a href="#" id="gfp">Mot de passe oublié ?</a>
  <p class="gnote">Crédits 100 % virtuels : aucun argent réel, rien à acheter ni à retirer. Réservé aux 16 ans et plus.</p></div>`);
  let mode=1;const sw=m=>{mode=m;$id('gt1').classList.toggle('on',m===1);$id('gt2').classList.toggle('on',m===2);$id('gn').style.display=m===2?'block':'none';$id('ggo').textContent=m===1?'Se connecter':'Créer mon compte'};
  $id('gt1').onclick=()=>sw(1);$id('gt2').onclick=()=>sw(2);
  const err=e=>{const c=(e&&e.code)||'';$id('ge').textContent={'auth/invalid-credential':'E-mail ou mot de passe incorrect.','auth/wrong-password':'Mot de passe incorrect.','auth/user-not-found':'Aucun compte avec cet e-mail.','auth/email-already-in-use':'Un compte existe déjà avec cet e-mail.','auth/weak-password':'Mot de passe trop court (6 caractères minimum).','auth/invalid-email':'Adresse e-mail invalide.','auth/popup-closed-by-user':'Connexion annulée.','auth/too-many-requests':'Trop d\'essais, réessaie dans un moment.'}[c]||'Erreur : '+(e&&e.message||c)};
  $id('ggo').onclick=async()=>{const m=$id('gm').value.trim(),p=$id('gp').value;$id('ge').textContent='';
    try{if(mode===1)await auth.signInWithEmailAndPassword(m,p);else{const n=$id('gn').value.trim();if(!n){$id('ge').textContent='Choisis un pseudo.';return}localStorage.setItem('cc_newname',n);await auth.createUserWithEmailAndPassword(m,p)}}catch(e){err(e)}};
  $id('ggg').onclick=async()=>{try{await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())}catch(e){if(e.code==='auth/popup-blocked'||e.code==='auth/operation-not-supported-in-this-environment')auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider());else err(e)}};
  $id('gfp').onclick=async e=>{e.preventDefault();const m=$id('gm').value.trim();if(!m){$id('ge').textContent='Écris ton e-mail au-dessus.';return}try{await auth.sendPasswordResetEmail(m);$id('ge').textContent='E-mail de réinitialisation envoyé.'}catch(x){err(x)}};
  $id('gp').onkeydown=e=>{if(e.key==='Enter')$id('ggo').click()}}
let started=false;
gate('<div class="gbox"><h1>CRÉATURIA<small>CASINO</small></h1><p>Connexion…</p></div>');
auth.onAuthStateChanged(u=>{if(!u){if(started)location.reload();else loginUI();return}if(started)return;started=true;UID=u.uid;
  /* une sauvegarde locale par compte */
  try{const own=localStorage.getItem('cc_owner');if(own!==UID){if(own)localStorage.setItem('cc_save_'+own,localStorage.getItem('creaturia_casino')||'');const mine=localStorage.getItem('cc_save_'+UID);if(mine)localStorage.setItem('creaturia_casino',mine);else localStorage.removeItem('creaturia_casino');localStorage.setItem('cc_owner',UID)}
    const nn=localStorage.getItem('cc_newname');if(nn&&!localStorage.getItem('creaturia_casino')){localStorage.setItem('creaturia_casino',JSON.stringify({prof:{name:nn,av:'a_salam',fr:'base',ti:'Apprenti',bn:'ultime'},gift100k:true,gift1m:true,gift1m_b:true,gift5m:true}))}localStorage.removeItem('cc_newname')}catch(e){}
  $id('gate').style.display='none';boot()});
})();
