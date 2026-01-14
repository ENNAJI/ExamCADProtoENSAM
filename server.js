const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'ensam-examen-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 3600000 // 1 heure
    }
}));

// Charger les données
let etudiants = {};
let questionsDB = {};
let examensPassés = {};

// Charger les étudiants
function chargerEtudiants() {
    const etudiantsPath = path.join(__dirname, 'data', 'etudiants.json');
    if (fs.existsSync(etudiantsPath)) {
        etudiants = JSON.parse(fs.readFileSync(etudiantsPath, 'utf8'));
    }
}

// Charger les questions
function chargerQuestions() {
    const questionsDir = path.join(__dirname, 'data', 'questions');
    if (fs.existsSync(questionsDir)) {
        const files = fs.readdirSync(questionsDir);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                const matiere = file.replace('.json', '');
                questionsDB[matiere] = JSON.parse(fs.readFileSync(path.join(questionsDir, file), 'utf8'));
            }
        });
    }
}

// Charger les examens passés
function chargerExamensPassés() {
    const examensPath = path.join(__dirname, 'data', 'examens_passes.json');
    if (fs.existsSync(examensPath)) {
        examensPassés = JSON.parse(fs.readFileSync(examensPath, 'utf8'));
    }
}

// Sauvegarder les examens passés
function sauvegarderExamensPassés() {
    const examensPath = path.join(__dirname, 'data', 'examens_passes.json');
    fs.writeFileSync(examensPath, JSON.stringify(examensPassés, null, 2));
}

// Structure des filières - Masters GEM/MSEI
const structure = {
    "Génie Electrique": {
        "IDMS": {
            "Master": [
                "Conception et Prototypage"
            ]
        },
        "TI": {
            "Master": [
                "Conception et Prototypage"
            ]
        }
    }
};

// Mapping matière -> fichier questions
const matiereToFile = {
    "Conception et Prototypage": "questions_conception_prototypage"
};

// Initialisation
chargerEtudiants();
chargerQuestions();
chargerExamensPassés();

// Routes API

// Connexion
app.post('/api/login', async (req, res) => {
    const { login, password } = req.body;
    
    const etudiant = etudiants[login];
    if (!etudiant) {
        return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    
    const passwordValid = await bcrypt.compare(password, etudiant.password);
    if (!passwordValid) {
        return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    
    req.session.user = {
        login: login,
        nom: etudiant.nom,
        prenom: etudiant.prenom,
        departement: etudiant.departement,
        filiere: etudiant.filiere,
        annee: etudiant.annee
    };
    
    res.json({ 
        success: true, 
        user: req.session.user 
    });
});

// Déconnexion
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Vérifier session
app.get('/api/session', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

// Obtenir la structure des filières
app.get('/api/structure', (req, res) => {
    res.json(structure);
});

// Obtenir les matières disponibles pour l'étudiant
app.get('/api/matieres', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Non connecté' });
    }
    
    const { departement, filiere, annee } = req.session.user;
    
    try {
        const matieres = structure[departement][filiere][annee] || [];
        
        // Vérifier quels examens ont déjà été passés
        const matieresAvecStatut = matieres.map(matiere => {
            const examKey = `${req.session.user.login}_${matiere}`;
            const dejaPasse = examensPassés[examKey] ? true : false;
            return {
                nom: matiere,
                dejaPasse: dejaPasse
            };
        });
        
        res.json(matieresAvecStatut);
    } catch (e) {
        res.json([]);
    }
});

// Démarrer un examen
app.post('/api/examen/start', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Non connecté' });
    }
    
    const { matiere } = req.body;
    const examKey = `${req.session.user.login}_${matiere}`;
    
    // Vérifier si l'examen a déjà été passé
    if (examensPassés[examKey]) {
        return res.status(403).json({ error: 'Vous avez déjà passé cet examen' });
    }
    
    // Obtenir les questions
    const fichierQuestions = matiereToFile[matiere];
    if (!questionsDB[fichierQuestions]) {
        return res.status(404).json({ error: 'Questions non disponibles pour cette matière' });
    }
    
    const toutesQuestions = questionsDB[fichierQuestions].questions;
    
    // Sélectionner 20 questions aléatoires
    const questionsExamen = selectionnerQuestionsAleatoires(toutesQuestions, 20);
    
    // Stocker l'examen en session
    req.session.examen = {
        matiere: matiere,
        questions: questionsExamen,
        debut: Date.now(),
        duree: 30 * 60 * 1000 // 30 minutes en millisecondes
    };
    
    // Préparer les questions pour le client (sans les réponses)
    const questionsClient = questionsExamen.map((q, index) => ({
        numero: index + 1,
        id: q.id,
        type: q.type,
        question: q.question,
        options: q.options || null
    }));
    
    res.json({
        success: true,
        questions: questionsClient,
        duree: 30 * 60, // 30 minutes en secondes
        total: questionsClient.length
    });
});

// Soumettre l'examen
app.post('/api/examen/submit', async (req, res) => {
    if (!req.session.user || !req.session.examen) {
        return res.status(401).json({ error: 'Session invalide' });
    }
    
    const { reponses } = req.body;
    const examen = req.session.examen;
    const user = req.session.user;
    
    // Calculer le temps écoulé
    const tempsEcoule = Date.now() - examen.debut;
    const tempsDepasse = tempsEcoule > examen.duree;
    
    // Corriger l'examen
    let score = 0;
    const corrections = [];
    
    examen.questions.forEach((question, index) => {
        const reponseEtudiant = reponses[question.id] || '';
        let correct = false;
        
        // Gérer les deux formats de réponse (reponse ou reponse_correcte)
        const reponseCorrecte = question.reponse_correcte || question.reponse || '';
        
        if (question.type === 'QCM' || question.type === 'VRAI_FAUX') {
            correct = reponseEtudiant.toUpperCase() === reponseCorrecte.toUpperCase();
        } else if (question.type === 'REDACTION') {
            // Pour les questions de rédaction, on vérifie les points clés
            if (question.points_cles) {
                const reponseNormalisee = reponseEtudiant.toLowerCase();
                const pointsTrouves = question.points_cles.filter(pc => 
                    reponseNormalisee.includes(pc.toLowerCase())
                ).length;
                correct = pointsTrouves >= Math.ceil(question.points_cles.length / 2);
            } else {
                // Comparaison simple
                correct = reponseEtudiant.toLowerCase().includes(
                    reponseCorrecte.toLowerCase().substring(0, 50)
                );
            }
        }
        
        if (correct) score++;
        
        corrections.push({
            numero: index + 1,
            question: question.question,
            reponseEtudiant: reponseEtudiant,
            reponseCorrecte: reponseCorrecte,
            correct: correct
        });
    });
    
    const note = (score / examen.questions.length) * 20;
    const noteArrondie = Math.round(note * 100) / 100;
    
    // Marquer l'examen comme passé
    const examKey = `${user.login}_${examen.matiere}`;
    examensPassés[examKey] = {
        date: new Date().toISOString(),
        note: noteArrondie,
        score: score,
        total: examen.questions.length
    };
    sauvegarderExamensPassés();
    
    // Enregistrer dans le CSV
    await enregistrerResultatCSV({
        departement: user.departement,
        filiere: user.filiere,
        annee: user.annee,
        matiere: examen.matiere,
        login: user.login,
        nom: user.nom,
        prenom: user.prenom,
        date: new Date().toISOString(),
        score: score,
        total: examen.questions.length,
        note: noteArrondie,
        reponses: JSON.stringify(reponses),
        tempsDepasse: tempsDepasse
    });
    
    // Enregistrer dans un fichier JSON par étudiant
    enregistrerResultatJSON({
        login: user.login,
        nom: user.nom,
        prenom: user.prenom,
        departement: user.departement,
        filiere: user.filiere,
        annee: user.annee,
        matiere: examen.matiere,
        date: new Date().toISOString(),
        score: score,
        total: examen.questions.length,
        note: noteArrondie,
        tempsDepasse: tempsDepasse,
        reponses: reponses,
        corrections: corrections
    });
    
    // Nettoyer la session d'examen
    delete req.session.examen;
    
    res.json({
        success: true,
        note: noteArrondie,
        score: score,
        total: examen.questions.length,
        corrections: corrections,
        tempsDepasse: tempsDepasse
    });
});

// Fonction pour sélectionner des questions aléatoires
function selectionnerQuestionsAleatoires(questions, nombre) {
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(nombre, shuffled.length));
}

// Fonction pour enregistrer dans un fichier JSON par étudiant
function enregistrerResultatJSON(data) {
    const resultatsDir = path.join(__dirname, 'data', 'resultats');
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(resultatsDir)) {
        fs.mkdirSync(resultatsDir, { recursive: true });
    }
    
    // Nettoyer le login pour le nom de fichier (remplacer les caractères spéciaux)
    const loginSafe = data.login.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fichierEtudiant = path.join(resultatsDir, `${loginSafe}.json`);
    
    // Charger les résultats existants ou créer un nouveau fichier
    let resultatsEtudiant = {
        etudiant: {
            login: data.login,
            nom: data.nom,
            prenom: data.prenom,
            departement: data.departement,
            filiere: data.filiere,
            annee: data.annee
        },
        examens: []
    };
    
    if (fs.existsSync(fichierEtudiant)) {
        resultatsEtudiant = JSON.parse(fs.readFileSync(fichierEtudiant, 'utf8'));
    }
    
    // Ajouter le nouvel examen
    resultatsEtudiant.examens.push({
        matiere: data.matiere,
        date: data.date,
        score: data.score,
        total: data.total,
        note: data.note,
        tempsDepasse: data.tempsDepasse,
        reponses: data.reponses,
        corrections: data.corrections
    });
    
    // Sauvegarder
    fs.writeFileSync(fichierEtudiant, JSON.stringify(resultatsEtudiant, null, 2));
    console.log(`Résultat enregistré: ${fichierEtudiant}`);
}

// Fonction pour enregistrer dans le CSV
async function enregistrerResultatCSV(data) {
    const csvPath = path.join(__dirname, 'data', 'resultats.csv');
    const fileExists = fs.existsSync(csvPath);
    
    const csvWriter = createObjectCsvWriter({
        path: csvPath,
        header: [
            { id: 'departement', title: 'Departement' },
            { id: 'filiere', title: 'Filiere' },
            { id: 'annee', title: 'Annee' },
            { id: 'matiere', title: 'Matiere' },
            { id: 'login', title: 'Login' },
            { id: 'nom', title: 'Nom' },
            { id: 'prenom', title: 'Prenom' },
            { id: 'date', title: 'Date' },
            { id: 'score', title: 'Score' },
            { id: 'total', title: 'Total' },
            { id: 'note', title: 'Note' },
            { id: 'reponses', title: 'Reponses' },
            { id: 'tempsDepasse', title: 'Temps_Depasse' }
        ],
        append: fileExists
    });
    
    await csvWriter.writeRecords([data]);
}

// Vérifier si l'utilisateur est admin
function isAdmin(req) {
    return req.session.user && req.session.user.annee === 'Admin';
}

// API Admin - Obtenir tous les étudiants et leur avancement
app.get('/api/admin/dashboard', (req, res) => {
    if (!isAdmin(req)) {
        return res.status(403).json({ error: 'Accès refusé' });
    }
    
    const dashboard = {
        totalEtudiants: Object.keys(etudiants).filter(k => etudiants[k].annee !== 'Admin').length,
        totalExamensPassés: Object.keys(examensPassés).length,
        parFiliere: {},
        parMatiere: {},
        etudiants: []
    };
    
    // Parcourir tous les étudiants
    Object.keys(etudiants).forEach(login => {
        const etudiant = etudiants[login];
        if (etudiant.annee === 'Admin') return; // Ignorer les admins
        
        const { departement, filiere, annee } = etudiant;
        
        // Obtenir les matières de cet étudiant
        let matieres = [];
        try {
            matieres = structure[departement][filiere][annee] || [];
        } catch (e) {
            matieres = [];
        }
        
        // Vérifier l'état de chaque examen
        const examensEtudiant = matieres.map(matiere => {
            const examKey = `${login}_${matiere}`;
            const examenPasse = examensPassés[examKey];
            return {
                matiere: matiere,
                passe: !!examenPasse,
                note: examenPasse ? examenPasse.note : null,
                date: examenPasse ? examenPasse.date : null
            };
        });
        
        const examensPassesCount = examensEtudiant.filter(e => e.passe).length;
        
        dashboard.etudiants.push({
            login: login,
            nom: etudiant.nom,
            prenom: etudiant.prenom,
            departement: departement,
            filiere: filiere,
            annee: annee,
            examens: examensEtudiant,
            progression: matieres.length > 0 ? Math.round((examensPassesCount / matieres.length) * 100) : 0,
            examensPassés: examensPassesCount,
            totalExamens: matieres.length
        });
        
        // Stats par filière
        const keyFiliere = `${filiere} - ${annee}`;
        if (!dashboard.parFiliere[keyFiliere]) {
            dashboard.parFiliere[keyFiliere] = { total: 0, passes: 0 };
        }
        dashboard.parFiliere[keyFiliere].total += matieres.length;
        dashboard.parFiliere[keyFiliere].passes += examensPassesCount;
        
        // Stats par matière
        examensEtudiant.forEach(ex => {
            if (!dashboard.parMatiere[ex.matiere]) {
                dashboard.parMatiere[ex.matiere] = { total: 0, passes: 0, notes: [] };
            }
            dashboard.parMatiere[ex.matiere].total++;
            if (ex.passe) {
                dashboard.parMatiere[ex.matiere].passes++;
                dashboard.parMatiere[ex.matiere].notes.push(ex.note);
            }
        });
    });
    
    // Calculer les moyennes par matière
    Object.keys(dashboard.parMatiere).forEach(matiere => {
        const notes = dashboard.parMatiere[matiere].notes;
        dashboard.parMatiere[matiere].moyenne = notes.length > 0 
            ? Math.round((notes.reduce((a, b) => a + b, 0) / notes.length) * 100) / 100 
            : null;
    });
    
    res.json(dashboard);
});

// API Admin - Obtenir les résultats détaillés d'un étudiant
app.get('/api/admin/etudiant/:login', (req, res) => {
    if (!isAdmin(req)) {
        return res.status(403).json({ error: 'Accès refusé' });
    }
    
    const login = req.params.login;
    const fichierResultat = path.join(__dirname, 'data', 'resultats', `${login.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`);
    
    if (fs.existsSync(fichierResultat)) {
        const resultats = JSON.parse(fs.readFileSync(fichierResultat, 'utf8'));
        res.json(resultats);
    } else {
        res.json({ etudiant: etudiants[login], examens: [] });
    }
});

// API Admin - Obtenir tous les résultats d'examens
app.get('/api/admin/resultats', (req, res) => {
    if (!isAdmin(req)) {
        return res.status(403).json({ error: 'Accès refusé' });
    }
    
    const resultats = [];
    const resultatsDir = path.join(__dirname, 'data', 'resultats');
    
    // Lire tous les fichiers de résultats
    if (fs.existsSync(resultatsDir)) {
        const files = fs.readdirSync(resultatsDir);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                try {
                    const data = JSON.parse(fs.readFileSync(path.join(resultatsDir, file), 'utf8'));
                    if (data.examens && data.examens.length > 0) {
                        data.examens.forEach(exam => {
                            resultats.push({
                                login: data.etudiant ? data.etudiant.login : file.replace('.json', ''),
                                nom: data.etudiant ? data.etudiant.nom : '',
                                prenom: data.etudiant ? data.etudiant.prenom : '',
                                filiere: data.etudiant ? data.etudiant.filiere : '',
                                matiere: exam.matiere,
                                date: exam.date,
                                score: exam.score,
                                total: exam.total,
                                note: exam.note,
                                reponses: exam.reponses || {}
                            });
                        });
                    }
                } catch (e) {
                    console.error('Erreur lecture fichier:', file, e);
                }
            }
        });
    }
    
    // Trier par date décroissante
    resultats.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json(resultats);
});

// API Admin - Exporter les résultats en CSV
app.get('/api/admin/export-csv', (req, res) => {
    if (!isAdmin(req)) {
        return res.status(403).json({ error: 'Accès refusé' });
    }
    
    const csvPath = path.join(__dirname, 'data', 'resultats.csv');
    if (fs.existsSync(csvPath)) {
        res.download(csvPath, 'resultats_examens.csv');
    } else {
        res.status(404).json({ error: 'Aucun résultat disponible' });
    }
});

// API Admin - Obtenir les identifiants des étudiants (pour envoi email)
app.get('/api/admin/credentials', (req, res) => {
    if (!isAdmin(req)) {
        return res.status(403).json({ error: 'Accès refusé' });
    }
    
    const credentials = [];
    const csvPath = path.join(__dirname, 'data', 'etudiants_import.csv');
    
    if (fs.existsSync(csvPath)) {
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.trim().split('\n');
        
        // Ignorer l'en-tête
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(',');
            if (parts.length >= 4) {
                credentials.push({
                    nom: parts[0].trim(),
                    prenom: parts[1].trim(),
                    login: parts[2].trim(),
                    password: parts[3].trim()
                });
            }
        }
    }
    
    res.json(credentials);
});

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
    console.log('Plateforme d\'examens ENSAM Casablanca');
});
