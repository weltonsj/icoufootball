import { renderPages, setupRouter } from "./routes/route.js";
import { initAuthManager } from "./utils/authManager.js";

async function startApp() {
	// Adiciona classe de carregamento para prevenir FOUC
	document.body.classList.add('app-loading');

	// Preserva rota atual ao recarregar
	const currentRoute = window.location.hash.replace("#", "") || "homepage";

	// Inicializa autenticação
	await initAuthManager();

	// Renderiza página atual
	await renderPages(currentRoute);

	// Configura roteamento
	setupRouter();

	// Remove classe de carregamento após inicialização completa
	document.body.classList.remove('app-loading');
}

document.addEventListener("DOMContentLoaded", startApp);
