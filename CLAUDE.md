# Instructions pour Claude

- Le propriétaire est Lucas (francophone). Réponds en français, en prose fluide.
- Modifie toujours `source/casino-claude.html`, puis régénère le site avec `python3 source/build.py` (il réécrit `index.html`). Ne modifie pas `index.html` à la main.
- Le site tourne sur Firebase (forfait gratuit Spark) : garde les écritures Firestore économes. Ne jamais proposer de passer au forfait Blaze.
- Règle permanente : dans toutes les machines à sous, les wilds restent en place pendant les tours gratuits.
- Crédits virtuels uniquement, jamais d'achat en argent réel. Mention 16+ à conserver.
- Avant `python3 source/build.py`, installe le minifieur : `mkdir -p /tmp/tb && cd /tmp/tb && npm i terser@5` (sinon le site sort non minifié). `NOMIN=1` produit une version non protégée, uniquement pour les tests.
- Le site vérifie `version.txt` et se met à jour tout seul : ne pas supprimer ce fichier.
- Pour les écritures Netlify : le site n'est plus sur Netlify, il est servi par GitHub Pages (https://ulacs63.github.io/creaturia-casino/).
- Règle permanente : chaque nouveau jeu ajouté reçoit sa relique (entrée dans CARDS + dessin dans RELART + libellé dans GLBL) et ses 3 quêtes (ajouter l'identifiant du jeu dans QG : jouer, gagner, miser sur ce jeu).
- Récompenses de quêtes : quêtes du jour 800 à 2 000 €, de la semaine 6 000 à 12 000 €. XP volontairement lente (XP par mise en logarithme de la mise).
- RTP : 98 % de base sur tous les jeux (table RTPG), bonus de relique plafonné par jeu (RCAP) pour rester à ~103 % max.
