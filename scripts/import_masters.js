const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Lire le fichier CSV des étudiants
const csvPath = path.join(__dirname, '..', 'data', 'etudiants_import.csv');
const outputPath = path.join(__dirname, '..', 'data', 'etudiants.json');

const csvContent = fs.readFileSync(csvPath, 'utf8');
const lines = csvContent.trim().split('\n');

// Ignorer l'en-tête
const header = lines[0];
const dataLines = lines.slice(1);

const etudiants = {};

// Déterminer la filière selon le login
function getFiliere(login) {
    if (login.includes('IDMS')) return 'IDMS';
    if (login.includes('IT')) return 'TI';
    return 'IDMS'; // Par défaut
}

dataLines.forEach(line => {
    const parts = line.split(',');
    if (parts.length >= 4) {
        const nom = parts[0].trim();
        const prenom = parts[1].trim();
        const login = parts[2].trim();
        const password = parts[3].trim();
        
        const hashedPassword = bcrypt.hashSync(password, 10);
        const filiere = getFiliere(login);
        
        etudiants[login] = {
            password: hashedPassword,
            nom: nom,
            prenom: prenom,
            departement: "Génie Electrique",
            filiere: filiere,
            annee: "Master"
        };
        
        console.log(`Importé: ${login} (${nom} ${prenom}) - ${filiere}`);
    }
});

// Ajouter l'utilisateur admin
const adminPassword = bcrypt.hashSync('Admin2026', 10);
etudiants['admin'] = {
    password: adminPassword,
    nom: 'Admin',
    prenom: 'CADProto',
    departement: 'Génie Electrique',
    filiere: 'IDMS',
    annee: 'Admin'
};
console.log('Ajouté: admin (Admin CADProto)');

// Sauvegarder
fs.writeFileSync(outputPath, JSON.stringify(etudiants, null, 2));
console.log(`\n✅ ${Object.keys(etudiants).length} étudiants importés dans ${outputPath}`);
