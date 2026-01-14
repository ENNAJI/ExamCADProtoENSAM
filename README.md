# Examen Conception et Prototypage - ENSAM Casablanca

## Description
Plateforme d'examen en ligne pour le module **Conception et Prototypage** destinée aux étudiants des Masters IDMS et TI de l'ENSAM Casablanca.

### Fonctionnalités
- Authentification sécurisée par login/mot de passe
- Examen de 20 questions (QCM, Vrai/Faux, Rédaction)
- Chronométrage de 30 minutes par examen
- Correction automatique et affichage immédiat de la note
- Tableau de bord administrateur pour suivre les résultats
- Export des résultats en CSV
- Restriction : un seul passage par examen par étudiant

## Structure des Filières

```
Génie Electrique
├── IDMS (Master)
│   └── Conception et Prototypage
└── TI (Master)
    └── Conception et Prototypage
```

## Étudiants
- **61 étudiants** répartis en 2 filières :
  - 40 étudiants IDMS
  - 21 étudiants TI

## Installation

### Prérequis
- Node.js 18 ou supérieur
- npm

### Installation locale

```bash
cd serveur_examen_CADProto
npm install
```

### Créer les utilisateurs

1. **Option 1 : Via le script de création**
   
   Modifiez le fichier `scripts/create_users.js` avec vos étudiants, puis :
   ```bash
   node scripts/create_users.js
   ```

2. **Option 2 : Via import CSV**
   
   Créez un fichier CSV avec le format suivant :
   ```
   login,password,nom,prenom,departement,filiere,annee
   etudiant1,pass123,ALAMI,Mohammed,Génie Mécanique,GMAA,1ère Année
   ```
   
   Puis importez :
   ```bash
   node scripts/import_students_csv.js chemin/vers/votre_fichier.csv
   ```

### Lancer le serveur

```bash
npm start
```

Le serveur démarre sur `http://localhost:3000`

## Déploiement sur serveur gratuit

### Option 1 : Render.com

1. Créez un compte sur [render.com](https://render.com)
2. Connectez votre dépôt GitHub
3. Créez un nouveau "Web Service"
4. Configurez :
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node

### Option 2 : Railway.app

1. Créez un compte sur [railway.app](https://railway.app)
2. Créez un nouveau projet depuis GitHub
3. Le déploiement est automatique

### Option 3 : Glitch.com

1. Créez un compte sur [glitch.com](https://glitch.com)
2. Importez depuis GitHub
3. Le projet démarre automatiquement

## Structure des fichiers

```
serveur_examen_CADProto/
├── server.js                 # Serveur Express principal
├── package.json              # Dépendances npm
├── public/                   # Fichiers statiques
│   ├── index.html           # Page principale (étudiants)
│   ├── admin.html           # Page administration
│   ├── styles.css           # Styles CSS
│   └── app.js               # JavaScript client
├── data/
│   ├── etudiants.json       # Base des 62 utilisateurs
│   ├── examens_passes.json  # Suivi des examens passés
│   ├── resultats.csv        # Export des résultats
│   ├── resultats/           # Résultats détaillés par étudiant
│   └── questions/           # Banque de questions
│       └── questions_conception_prototypage.json (100 questions)
└── scripts/
    ├── import_masters.js    # Script import étudiants Masters
    └── etudiants_import.csv # Liste des étudiants
```

## Format des questions

Les fichiers de questions sont au format JSON :

```json
{
  "module": "Nom du module",
  "questions": [
    {
      "id": 1,
      "type": "QCM",
      "question": "Texte de la question",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "reponse_correcte": "B",
      "explication": "Explication de la réponse"
    },
    {
      "id": 2,
      "type": "VRAI_FAUX",
      "question": "Affirmation à évaluer",
      "reponse_correcte": "VRAI",
      "explication": "Explication"
    },
    {
      "id": 3,
      "type": "REDACTION",
      "question": "Question ouverte",
      "reponse_correcte": "Réponse attendue",
      "points_cles": ["mot1", "mot2", "mot3"]
    }
  ]
}
```

## Fichier CSV des résultats

Le fichier `data/resultats.csv` contient :
- Departement
- Filiere
- Annee
- Matiere
- Login
- Nom
- Prenom
- Date
- Score
- Total
- Note (/20)
- Reponses (JSON)
- Temps_Depasse (true/false)

## Sécurité

- Les mots de passe sont hashés avec bcrypt
- Sessions sécurisées avec express-session
- Un étudiant ne peut passer qu'une seule fois chaque examen

## Accès

### Page Étudiants
- URL : `/`
- Connexion avec login/mot de passe fourni

### Page Administration
- URL : `/admin`
- Login : `admin`
- Mot de passe : `Admin2026`

## Fonctionnalités Admin
- Visualisation de tous les étudiants et leur progression
- Onglet "Résultats" avec liste de tous les examens passés
- Statistiques par matière et par filière
- Export CSV des résultats
- Détails des réponses de chaque étudiant

## Déploiement

Déployé sur Render.com : https://examcadprotoensam.onrender.com

## Support

Pour toute question, contactez l'administrateur de la plateforme.
