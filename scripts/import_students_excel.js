// Script pour importer les étudiants depuis un fichier Excel (.xlsx)
// Format Excel attendu (colonnes A à G):
// login | password | nom | prenom | departement | filiere | annee

const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function importFromExcel(excelPath) {
    if (!fs.existsSync(excelPath)) {
        console.error(`❌ Fichier non trouvé: ${excelPath}`);
        console.log('\n📋 Format Excel attendu (colonnes A à G):');
        console.log('┌──────────┬──────────┬──────┬────────┬─────────────────┬─────────┬────────────┐');
        console.log('│  login   │ password │ nom  │ prenom │   departement   │ filiere │   annee    │');
        console.log('├──────────┼──────────┼──────┼────────┼─────────────────┼─────────┼────────────┤');
        console.log('│ etud001  │ pass123  │ ALAMI│Mohammed│ Génie Mécanique │  GMAA   │ 1ère Année │');
        console.log('└──────────┴──────────┴──────┴────────┴─────────────────┴─────────┴────────────┘');
        console.log('\nDépartements possibles: "Génie Mécanique", "Génie Electrique"');
        console.log('Filières possibles: "GMAA", "GSMI", "GEM"');
        console.log('Années possibles: "1ère Année", "2ème Année", "3ème Année"');
        return;
    }
    
    console.log(`📖 Lecture du fichier Excel: ${excelPath}`);
    
    // Lire le fichier Excel
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir en JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length < 2) {
        console.error('❌ Le fichier Excel est vide ou ne contient que l\'en-tête');
        return;
    }
    
    // Vérifier l'en-tête
    const header = data[0].map(h => h ? h.toString().toLowerCase().trim() : '');
    const expectedHeaders = ['login', 'password', 'nom', 'prenom', 'departement', 'filiere', 'annee'];
    
    // Trouver les indices des colonnes
    const indices = {};
    expectedHeaders.forEach(h => {
        indices[h] = header.indexOf(h);
    });
    
    // Vérifier que toutes les colonnes sont présentes
    const missingColumns = expectedHeaders.filter(h => indices[h] === -1);
    if (missingColumns.length > 0) {
        console.error(`❌ Colonnes manquantes: ${missingColumns.join(', ')}`);
        console.log('Colonnes trouvées:', header.join(', '));
        return;
    }
    
    const users = {};
    const dataRows = data.slice(1); // Ignorer l'en-tête
    
    console.log(`\n📊 ${dataRows.length} lignes trouvées\n`);
    
    let importCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        
        // Ignorer les lignes vides
        if (!row || row.length === 0 || !row[indices.login]) {
            continue;
        }
        
        const login = row[indices.login]?.toString().trim();
        const password = row[indices.password]?.toString().trim();
        const nom = row[indices.nom]?.toString().trim();
        const prenom = row[indices.prenom]?.toString().trim();
        const departement = row[indices.departement]?.toString().trim();
        const filiere = row[indices.filiere]?.toString().trim();
        const annee = row[indices.annee]?.toString().trim();
        
        // Validation
        if (!login || !password || !nom || !prenom || !departement || !filiere || !annee) {
            console.log(`⚠️  Ligne ${i + 2}: Données incomplètes - ignorée`);
            errorCount++;
            continue;
        }
        
        // Valider le département
        const departementsValides = ['Génie Mécanique', 'Génie Electrique'];
        if (!departementsValides.includes(departement)) {
            console.log(`⚠️  Ligne ${i + 2}: Département invalide "${departement}" - ignorée`);
            errorCount++;
            continue;
        }
        
        // Valider la filière
        const filieresValides = ['GMAA', 'GSMI', 'GEM'];
        if (!filieresValides.includes(filiere)) {
            console.log(`⚠️  Ligne ${i + 2}: Filière invalide "${filiere}" - ignorée`);
            errorCount++;
            continue;
        }
        
        // Valider l'année
        const anneesValides = ['1ère Année', '2ème Année', '3ème Année'];
        if (!anneesValides.includes(annee)) {
            console.log(`⚠️  Ligne ${i + 2}: Année invalide "${annee}" - ignorée`);
            errorCount++;
            continue;
        }
        
        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);
        
        users[login] = {
            password: hashedPassword,
            nom: nom,
            prenom: prenom,
            departement: departement,
            filiere: filiere,
            annee: annee
        };
        
        console.log(`✅ ${login} - ${prenom} ${nom} (${filiere} ${annee})`);
        importCount++;
    }
    
    // Charger les utilisateurs existants et fusionner
    const outputPath = path.join(__dirname, '..', 'data', 'etudiants.json');
    let existingUsers = {};
    if (fs.existsSync(outputPath)) {
        existingUsers = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    }
    
    const mergedUsers = { ...existingUsers, ...users };
    fs.writeFileSync(outputPath, JSON.stringify(mergedUsers, null, 2));
    
    console.log('\n' + '═'.repeat(50));
    console.log(`✅ Importation terminée!`);
    console.log(`   📥 Nouveaux utilisateurs: ${importCount}`);
    console.log(`   ⚠️  Erreurs/ignorés: ${errorCount}`);
    console.log(`   📊 Total utilisateurs: ${Object.keys(mergedUsers).length}`);
    console.log(`   💾 Fichier: ${outputPath}`);
    console.log('═'.repeat(50));
}

// Utilisation: node import_students_excel.js chemin/vers/etudiants.xlsx
const excelPath = process.argv[2];

if (!excelPath) {
    console.log('📋 Usage: node import_students_excel.js <chemin_fichier_excel.xlsx>');
    console.log('\nExemple: node import_students_excel.js C:\\Users\\Admin\\etudiants.xlsx');
    console.log('\n📋 Format Excel attendu (colonnes A à G):');
    console.log('┌──────────┬──────────┬──────┬────────┬─────────────────┬─────────┬────────────┐');
    console.log('│  login   │ password │ nom  │ prenom │   departement   │ filiere │   annee    │');
    console.log('├──────────┼──────────┼──────┼────────┼─────────────────┼─────────┼────────────┤');
    console.log('│ etud001  │ pass123  │ ALAMI│Mohammed│ Génie Mécanique │  GMAA   │ 1ère Année │');
    console.log('└──────────┴──────────┴──────┴────────┴─────────────────┴─────────┴────────────┘');
} else {
    importFromExcel(excelPath).catch(console.error);
}
