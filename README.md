# Créaturia Casino

Casino virtuel dans l'univers de Créaturia. Crédits 100 % fictifs : aucun argent réel, rien à acheter ni à retirer. Réservé aux 16 ans et plus.

- `index.html` : le site publié (Netlify le sert tel quel).
- `source/casino-claude.html` : le code du casino (version d'origine).
- `source/build.py` : fabrique `index.html` à partir du code, avec la connexion Firebase (`shim.js`, `config.js`).
- `source/firestore.rules` : règles de sécurité de la base Firestore.
