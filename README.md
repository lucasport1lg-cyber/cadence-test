# Tester Cadence

Mini site pour faire tester le prototype Cadence (projet IHM, ESGI) en autonomie :
le testeur ouvre un lien, répond à 3 questions, fait 12 missions dans l'appli,
note leur facilité, remplit le questionnaire SUS et envoie ses réponses.
Aucun compte n'est nécessaire et rien n'est à remettre à zéro entre deux testeurs :
chaque téléphone démarre sa propre session.

- Lien du test : la page d'accueil du site.
- Exploration libre (sans test) : ajouter `?libre` à la fin de l'adresse.

## Étape 1 — Recevoir les résultats dans Google Sheets (5 min)

1. Crée un tableur Google Sheets vide (par exemple « Résultats tests Cadence »).
2. Menu **Extensions › Apps Script**.
3. Efface le code affiché et colle tout le contenu de `google-apps-script.gs`. Enregistre.
4. Bouton **Déployer › Nouveau déploiement** › type **Application Web** :
   - Exécuter en tant que : **Moi**
   - Qui peut accéder : **Tout le monde**
5. **Déployer**, autorise l'accès demandé, puis copie l'**URL de l'application Web** (elle finit par `/exec`).
6. Colle cette URL dans `config.js`, entre les guillemets de `sheetUrl`, et enregistre.

Les résultats arrivent dans deux onglets créés automatiquement :
**Testeurs** (une ligne par personne, avec le score SUS) et **Missions** (une ligne par mission).

## Étape 2 — Mettre le site en ligne (GitHub Pages)

Dans le dépôt GitHub : **Settings › Pages › Build and deployment** :
Source **Deploy from a branch**, branche **main**, dossier **/ (root)**, puis **Save**.
Le lien du site apparaît en haut de cette page après une minute environ.

## Avant d'envoyer le lien

Fais le test une fois toi-même jusqu'au bout, puis vérifie qu'une ligne est
apparue dans le tableur. Tu peux ensuite la supprimer.

## Contenu

- `index.html`, `styles.css`, `app.js` : le parcours de test
- `runtime.js` : affiche les écrans du prototype (format .dc.html) dans le navigateur
- `screens/` : les 17 écrans joueur du prototype v1.2
- `config.js` : adresse du tableur
- `google-apps-script.gs` : script à coller dans le tableur
- `vendor/` : React 18 (licence MIT)
