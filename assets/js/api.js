import { API_CONFIG, SPORTS_DB_BASE_URL } from './config/api-config.js';

/**
 * assets/js/api.js
 * Responsável por comunicações com APIs externas (ImgBB, TheSportsDB/API-Football)
 */

// Configuração das chaves (Idealmente, mova isso para config/api-config.js se possível)
const API_CONFIG = {
    IMGBB_KEY: API_CONFIG.IMGBB_KEY, // Pegue em https://api.imgbb.com/
    THE_SPORTS_DB_BASE_URL: SPORTS_DB_BASE_URL, // API Gratuita v3
};

/**
 * Faz o upload de uma imagem para o ImgBB
 * @param {File} fileObject - O arquivo de imagem vindo do input type="file"
 * @returns {Promise<string>} - A URL da imagem hospedada
 */
export async function uploadImageToImgBB(fileObject) {
    if (!fileObject) throw new Error("Nenhum arquivo selecionado.");

    // Validação simples de tamanho (2MB)
    if (fileObject.size > 2 * 1024 * 1024) {
        throw new Error("A imagem deve ter no máximo 2MB.");
    }

    const formData = new FormData();
    formData.append('image', fileObject);
    formData.append('key', API_CONFIG.IMGBB_KEY);

    try {
        const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            return data.data.url; // Retorna a URL direta da imagem
        } else {
            throw new Error(data.error.message || "Erro ao fazer upload da imagem.");
        }
    } catch (error) {
        console.error("Erro no upload:", error);
        throw error;
    }
}

/**
 * Busca times e escudos na API do TheSportsDB
 * @param {string} teamName - Nome do time para pesquisar
 * @returns {Promise<Array>} - Lista de objetos com dados do time
 */
export async function searchTeamLogo(teamName) {
    if (!teamName || teamName.length < 3) return [];

    try {
        // EncodeURI para garantir que espaços e acentos não quebrem a URL
        const url = `${API_CONFIG.THE_SPORTS_DB_BASE_URL}/searchteams.php?t=${encodeURIComponent(teamName)}`;
 
        const response = await fetch(url);
        const data = await response.json();

        if (data.teams) {
            // Mapeia apenas o necessário para o app
            return data.teams.map(team => ({
                id: team.idTeam,
                name: team.strTeam,
                logo: team.strTeamBadge, // URL do logo
                league: team.strLeague
            }));
        }
        
        return [];
    } catch (error) {
        console.error("Erro ao buscar times:", error);
        return []; // Retorna array vazio em caso de erro para não quebrar o front
    }
}