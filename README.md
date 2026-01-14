# Plateforme d'Examens en Ligne - ENSAM Casablanca

## Description
Application web permettant aux étudiants de passer des examens en ligne avec :
- Authentification par login/mot de passe
- Sélection automatique des matières selon la filière de l'étudiant
- Génération aléatoire de 20 questions par examen
- Chronométrage (30 minutes par examen)
- Correction automatique et affichage de la note
- Export des résultats en CSV
- Restriction : un seul passage par examen par étudiant

## Structure des Filières

```
Génie Mécanique
├── GMAA
│   ├── 1ère Année
│   │   ├── Ingénierie des Systèmes
│   │   └── Schématisation & Conception des Systèmes et EDA
│   └── 2ème Année
│       ├── Digital Twins et Technologies Immersives
│       └── Industrie 4.0 et Internet des Objets
└── GSMI
    └── 3ème Année
        ├── Avioniques et Systèmes Aéronautiques
        └── Maquette Numérique Prototypage

Génie Electrique
└── GEM
    └── 3ème Année
        └── Maquette Numérique Prototypage
```

## Installation

### Prérequis
- Node.js 18 ou supérieur
- npm

### Installation locale

```bash
cd serveur_examen
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
serveur_examen/
├── server.js                 # Serveur Express principal
├── package.json              # Dépendances npm
├── public/                   # Fichiers statiques
│   ├── index.html           # Page principale
│   ├── styles.css           # Styles CSS
│   └── app.js               # JavaScript client
├── data/
│   ├── etudiants.json       # Base des étudiants
│   ├── examens_passes.json  # Suivi des examens passés
│   ├── resultats.csv        # Export des résultats
│   └── questions/           # Banques de questions
│       ├── ingenierie_systemes.json
│       ├── schematisation_conception_eda.json
│       ├── digital_twins.json
│       ├── industrie_4_0.json
│       ├── avioniques.json
│       └── maquette_numerique.json
└── scripts/
    ├── create_users.js      # Script création utilisateurs
    ├── import_students_csv.js # Import depuis CSV
    └── etudiants_template.csv # Template CSV
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

## Support

Pour ajouter de nouvelles questions, modifiez les fichiers JSON dans `data/questions/`.

Pour ajouter une nouvelle matière :
1. Créez le fichier JSON de questions dans `data/questions/`
2. Ajoutez le mapping dans `server.js` (variable `matiereToFile`)
3. Ajoutez la matière dans la structure des filières si nécessaire
