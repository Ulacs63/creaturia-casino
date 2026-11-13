#!/usr/bin/env python3
"""Batterie de tests de Créaturia Casino, à lancer avant chaque mise en ligne :
    python3 tests/run.py
Construit une version de test (NOMIN=1), simule Firebase en local, puis vérifie :
  1. chaque écran et chaque jeu s'ouvre et se joue sans erreur (téléphone + ordinateur) ;
  2. la synchro des sauvegardes entre deux appareils (veille, réouverture, retour au premier plan) ;
  3. le penalty (bouton Jouer, encaissement, arrêt, sortie en pleine partie) ;
  4. les maths : RTP 98 % de chaque jeu réglable, plafonds des reliques, récompenses des quêtes.
Reconstruit la version minifiée à la fin. Code de sortie 0 = tout est bon."""
import json, os, subprocess, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
U = 'file://' + os.path.join(ROOT, 'index.html')
MOCK = open(os.path.join(ROOT, 'tests', 'fbmock3.js')).read()
MOCK4 = open(os.path.join(ROOT, 'tests', 'fbmock4.js')).read()
FAIL = []

def check(ok, label, detail=''):
    print(('  OK   ' if ok else '  ÉCHEC') + ' ' + label + (f' ({detail})' if detail else ''))
    if not ok: FAIL.append(label)

def build(nomin):
    env = dict(os.environ)
    if nomin: env['NOMIN'] = '1'
    else: env.pop('NOMIN', None)
    subprocess.run([sys.executable, os.path.join(ROOT, 'source', 'build.py')], cwd=ROOT, env=env, check=True, stdout=subprocess.DEVNULL)

def ctx(b, w, h):
    c = b.new_context(viewport={'width': w, 'height': h})
    c.route("https://www.gstatic.com/**", lambda r: r.fulfill(body=MOCK if 'app-compat' in r.request.url else '', content_type='application/javascript'))
    return c

def signup(pg, mail, name):
    pg.goto(U); pg.wait_for_timeout(600)
    pg.click('#gt2'); pg.fill('#gm', mail); pg.fill('#gp', 'secret12'); pg.fill('#gn', name); pg.click('#ggo'); pg.wait_for_timeout(3000)
    pg.evaluate("S.tuto=1;document.querySelectorAll('.box.tuto').forEach(b=>b.closest('.modal').remove());0")

VIEWS = ['accueil','jeux','machines','plinko','crash','mines','blackjack','roulette','dice','hilo','traversee','penalty','paris','vpoker','course','roue',
         'keno','tour','elem','gratter','caisses','slots','zeus2','west','medieval','ww2','prehisto','coffres','boutique','collection','pass','quetes',
         'profil','classement','amis','tournoi','notifs','bjtable','poker']
PLAY = """(()=>{const L=[...document.querySelectorAll('#app button')].filter(x=>!x.disabled&&x.offsetParent);
  const x=L.find(b=>/^(Jouer|Lancer|Distribuer|Acheter|Ouvrir|Grimper|JOUER|Lâcher|Décoller|Tourner|Tirer)/.test(b.textContent.trim()));if(x){x.click();return 1}return 0})()"""

def crawl(b):
    print('1. Tous les écrans et jeux')
    for w, h, nm in [(390, 844, 'téléphone'), (1366, 800, 'ordinateur')]:
        c = ctx(b, w, h); pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(pg.url.split('#')[-1] + ': ' + str(e) + ' @ ' + ((e.stack or '').split(chr(10))[1:3].__str__())))
        signup(pg, f'crawl{w}@t.fr', 'Crawl')
        pg.evaluate("S.bal=1e6;save();0")
        for v in VIEWS:
            pg.evaluate(f"location.hash='{v}'"); pg.wait_for_timeout(450)
            pg.evaluate(PLAY); pg.wait_for_timeout(900)
        pg.evaluate("location.hash='roue'"); pg.wait_for_timeout(700)
        for _ in range(3):
            pg.click('.rfb[data-k="0"]'); pg.click('#rfgo'); pg.wait_for_timeout(6200)
        check(not errs, f'aucune erreur ({nm})', '; '.join(errs[:3]))
        c.close()

def sync(b):
    print('2. Sauvegardes entre deux appareils')
    STORE = {}; PAGES = []
    def serve(r):
        r.fulfill(body=MOCK4.replace('__INIT__', json.dumps(json.dumps(STORE))) if 'app-compat' in r.request.url else '', content_type='application/javascript')
    def pump():
        for pg in PAGES:
            try: out = pg.evaluate("window.__OUT?window.__OUT.splice(0):[]")
            except Exception: continue
            for path, v in out:
                if v is None: STORE.pop(path, None)
                else: STORE[path] = v
                for o in PAGES:
                    if o is not pg:
                        try: o.evaluate("([p,v])=>window.__fbrecv&&window.__fbrecv(p,v)", [path, v])
                        except Exception: pass
    def wait(ms):
        for _ in range(ms // 200):
            PAGES[0].wait_for_timeout(200); pump()
    def cloud(): return STORE['data/users/u_lu/save']['s']['bal']
    HIDE = "Object.defineProperty(document,'hidden',{value:true,configurable:true});Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'))"
    SHOW = "Object.defineProperty(document,'hidden',{value:false,configurable:true});Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});document.dispatchEvent(new Event('visibilitychange'))"
    errs = []
    def mk(w, h):
        c = b.new_context(viewport={'width': w, 'height': h}); c.route("https://www.gstatic.com/**", serve); return c
    def page(c):
        pg = c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); PAGES.append(pg); return pg
    cpc = mk(1280, 800); pc = page(cpc); pc.goto(U); wait(800)
    pc.click('#gt2'); pc.fill('#gm', 'lu@t.fr'); pc.fill('#gp', 'secret12'); pc.fill('#gn', 'Lucas'); pc.click('#ggo'); wait(5000)
    pc.evaluate("S.bal=111111;save()"); pc.evaluate(HIDE); wait(1500)
    check(cloud() == 111111, 'le PC envoie sa partie en quittant')
    cph = mk(390, 844); ph = page(cph); ph.goto(U); wait(800)
    ph.fill('#gm', 'lu@t.fr'); ph.fill('#gp', 'secret12'); ph.click('#ggo'); wait(6000)
    check(ph.evaluate("S.bal") == 111111, 'le téléphone récupère la partie du PC')
    ph.evaluate("S.bal=222222;save()"); ph.evaluate(HIDE); wait(1500); ph.close(); PAGES.remove(ph); wait(400)
    pc.evaluate(SHOW); wait(1500)
    check(pc.evaluate("S.bal") == 222222, 'le PC reprend la partie du téléphone')
    pc.evaluate("S.bal=333333;save()"); pc.evaluate(HIDE); wait(1500)
    ph = page(cph); ph.goto(U); wait(800)
    if ph.query_selector('#gm'): ph.fill('#gm', 'lu@t.fr'); ph.fill('#gp', 'secret12'); ph.click('#ggo')
    for _ in range(10):
        wait(200)
        try: ph.evaluate("typeof S!=='undefined'&&(S.xp+=1,save());0")
        except Exception: pass
    wait(5000)
    check(ph.evaluate("S.bal") == 333333 and cloud() == 333333, 'téléphone rouvert : il ne réécrase pas la partie du PC')
    ph.evaluate(HIDE); ph.evaluate("CLOUD.off&&CLOUD.off();CLOUD.off=null;0"); wait(500)
    pc.evaluate(SHOW); wait(800); pc.evaluate("S.bal=555555;save()"); pc.evaluate(HIDE); wait(1500)
    ph.evaluate("S.xp+=1;save();setTimeout(()=>{S.xp+=1;save()},50);0"); ph.evaluate(SHOW); wait(3000)
    check(ph.evaluate("S.bal") == 555555 and cloud() == 555555, 'téléphone sorti de veille : il reprend la partie du PC')
    check(not errs, 'aucune erreur pendant la synchro', '; '.join(errs[:3]))
    cpc.close(); cph.close()

def penalty(b):
    print('3. Penalty')
    c = ctx(b, 390, 844); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    signup(pg, 'pen@t.fr', 'Pen')
    pg.evaluate("location.hash='penalty'"); pg.wait_for_timeout(1200)
    b0 = pg.evaluate("S.bal")
    pg.click('#pntgs .pntg >> nth=0', force=True); pg.wait_for_timeout(300)
    check(pg.evaluate("S.bal") == b0, 'toucher le but sans appuyer sur Jouer ne mise rien')
    pg.evaluate("Math.random=()=>0.1;0"); pg.click('#pncash'); pg.wait_for_timeout(200)
    pg.click('#pntgs .pntg >> nth=0', force=True); pg.wait_for_timeout(3400)
    pg.click('#pntgs .pntg >> nth=3', force=True); pg.wait_for_timeout(3400)
    m2 = pg.evaluate("PEN.mult(S.penMode||'hard',2)")
    pg.click('#pncash'); pg.wait_for_timeout(1800)
    check(pg.evaluate("S.bal") == b0 - 100 + int(100 * m2), '2 buts puis encaisser paie la bonne somme', f'{pg.evaluate("S.bal")}')
    b1 = pg.evaluate("S.bal")
    pg.evaluate("Math.random=()=>0.99;0"); pg.click('#pncash'); pg.wait_for_timeout(200)
    pg.click('#pntgs .pntg >> nth=4', force=True); pg.wait_for_timeout(3800)
    check(pg.evaluate("S.bal") == b1 - 100, 'un arrêt fait perdre la mise')
    b2 = pg.evaluate("S.bal")
    pg.evaluate("Math.random=()=>0.1;0"); pg.click('#pncash'); pg.wait_for_timeout(200)
    pg.click('#pntgs .pntg >> nth=2', force=True); pg.wait_for_timeout(3600)
    pg.evaluate("location.hash='jeux'"); pg.wait_for_timeout(800)
    m1 = pg.evaluate("PEN.mult(S.penMode||'hard',1)")
    check(pg.evaluate("S.bal") == b2 - 100 + int(100 * m1), 'quitter en pleine partie encaisse les buts marqués')
    check(not errs, 'aucune erreur', '; '.join(errs[:3]))
    c.close()

def maths(b):
    print('4. Maths du casino')
    c = ctx(b, 390, 844); pg = c.new_page()
    signup(pg, 'math@t.fr', 'Math')
    r = pg.evaluate("""(()=>{const o={};const C=(n,k)=>{let r=1;for(let i=0;i<k;i++)r=r*(n-i)/(i+1);return r};
      o.roue=RF.map(t=>t.m*t.n/RF_SEG.length);
      o.keno=[];for(let k=1;k<=10;k++){const T=kTable(k);let e=0;T.forEach((m,h)=>e+=kC(k,h)*kC(KN.N-k,KN.D-h)/kC(KN.N,KN.D)*m);o.keno.push(e)}
      o.plinko=[];for(const n of [6,8,16])for(const r of ['low','mid','high']){const T=plTable(n,r);let e=0;T.forEach((m,k)=>e+=C(n,k)/2**n*m);o.plinko.push(e)}
      o.penalty=Object.keys(PEN.D).map(d=>PEN.mult(d,1)*PEN.D[d].g);
      o.traversee=Object.keys(TRV.D).map(d=>TRV.mult(d,1)*TRV.D[d].p);
      o.dice=[10,50,90].map(ch=>RTPG.dice*100/ch*ch/100);
      o.elem=ELW/3+1/3;
      o.gratter=Object.values(TICK).map(T=>{let s=0;for(let i=0;i<300000;i++)s+=scPick(T.tbl);return s/300000});
      o.cap=CARDS.filter(c=>RCAP[c.g]!=null).every(c=>relicPct(c,true,9)<=RCAP[c.g]);
      return o})()""")
    near = lambda v, lo, hi: all(lo <= x <= hi for x in (v if isinstance(v, list) else [v]))
    check(near(r['roue'], .979, .981), 'roue : 98 % sur chaque multiplicateur')
    check(near(r['keno'], .94, 1.0), 'keno : autour de 98 %', ' '.join(f'{x:.3f}' for x in r['keno']))
    check(near(r['plinko'], .97, .99), 'plinko : 98 % (arrondis compris)', ' '.join(f'{x:.3f}' for x in r['plinko']))
    check(near(r['penalty'], .975, .981), 'penalty : 98 % dans les 4 modes')
    check(near(r['traversee'], .97, .981), 'traversée : 98 % (au 1er pas, l\'arrondi retire jusqu\'à 0,6 point)')
    check(near(r['dice'], .979, .981), 'dés : 98 %')
    check(near(r['elem'], .979, .981), 'pierre-feuille-ciseaux : 98 %')
    check(near(r['gratter'], .9, 1.06), 'grattage : autour de 98 % (tirage aléatoire)', ' '.join(f'{x:.3f}' for x in r['gratter']))
    check(r['cap'], 'reliques : aucune ne dépasse son plafond')
    q = pg.evaluate("location.hash='quetes';0"); pg.wait_for_timeout(800)
    q = pg.evaluate("[S.q.list.map(q=>q.rw),S.q.wl.map(q=>q.rw)]")
    check(near(q[0], 800, 2000) and near(q[1], 6000, 12000), 'quêtes : jour 800-2 000 €, semaine 6 000-12 000 €')
    c.close()

if __name__ == '__main__':
    build(True)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            crawl(b); sync(b); penalty(b); maths(b)
            b.close()
    finally:
        build(False)
    print('\n' + ('TOUT EST BON' if not FAIL else f'{len(FAIL)} ÉCHEC(S) : ' + ' | '.join(FAIL)))
    sys.exit(1 if FAIL else 0)
