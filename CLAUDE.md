# Instructions pour Claude

- Le propriétaire est Lucas (francophone). Réponds en français, en prose fluide.
- Modifie toujours `source/casino-claude.html`, puis régénère le site avec `python3 source/build.py` (il réécrit `index.html`). Ne modifie pas `index.html` à la main.
- Le site tourne sur Firebase (forfait gratuit Spark) : garde les écritures Firestore économes. Ne jamais proposer de passer au forfait Blaze.
- Règle permanente : dans toutes les machines à sous, les wilds restent en place pendant les tours gratuits.
- Crédits virtuels uniquement, jamais d'achat en argent réel. Mention 16+ à conserver.
- Avant `python3 source/build.py`, installe le minifieur : `mkdir -p /tmp/tb && cd /tmp/tb && npm i terser@5` (sinon le site sort non minifié). `NOMIN=1` produit une version non protégée, uniquement pour les tests.
- Le site vérifie `version.txt` et se met à jour tout seul : ne pas supprimer ce fichier.
- Pour les écritures Netlify : le site n'est plus sur Netlify, il est servi par GitHub Pages (https://ulacs63.github.io/creaturia-casino/).
