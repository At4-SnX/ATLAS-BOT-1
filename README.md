# ATLAS RP Events — Bot d'arrivée/départ et synthèse vocale

Bot Discord dédié à **ATLAS RP** : visuels d'arrivée/départ des membres, et
présence vocale permanente dans un salon d'attente STAFF avec annonce
vocale automatique. Ces deux systèmes sont **entièrement indépendants**
l'un de l'autre.

## ✨ Fonctionnalités

### Arrivées / départs

- Quand un membre rejoint : un message **"Salut à toi @membre Bienvenue
  sur ATLAS RP !"** est envoyé au-dessus d'un embed contenant le visuel
  d'arrivée, avec sa photo de profil Discord et son pseudo d'affichage
  placés au milieu à gauche.
- Le nombre de membres du serveur ("MERCI D'AVOIR REJOINT, VOUS ÊTES LE
  234e MEMBRES") est affiché **à la suite** du texte déjà présent dans
  l'image, sur la même ligne.
- Quand un membre quitte : un message **"Aurevoir et à bientôt, ce fut un
  plaisir de t'accueillir sur ATLAS RP..."** est envoyé au-dessus d'un
  embed avec le visuel de départ (photo de profil + pseudo, sans compteur).
- Les 4 visuels d'arrivée fournis alternent à tour de rôle (1, 2, 3, 4, 1,
  2, ...), et pareil séparément pour les 4 visuels de départ.
- Le pseudo d'affichage est en police normale (pas en gras), tandis que le
  compteur de membres utilise la police **Archivo Black** (taille 32.9),
  identique à celle déjà utilisée dans les visuels fournis.

### Salon vocal d'attente STAFF + synthèse vocale

- Le bot rejoint automatiquement, au démarrage, le salon vocal défini par
  `VOICE_CHANNEL_ID`, et s'y reconnecte automatiquement en cas de
  déconnexion.
- Quand un membre (humain, pas un bot) rejoint **ce salon vocal précis**,
  le bot annonce vocalement, avec une **voix féminine française** :
  *"Bienvenue sur l'attente STAFF de ATLAS RP, Merci de patientez le temps
  qu'un STAFF prenne votre demande"*
- **Délai anti-coupure** : un court délai (`VOICE_ANNOUNCE_DELAY_MS`,
  1800ms par défaut) est appliqué avant de démarrer l'annonce, pour éviter
  que le début de la phrase soit coupé le temps que le client Discord de
  l'arrivant finisse sa connexion audio.
- Si une annonce est déjà en cours, le bot ne parle pas par-dessus :
  l'arrivée suivante est simplement ignorée (pas de file d'attente).
- Synthèse vocale gratuite (API non-officielle de Google Traduction,
  aucune clé requise). Le texte est modifiable dans
  `config/voiceMessages.js`.

## ⚠️ Étape OBLIGATOIRE — activer "Server Members Intent"

1. https://discord.com/developers/applications → ton application → **Bot**
2. **Privileged Gateway Intents** → active **SERVER MEMBERS INTENT**
3. Sauvegarde

Sans cette étape, les arrivées/départs ne se déclenchent jamais, sans
erreur visible dans les logs.

## ⚠️ Limitation — stockage des données

L'ordre de rotation des 8 visuels est mémorisé dans
`data/eventRotation.json`. Sur Railway, le système de fichiers est
éphémère par défaut : ce fichier est réinitialisé à chaque redéploiement
(la rotation repart simplement à la première image, rien de grave). Pour
une persistance garantie, ajoute un **Volume** Railway monté sur
`/app/data` (Settings > Volumes de ton service).

## 📁 Structure du projet

```
atlas-events-bot/
├── index.js                  # Point d'entrée : événements membres + vocal
├── package.json
├── Procfile                   # Pour Railway
├── .env.example
├── assets/
│   ├── fonts/
│   │   ├── ArchivoBlack-Regular.ttf   # Police du compteur de membres
│   │   └── PTSans-Regular.ttf          # Police normale du pseudo
│   └── events/
│       ├── arrivee-1.png à arrivee-4.png   # Les 4 visuels d'arrivée (rotation 1/4)
│       └── depart-1.png à depart-4.png      # Les 4 visuels de départ (rotation 1/4)
├── config/
│   ├── messages.js              # <-- Textes d'arrivée/départ, nom du serveur (modifiable)
│   └── voiceMessages.js          # <-- Texte lu par la synthèse vocale (modifiable)
├── events/
│   └── memberEvents.js            # Gestion des arrivées/départs (embed + message)
├── utils/
│   ├── eventCard.js                 # Composition avatar + pseudo + compteur
│   ├── eventCounters.js              # Rotation persistante des 4+4 images
│   └── voice.js                        # Connexion vocale persistante + synthèse vocale
└── data/
    └── eventRotation.json            # État de la rotation (créé automatiquement)
```

## 🛠️ Étape 1 — Créer l'application Discord

1. New Application → nomme-la **ATLAS Events** (ou autre)
2. Onglet **Bot** → Reset Token → copie-le (➡️ `DISCORD_TOKEN`)
3. Active **SERVER MEMBERS INTENT** (voir ci-dessus)
4. Onglet **OAuth2 > URL Generator** :
   - Scopes : `bot`
   - Permissions : `Send Messages`, `Attach Files`, `Embed Links`,
     `Connect`, `Speak`
   - Ouvre l'URL générée pour inviter le bot

## 🛠️ Étape 2 — Récupérer les IDs nécessaires

Mode développeur activé, puis clic droit pour copier :
- L'ID du salon texte des arrivées (➡️ `WELCOME_CHANNEL_ID`)
- L'ID du salon texte des départs (➡️ `LEAVE_CHANNEL_ID`)
- L'ID du salon **vocal** d'attente STAFF (➡️ `VOICE_CHANNEL_ID`)

## 🛠️ Étape 3 — Configurer les variables d'environnement

Sur Railway : onglet **Variables** → ajoute toutes les valeurs de
`.env.example`.

## 🚀 Étape 4 — Déployer sur Railway

1. Crée un repo GitHub avec ce projet (le `.gitignore` empêche d'y inclure
   `.env`)
2. Railway → "New Project" → "Deploy from GitHub repo"
3. Vérifie que `package.json` est à la racine du repo
4. Ajoute les variables d'environnement
5. (Recommandé) Ajoute un **Volume** monté sur `/app/data`
6. Railway utilise le `Procfile` pour exécuter `node index.js`

Aucun script à lancer en plus : dès que le bot affiche "Connectée en tant
que..." dans les logs, tout fonctionne immédiatement.

## ✏️ Personnaliser

- **Textes d'arrivée/départ, nom du serveur** : `config/messages.js`
- **Texte vocal** : `config/voiceMessages.js`
- **Position/taille de l'avatar, du pseudo, du compteur** : constantes en
  haut de `utils/eventCard.js`
- **Visuels de fond** : remplace les fichiers dans `assets/events/` en
  gardant les mêmes noms — si la position du texte "MERCI D'AVOIR
  REJOINT..." change dans tes nouveaux visuels, ajuste `ORDINAL_START_X` /
  `ORDINAL_BASELINE_Y` dans `utils/eventCard.js` en conséquence.

## 🔧 Notes techniques

- Le rendu d'image utilise `@napi-rs/canvas` (aucune dépendance système à
  installer), compatible directement avec Railway.
- La synthèse vocale utilise `google-tts-api` avec le code langue `fr-FR`,
  qui correspond à une voix **féminine** chez Google Traduction. L'API
  gratuite ne permet pas de choisir explicitement un genre de voix, mais
  `fr-FR` est déjà féminine par défaut — aucune configuration
  supplémentaire n'est nécessaire.
- La lecture audio utilise `ffmpeg-static` (téléchargé automatiquement à
  l'installation, nécessite un accès internet complet pendant le build —
  automatique sur Railway).
- Le compteur de membres est calé à la taille demandée (Archivo Black,
  32.9px), qui est légèrement plus petite que le texte déjà présent dans
  l'image ("MERCI D'AVOIR REJOINT...", ~29px de hauteur de caractère à une
  taille équivalente d'environ 43px). Si tu préfères un calage visuel
  parfait entre les deux tailles plutôt que la valeur 32.9 explicitement
  demandée, change `ORDINAL_FONT_SIZE` dans `utils/eventCard.js`.
- Position mesurée du texte "MERCI D'AVOIR REJOINT, VOUS ETES LE" dans les
  visuels fournis : bande x 154-1126, y 684-713 (identique sur les 4 fonds
  d'arrivée). Le compteur est positionné à x=1146 sur la même ligne de
  base (y=712).
