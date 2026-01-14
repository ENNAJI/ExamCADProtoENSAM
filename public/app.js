// Application JavaScript pour la plateforme d'examens
class ExamApp {
    constructor() {
        this.user = null;
        this.currentExam = null;
        this.timerInterval = null;
        this.timeRemaining = 0;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.checkSession();
    }
    
    bindEvents() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });
        
        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });
        
        // Submit exam
        document.getElementById('submit-exam').addEventListener('click', () => {
            this.showConfirmModal();
        });
        
        // Modal buttons
        document.getElementById('modal-cancel').addEventListener('click', () => {
            this.hideConfirmModal();
        });
        
        document.getElementById('modal-confirm').addEventListener('click', () => {
            this.hideConfirmModal();
            this.submitExam();
        });
        
        // Back to selection
        document.getElementById('back-to-selection').addEventListener('click', () => {
            this.showPage('selection-page');
            this.loadMatieres();
        });
    }
    
    async checkSession() {
        try {
            const response = await fetch('/api/session');
            const data = await response.json();
            
            if (data.loggedIn) {
                this.user = data.user;
                this.showSelectionPage();
            }
        } catch (error) {
            console.error('Erreur vérification session:', error);
        }
    }
    
    async login() {
        const login = document.getElementById('login').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.user = data.user;
                errorDiv.classList.remove('show');
                this.showSelectionPage();
            } else {
                errorDiv.textContent = data.error;
                errorDiv.classList.add('show');
            }
        } catch (error) {
            errorDiv.textContent = 'Erreur de connexion au serveur';
            errorDiv.classList.add('show');
        }
    }
    
    async logout() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            this.user = null;
            this.showPage('login-page');
            document.getElementById('login-form').reset();
        } catch (error) {
            console.error('Erreur déconnexion:', error);
        }
    }
    
    showSelectionPage() {
        document.getElementById('user-name').textContent = `${this.user.prenom} ${this.user.nom}`;
        document.getElementById('welcome-name').textContent = this.user.prenom;
        document.getElementById('detail-dept').textContent = this.user.departement;
        document.getElementById('detail-filiere').textContent = this.user.filiere;
        document.getElementById('detail-annee').textContent = this.user.annee;
        
        this.loadMatieres();
        this.showPage('selection-page');
    }
    
    async loadMatieres() {
        try {
            const response = await fetch('/api/matieres');
            const matieres = await response.json();
            
            const container = document.getElementById('matieres-list');
            container.innerHTML = '';
            
            if (matieres.length === 0) {
                container.innerHTML = '<p style="color: #666;">Aucun examen disponible pour votre filière.</p>';
                return;
            }
            
            matieres.forEach(matiere => {
                const card = document.createElement('div');
                card.className = `matiere-card ${matiere.dejaPasse ? 'disabled' : ''}`;
                card.innerHTML = `
                    <h4><i class="fas fa-file-alt"></i> ${matiere.nom}</h4>
                    <p class="status ${matiere.dejaPasse ? 'passed' : 'available'}">
                        <i class="fas ${matiere.dejaPasse ? 'fa-check-circle' : 'fa-clock'}"></i>
                        ${matiere.dejaPasse ? 'Examen déjà passé' : 'Disponible - 30 minutes'}
                    </p>
                `;
                
                if (!matiere.dejaPasse) {
                    card.addEventListener('click', () => {
                        this.startExam(matiere.nom);
                    });
                }
                
                container.appendChild(card);
            });
        } catch (error) {
            console.error('Erreur chargement matières:', error);
        }
    }
    
    async startExam(matiere) {
        try {
            const response = await fetch('/api/examen/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matiere })
            });
            
            const data = await response.json();
            
            if (data.error) {
                alert(data.error);
                return;
            }
            
            this.currentExam = {
                matiere: matiere,
                questions: data.questions,
                duree: data.duree
            };
            
            this.renderExam();
            this.startTimer(data.duree);
            this.showPage('exam-page');
            
            document.getElementById('exam-title').innerHTML = 
                `<i class="fas fa-file-alt"></i> ${matiere}`;
                
        } catch (error) {
            console.error('Erreur démarrage examen:', error);
            alert('Erreur lors du démarrage de l\'examen');
        }
    }
    
    renderExam() {
        const container = document.getElementById('questions-container');
        container.innerHTML = '';
        
        this.currentExam.questions.forEach((q, index) => {
            const card = document.createElement('div');
            card.className = 'question-card';
            card.id = `question-${q.id}`;
            
            let typeClass = 'qcm';
            let typeLabel = 'QCM';
            if (q.type === 'VRAI_FAUX') {
                typeClass = 'vrai-faux';
                typeLabel = 'Vrai/Faux';
            } else if (q.type === 'REDACTION') {
                typeClass = 'redaction';
                typeLabel = 'Rédaction';
            }
            
            let optionsHtml = '';
            if (q.type === 'QCM' && q.options) {
                optionsHtml = `
                    <ul class="options-list">
                        ${q.options.map((opt, i) => `
                            <li class="option-item">
                                <label>
                                    <input type="radio" name="q${q.id}" value="${opt.charAt(0)}">
                                    <span>${opt}</span>
                                </label>
                            </li>
                        `).join('')}
                    </ul>
                `;
            } else if (q.type === 'VRAI_FAUX') {
                optionsHtml = `
                    <ul class="options-list">
                        <li class="option-item">
                            <label>
                                <input type="radio" name="q${q.id}" value="VRAI">
                                <span>VRAI</span>
                            </label>
                        </li>
                        <li class="option-item">
                            <label>
                                <input type="radio" name="q${q.id}" value="FAUX">
                                <span>FAUX</span>
                            </label>
                        </li>
                    </ul>
                `;
            } else if (q.type === 'REDACTION') {
                optionsHtml = `
                    <textarea class="text-answer" name="q${q.id}" 
                        placeholder="Rédigez votre réponse ici..."></textarea>
                `;
            }
            
            card.innerHTML = `
                <div class="question-header">
                    <span class="question-number">Question ${q.numero}/${this.currentExam.questions.length}</span>
                    <span class="question-type ${typeClass}">${typeLabel}</span>
                </div>
                <p class="question-text">${q.question}</p>
                ${optionsHtml}
            `;
            
            container.appendChild(card);
        });
        
        // Mettre à jour la progression quand on répond
        container.addEventListener('change', () => this.updateProgress());
        container.addEventListener('input', () => this.updateProgress());
    }
    
    updateProgress() {
        const total = this.currentExam.questions.length;
        let answered = 0;
        
        this.currentExam.questions.forEach(q => {
            if (q.type === 'REDACTION') {
                const textarea = document.querySelector(`textarea[name="q${q.id}"]`);
                if (textarea && textarea.value.trim()) answered++;
            } else {
                const selected = document.querySelector(`input[name="q${q.id}"]:checked`);
                if (selected) answered++;
            }
        });
        
        const percent = (answered / total) * 100;
        document.getElementById('progress-fill').style.width = `${percent}%`;
    }
    
    startTimer(seconds) {
        this.timeRemaining = seconds;
        const timerEl = document.getElementById('timer');
        const timerContainer = document.querySelector('.timer-container');
        
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            
            const minutes = Math.floor(this.timeRemaining / 60);
            const secs = this.timeRemaining % 60;
            timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            
            // Alertes visuelles
            if (this.timeRemaining <= 60) {
                timerContainer.classList.remove('warning');
                timerContainer.classList.add('danger');
            } else if (this.timeRemaining <= 300) {
                timerContainer.classList.add('warning');
            }
            
            if (this.timeRemaining <= 0) {
                clearInterval(this.timerInterval);
                alert('Temps écoulé ! Votre examen va être soumis automatiquement.');
                this.submitExam();
            }
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        document.querySelector('.timer-container').classList.remove('warning', 'danger');
    }
    
    showConfirmModal() {
        document.getElementById('confirm-modal').classList.add('show');
    }
    
    hideConfirmModal() {
        document.getElementById('confirm-modal').classList.remove('show');
    }
    
    async submitExam() {
        this.stopTimer();
        
        // Collecter les réponses
        const reponses = {};
        this.currentExam.questions.forEach(q => {
            if (q.type === 'REDACTION') {
                const textarea = document.querySelector(`textarea[name="q${q.id}"]`);
                reponses[q.id] = textarea ? textarea.value : '';
            } else {
                const selected = document.querySelector(`input[name="q${q.id}"]:checked`);
                reponses[q.id] = selected ? selected.value : '';
            }
        });
        
        try {
            const response = await fetch('/api/examen/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reponses })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showResults(data);
            } else {
                alert(data.error || 'Erreur lors de la soumission');
            }
        } catch (error) {
            console.error('Erreur soumission:', error);
            alert('Erreur lors de la soumission de l\'examen');
        }
    }
    
    showResults(data) {
        // Afficher la note
        const scoreCircle = document.getElementById('score-circle');
        document.getElementById('score-value').textContent = data.note.toFixed(2);
        document.getElementById('correct-count').textContent = data.score;
        document.getElementById('total-count').textContent = data.total;
        
        // Classe selon la note
        scoreCircle.className = 'score-circle';
        if (data.note >= 16) {
            scoreCircle.classList.add('excellent');
            document.getElementById('results-message').textContent = 'Excellent travail !';
        } else if (data.note >= 12) {
            scoreCircle.classList.add('good');
            document.getElementById('results-message').textContent = 'Bon travail !';
        } else if (data.note >= 10) {
            scoreCircle.classList.add('average');
            document.getElementById('results-message').textContent = 'Passable, continuez vos efforts.';
        } else {
            scoreCircle.classList.add('poor');
            document.getElementById('results-message').textContent = 'Des révisions sont nécessaires.';
        }
        
        // Afficher les corrections
        const correctionsContainer = document.getElementById('corrections-list');
        correctionsContainer.innerHTML = '';
        
        data.corrections.forEach(c => {
            const item = document.createElement('div');
            item.className = `correction-item ${c.correct ? 'correct' : 'incorrect'}`;
            item.innerHTML = `
                <p class="correction-question">
                    <i class="fas ${c.correct ? 'fa-check' : 'fa-times'}"></i>
                    Q${c.numero}: ${c.question}
                </p>
                <div class="correction-answer">
                    <p>Votre réponse: <strong>${c.reponseEtudiant || '(Non répondu)'}</strong></p>
                    <p>Réponse correcte: <strong>${c.reponseCorrecte}</strong></p>
                </div>
            `;
            correctionsContainer.appendChild(item);
        });
        
        this.showPage('results-page');
    }
    
    showPage(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
    }
}

// Initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ExamApp();
});
