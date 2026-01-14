// Script pour importer les étudiants depuis un fichier CSV
// Format CSV attendu: login,password,nom,prenom,departement,filiere,annee
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function importFromCSV(csvPath) {
    if (!fs.existsSync(csvPath)) {
        console.error(`Fichier non trouvé: ${csvPath}`);
        console.log('\nFormat CSV attendu:');
        console.log('login,password,nom,prenom,departement,filiere,annee');
        console.log('exemple: etudiant1,pass123,ALAMI,Mohammed,Génie Mécanique,GMAA,1ère Année');
        return;
    }
    
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    
    // Ignorer l'en-tête
    const dataLines = lines.slice(1);
    
    const users = {};
    
    for (const line of dataLines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 7) continue;
        
        const [login, password, nom, prenom, departement, filiere, annee] = parts;
        
        const hashedPassword = await bcrypt.hash(password, 10);
        users[login] = {
            password: hashedPassword,
            nom: nom,
            prenom: prenom,
            departement: departement,
            filiere: filiere,
            annee: annee
        };
        console.log(`Importé: ${login} - ${prenom} ${nom} (${filiere} ${annee})`);
    }
    
    const outputPath = path.join(__dirname, '..', 'data', 'etudiants.json');
    
    // Charger les utilisateurs existants et fusionner
    let existingUsers = {};
    if (fs.existsSync(outputPath)) {
        existingUsers = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    }
    
    const mergedUsers = { ...existingUsers, ...users };
    fs.writeFileSync(outputPath, JSON.stringify(mergedUsers, null, 2));
    
    console.log(`\nFichier sauvegardé: ${outputPath}`);
    console.log(`Nouveaux utilisateurs: ${Object.keys(users).length}`);
    console.log(`Total utilisateurs: ${Object.keys(mergedUsers).length}`);
}

// Utilisation: node import_students_csv.js chemin/vers/etudiants.csv
const csvPath = process.argv[2] || path.join(__dirname, 'etudiants.csv');
importFromCSV(csvPath).catch(console.error);
