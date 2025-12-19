/**
 * src/services/teamsService.js
 * Serviço para times disponíveis no EA Sports FC 25
 */

// Lista de times principais do EA Sports FC 25 (Brasileirão e times populares)
const FC25_TEAMS = [
    // Brasileirão Série A 2024/2025
    { id: 'atletico-mg', name: 'Atlético Mineiro', badge: 'https://cdn.sofifa.net/meta/team/7310/120.png', league: 'Brasileirão' },
    { id: 'atletico-pr', name: 'Athletico Paranaense', badge: 'https://cdn.sofifa.net/meta/team/112771/120.png', league: 'Brasileirão' },
    { id: 'bahia', name: 'Bahia', badge: 'https://cdn.sofifa.net/meta/team/100088/120.png', league: 'Brasileirão' },
    { id: 'botafogo', name: 'Botafogo', badge: 'https://cdn.sofifa.net/meta/team/7307/120.png', league: 'Brasileirão' },
    { id: 'bragantino', name: 'RB Bragantino', badge: 'https://cdn.sofifa.net/meta/team/113353/120.png', league: 'Brasileirão' },
    { id: 'corinthians', name: 'Corinthians', badge: 'https://cdn.sofifa.net/meta/team/7304/120.png', league: 'Brasileirão' },
    { id: 'criciuma', name: 'Criciúma', badge: 'https://cdn.sofifa.net/meta/team/111979/120.png', league: 'Brasileirão' },
    { id: 'cruzeiro', name: 'Cruzeiro', badge: 'https://cdn.sofifa.net/meta/team/7308/120.png', league: 'Brasileirão' },
    { id: 'cuiaba', name: 'Cuiabá', badge: 'https://cdn.sofifa.net/meta/team/112266/120.png', league: 'Brasileirão' },
    { id: 'flamengo', name: 'Flamengo', badge: 'https://cdn.sofifa.net/meta/team/7300/120.png', league: 'Brasileirão' },
    { id: 'fluminense', name: 'Fluminense', badge: 'https://cdn.sofifa.net/meta/team/7306/120.png', league: 'Brasileirão' },
    { id: 'fortaleza', name: 'Fortaleza', badge: 'https://cdn.sofifa.net/meta/team/113354/120.png', league: 'Brasileirão' },
    { id: 'gremio', name: 'Grêmio', badge: 'https://cdn.sofifa.net/meta/team/7301/120.png', league: 'Brasileirão' },
    { id: 'internacional', name: 'Internacional', badge: 'https://cdn.sofifa.net/meta/team/7302/120.png', league: 'Brasileirão' },
    { id: 'juventude', name: 'Juventude', badge: 'https://cdn.sofifa.net/meta/team/112079/120.png', league: 'Brasileirão' },
    { id: 'palmeiras', name: 'Palmeiras', badge: 'https://cdn.sofifa.net/meta/team/7303/120.png', league: 'Brasileirão' },
    { id: 'santos', name: 'Santos', badge: 'https://cdn.sofifa.net/meta/team/7305/120.png', league: 'Brasileirão' },
    { id: 'sao-paulo', name: 'São Paulo', badge: 'https://cdn.sofifa.net/meta/team/7309/120.png', league: 'Brasileirão' },
    { id: 'vasco', name: 'Vasco da Gama', badge: 'https://cdn.sofifa.net/meta/team/111560/120.png', league: 'Brasileirão' },
    { id: 'vitoria', name: 'Vitória', badge: 'https://cdn.sofifa.net/meta/team/112078/120.png', league: 'Brasileirão' },
    
    // Times Europeus Populares (Top 20 mais usados no FC25)
    { id: 'real-madrid', name: 'Real Madrid', badge: 'https://cdn.sofifa.net/meta/team/243/120.png', league: 'La Liga' },
    { id: 'barcelona', name: 'Barcelona', badge: 'https://cdn.sofifa.net/meta/team/241/120.png', league: 'La Liga' },
    { id: 'man-city', name: 'Manchester City', badge: 'https://cdn.sofifa.net/meta/team/10/120.png', league: 'Premier League' },
    { id: 'liverpool', name: 'Liverpool', badge: 'https://cdn.sofifa.net/meta/team/9/120.png', league: 'Premier League' },
    { id: 'bayern', name: 'Bayern München', badge: 'https://cdn.sofifa.net/meta/team/21/120.png', league: 'Bundesliga' },
    { id: 'psg', name: 'Paris Saint-Germain', badge: 'https://cdn.sofifa.net/meta/team/73/120.png', league: 'Ligue 1' },
    { id: 'inter', name: 'Inter Milan', badge: 'https://cdn.sofifa.net/meta/team/44/120.png', league: 'Serie A' },
    { id: 'milan', name: 'AC Milan', badge: 'https://cdn.sofifa.net/meta/team/47/120.png', league: 'Serie A' },
    { id: 'juventus', name: 'Juventus', badge: 'https://cdn.sofifa.net/meta/team/45/120.png', league: 'Serie A' },
    { id: 'atletico-madrid', name: 'Atlético Madrid', badge: 'https://cdn.sofifa.net/meta/team/240/120.png', league: 'La Liga' },
    { id: 'chelsea', name: 'Chelsea', badge: 'https://cdn.sofifa.net/meta/team/5/120.png', league: 'Premier League' },
    { id: 'arsenal', name: 'Arsenal', badge: 'https://cdn.sofifa.net/meta/team/1/120.png', league: 'Premier League' },
    { id: 'man-united', name: 'Manchester United', badge: 'https://cdn.sofifa.net/meta/team/11/120.png', league: 'Premier League' },
    { id: 'tottenham', name: 'Tottenham', badge: 'https://cdn.sofifa.net/meta/team/18/120.png', league: 'Premier League' },
    { id: 'dortmund', name: 'Borussia Dortmund', badge: 'https://cdn.sofifa.net/meta/team/22/120.png', league: 'Bundesliga' }
];

// Cache de times
let cachedTeams = null;

/**
 * Retorna todos os times do FC25
 * @returns {Promise<Array>} Array de times com id, nome e badge
 */
export async function getBrazilianTeams() {
    // Se já temos cache, retorna direto
    if (cachedTeams) {
        return cachedTeams;
    }

    try {
        // Ordena alfabeticamente
        cachedTeams = [...FC25_TEAMS].sort((a, b) => a.name.localeCompare(b.name));
        return cachedTeams;
    } catch (error) {
        console.error('Erro ao carregar times:', error);
        return [];
    }
}

/**
 * Busca um time específico pelo ID
 * @param {string} teamId - ID do time
 * @returns {Promise<Object|null>} Objeto do time ou null
 */
export async function getTeamById(teamId) {
    if (!teamId) return null;

    const teams = await getBrazilianTeams();
    return teams.find(team => team.id === teamId) || null;
}

/**
 * Limpa o cache de times (útil para testes)
 */
export function clearTeamsCache() {
    cachedTeams = null;
}
