import re,sys,time
VER=str(int(time.time()))
src=open('/home/claude/creaturia-casino/source/casino-claude.html').read()
cfg=open('/home/claude/creaturia-casino/source/config.js').read() if len(sys.argv)<2 else sys.argv[1]
m=re.search(r'<script>(.*)</script>',src,re.S);code=m.group(1)
def r(a,b):
    global code
    assert code.count(a)>=1,a[:60];code=code.replace(a,b)
# pas de cadeaux pour les nouveaux comptes
r("const G=[['gift100k',100000],['gift1m',1000000],['gift1m_b',1000000],['gift5m',5000000]];","const G=[];")
r("setTimeout(applyGifts,(window.claude&&claude.use)?9000:0);","setTimeout(applyGifts,9000);")
# textes propres à Claude
code=code.replace("Le classement fonctionne quand le casino est ouvert depuis Claude avec ton compte (sauvegarde en ligne active).","Le classement se charge… Vérifie ta connexion internet.")
code=code.replace("Le classement s\\'affiche quand le casino est ouvert depuis Claude avec ton compte.","Le classement se charge… Vérifie ta connexion internet.")
code=re.sub(r"Pour jouer avec un ami : partage le casino avec lui depuis le bouton Partager \(accès « Contributeur » ou plus\) et ouvrez-le en même temps\.","Pour jouer avec un ami : envoie-lui le lien du site, qu'il crée son compte, et ouvrez le casino en même temps.",code)
code=code.replace("quand tu ouvres le casino avec ton compte Claude","quand tu te connectes avec ton compte")
# protection : code enfermé (plus de variables accessibles depuis la console) puis minifié
import subprocess,os
if not os.environ.get('NOMIN'):code='(()=>{'+code+'\nwindow.claimSalary=claimSalary;})();'
open('/tmp/_cc_in.js','w').write(code)
T='/tmp/tb/node_modules/.bin/terser'
if os.path.exists(T) and not os.environ.get('NOMIN'):
    subprocess.run([T,'/tmp/_cc_in.js','-c','passes=1','-m','--ecma','2020','-o','/tmp/_cc_out.js'],check=True)
    code=open('/tmp/_cc_out.js').read()
head=src[:m.start()];tail=src[m.end():]
css='''<style>#gate{position:fixed;inset:0;z-index:200;display:none;place-items:center;padding:20px;background:radial-gradient(circle at 50% 35%,#2a1d5c,#05030c 75%);font-family:Nunito,system-ui,sans-serif;color:#fff}
.gbox{width:100%;max-width:340px;text-align:center}.gbox h1{font-family:Cinzel,serif;font-size:34px;letter-spacing:3px;margin:0 0 18px;background:linear-gradient(90deg,#ff6b3d,#ffd23d,#5fcf6a,#3da5ff,#b06bff);-webkit-background-clip:text;background-clip:text;color:transparent}
.gbox h1 small{display:block;font-size:13px;letter-spacing:9px;color:#f5c451;-webkit-text-fill-color:#f5c451}
.gbox input{width:100%;box-sizing:border-box;margin:5px 0;padding:12px;border-radius:12px;border:1px solid #3a2f6b;background:#141029;color:#fff;font-size:15px}
.gseg{display:flex;background:#141029;border-radius:12px;padding:3px;margin-bottom:8px}.gseg button{flex:1;padding:9px;border:0;border-radius:10px;background:none;color:#a9a3c9;font-weight:800;font-size:14px}.gseg button.on{background:#2a1f55;color:#fff}
.gbtn{width:100%;margin-top:8px;padding:13px;border:0;border-radius:12px;font-weight:900;font-size:15px;background:linear-gradient(180deg,#ffe39a,#f5c451);color:#3a2600;cursor:pointer}.gbtn.alt{background:#fff;color:#222}
.gerr{color:#ff8a8a;font-weight:700;font-size:13px;min-height:18px;margin:10px 0 4px}.gbox a{color:#bfb3ff;font-size:13px}.gnote{font-size:11px;color:#8a80b8;margin-top:16px}
.grem{display:flex;align-items:center;gap:10px;margin:10px 2px 2px;font-size:14px;font-weight:700;color:#d8d2f5;cursor:pointer;user-select:none;text-align:left}.grem input{display:none}
.gbox2{width:22px;height:22px;border-radius:7px;border:2px solid #5a4fa0;background:#141029;display:grid;place-items:center;flex:none}.grem input:checked+.gbox2{background:linear-gradient(180deg,#ffe39a,#f5c451);border-color:#f5c451}.grem input:checked+.gbox2::after{content:'✓';color:#3a2600;font-weight:900;font-size:14px}</style>'''
fb='''<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>'''
out=head.replace('</head>',css+'</head>',1)+'<div id="gate"></div>\n'+fb+'\n<script>\n'+cfg+'\n</script>\n<script>'+open('/home/claude/creaturia-casino/source/shim.js').read()+'</script>\n<script type="text/plain" id="maincode">'+code+'</script>'+tail
out=out.replace('<title>','<title>',1)
out=out.replace('__BUILD__',VER)
open('/home/claude/creaturia-casino/index.html','w').write(out)
open('/home/claude/creaturia-casino/version.txt','w').write(VER)
print(len(out))
