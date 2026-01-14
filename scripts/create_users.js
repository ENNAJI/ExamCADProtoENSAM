// Script pour créer les utilisateurs avec mots de passe hashés
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Structure des étudiants à créer
// Vous pouvez modifier cette liste avec vos vrais étudiants
const etudiantsData = {
    // GMAA 1ère Année
    "gmaa1_demo": {
        password: "demo123",
        nom: "Démonstration",
        prenom: "Étudiant",
        departement: "Génie Mécanique",
        filiere: "GMAA",
        annee: "1ère Année"
    },
    // Ajoutez vos étudiants ici selon le format:
    // "login": {
    //     password: "motdepasse",
    //     nom: "NOM",
    //     prenom: "Prénom",
    //     departement: "Génie Mécanique" ou "Génie Electrique",
    //     filiere: "GMAA" ou "GSMI" ou "GEM",
    //     annee: "1ère Année" ou "2ème Année" ou "3ème Année"
    // }
};

async function createUsers() {
    const users = {};
    
    for (const [login, data] of Object.entries(etudiantsData)) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        users[login] = {
            password: hashedPassword,
            nom: data.nom,
            prenom: data.prenom,
            departement: data.departement,
            filiere: data.filiere,
            annee: data.annee
        };
        console.log(`Utilisateur créé: ${login}`);
    }
    
    const outputPath = path.join(__dirname, '..', 'data', 'etudiants.json');
    fs.writeFileSync(outputPath, JSON.stringify(users, null, 2));
    console.log(`\nFichier sauvegardé: ${outputPath}`);
    console.log(`Total: ${Object.keys(users).length} utilisateurs`);
}

createUsers().catch(console.error);
