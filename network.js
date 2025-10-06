/**
 * Module réseau centralisé pour la gestion des données du jeu Loup-Garou
 * Améliore la communication entre Scores.html, groupe.html et Esprit.html
 */

class NetworkManager {
    constructor() {
        this.cache = null;
        this.cacheTimestamp = null;
        this.CACHE_DURATION = 5000; // 5 secondes
        this.updateChannel = new BroadcastChannel('scores_update');
        this.pendingSave = null;
        this.MAX_RETRIES = 3;
        this.RETRY_DELAY = 1000; // 1 seconde

        // Écouter les mises à jour des autres onglets
        this.updateChannel.onmessage = (event) => {
            if (event.data === 'refresh') {
                this.invalidateCache();
                if (this.onRefreshCallback) {
                    this.onRefreshCallback();
                }
            }
        };
    }

    /**
     * Définit un callback à exécuter lors d'une mise à jour depuis un autre onglet
     */
    onRefresh(callback) {
        this.onRefreshCallback = callback;
    }

    /**
     * Invalide le cache
     */
    invalidateCache() {
        this.cache = null;
        this.cacheTimestamp = null;
    }

    /**
     * Vérifie si le cache est encore valide
     */
    isCacheValid() {
        if (!this.cache || !this.cacheTimestamp) return false;
        return (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION;
    }

    /**
     * Récupère les données des groupes avec cache et retry logic
     */
    async getGroupsData(forceRefresh = false) {
        // Utiliser le cache si valide et pas de forceRefresh
        if (!forceRefresh && this.isCacheValid()) {
            console.log('📦 Utilisation du cache');
            return this.cache;
        }

        let lastError;
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                console.log(`🔄 Chargement des données (tentative ${attempt}/${this.MAX_RETRIES})`);

                // Utiliser la fonction Netlify pour obtenir les infos du repo
                const repoInfoRes = await fetch('/.netlify/functions/getRepoInfo');
                if (!repoInfoRes.ok) {
                    throw new Error('Impossible de charger la configuration du dépôt.');
                }
                const { owner, repo } = await repoInfoRes.json();

                const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/scores-loup-garou.json`;
                const response = await fetch(`${apiUrl}?ref=main&t=${Date.now()}`, {
                    headers: { 'Accept': 'application/vnd.github.v3.raw' },
                    cache: 'no-store'
                });

                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }

                const data = await response.json();

                // Mettre à jour le cache
                this.cache = data;
                this.cacheTimestamp = Date.now();

                console.log('✅ Données chargées avec succès');
                return data;

            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Échec tentative ${attempt}:`, error.message);

                // Attendre avant de réessayer (sauf à la dernière tentative)
                if (attempt < this.MAX_RETRIES) {
                    await this.delay(this.RETRY_DELAY * attempt);
                }
            }
        }

        // Si toutes les tentatives ont échoué
        throw new Error(`Échec du chargement après ${this.MAX_RETRIES} tentatives: ${lastError.message}`);
    }

    /**
     * Sauvegarde les données avec anti-duplication et retry logic
     */
    async saveGroupsData(data) {
        // Si une sauvegarde est déjà en cours, attendre qu'elle se termine
        if (this.pendingSave) {
            console.log('⏳ Sauvegarde déjà en cours, attente...');
            await this.pendingSave;
        }

        // Créer une nouvelle promesse de sauvegarde
        this.pendingSave = this._performSave(data);

        try {
            await this.pendingSave;
        } finally {
            this.pendingSave = null;
        }
    }

    /**
     * Effectue la sauvegarde réelle avec retry logic
     */
    async _performSave(data) {
        let lastError;

        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                console.log(`💾 Sauvegarde des données (tentative ${attempt}/${this.MAX_RETRIES})`);

                const response = await fetch('/.netlify/functions/saveScores', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Erreur de sauvegarde: ${errorText}`);
                }

                // Mettre à jour le cache local
                this.cache = data;
                this.cacheTimestamp = Date.now();

                // Notifier les autres onglets
                this.notifyUpdate();

                console.log('✅ Sauvegarde réussie');
                return;

            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Échec sauvegarde tentative ${attempt}:`, error.message);

                if (attempt < this.MAX_RETRIES) {
                    await this.delay(this.RETRY_DELAY * attempt);
                }
            }
        }

        throw new Error(`Échec de la sauvegarde après ${this.MAX_RETRIES} tentatives: ${lastError.message}`);
    }

    /**
     * Notifie les autres onglets d'une mise à jour
     */
    notifyUpdate() {
        this.updateChannel.postMessage('refresh');
    }

    /**
     * Fonction utilitaire pour créer un délai
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Récupère les données d'un groupe spécifique
     */
    async getGroupData(groupName, forceRefresh = false) {
        const allGroups = await this.getGroupsData(forceRefresh);
        return allGroups[groupName] || null;
    }

    /**
     * Met à jour les données d'un groupe spécifique
     */
    async updateGroupData(groupName, updateFunction) {
        const allGroups = await this.getGroupsData();

        if (!allGroups[groupName]) {
            throw new Error(`Groupe "${groupName}" non trouvé`);
        }

        // Appliquer la fonction de mise à jour
        updateFunction(allGroups[groupName]);

        // Sauvegarder
        await this.saveGroupsData(allGroups);

        return allGroups[groupName];
    }

    /**
     * Enregistre une relecture audio pour un esprit
     */
    async recordReplay(groupName, spiritId) {
        return await this.updateGroupData(groupName, (group) => {
            if (!group.data) group.data = {};
            if (!group.data.replays) group.data.replays = {};
            group.data.replays[spiritId] = (group.data.replays[spiritId] || 0) + 1;
        });
    }

    /**
     * Enregistre une réponse à une énigme
     */
    async saveEnigmaAnswer(groupName, spiritId, answer) {
        return await this.updateGroupData(groupName, (group) => {
            if (!group.data) group.data = {};
            if (!group.data.enigmaAnswers) group.data.enigmaAnswers = {};
            group.data.enigmaAnswers[spiritId] = answer;
        });
    }

    /**
     * Marque une énigme comme vue
     */
    async markEnigmaAsViewed(groupName, spiritId) {
        return await this.updateGroupData(groupName, (group) => {
            if (!group.data) group.data = {};
            if (!group.data.enigmaViewed) group.data.enigmaViewed = {};
            group.data.enigmaViewed[spiritId] = true;
        });
    }

    /**
     * Obtient le nombre de relectures pour un esprit
     */
    async getReplayCount(groupName, spiritId) {
        const group = await this.getGroupData(groupName);
        return group?.data?.replays?.[spiritId] || 0;
    }

    /**
     * Vérifie si une énigme a une réponse
     */
    async hasEnigmaAnswer(groupName, spiritId) {
        const group = await this.getGroupData(groupName);
        return !!(group?.data?.enigmaAnswers?.[spiritId]);
    }

    /**
     * Nettoie les ressources
     */
    cleanup() {
        if (this.updateChannel) {
            this.updateChannel.close();
        }
    }
}

// Instance singleton
const networkManager = new NetworkManager();

// Nettoyer lors du déchargement de la page
window.addEventListener('beforeunload', () => {
    networkManager.cleanup();
});
