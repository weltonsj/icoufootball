/**
 * chat.js
 * Template do chat - SEM CONTEÚDO ESTÁTICO para evitar FOUC
 * Todo o conteúdo é renderizado dinamicamente após carregamento dos dados
 * COMPORTAMENTO WHATSAPP: Em mobile, lista de conversas primeiro
 */
export const chat = {
    name: "chat",
    className: "chat-content",
    content: `
        <aside class="chat-sidebar card-section">
            <h2>Conversas</h2>
            <div class="search-chat">
                <input type="text" placeholder="Buscar Conversa..." disabled>
                <i class="fas fa-search"></i>
            </div>
            <!-- Skeleton loader para conversas - substituído dinamicamente -->
            <div class="conversation-list">
                <div class="skeleton-loader" style="padding: 20px; text-align: center; color: #AAA;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 1.5em; margin-bottom: 10px;"></i>
                    <p style="margin: 0; font-size: 0.9em;">Carregando conversas...</p>
                </div>
            </div>
        </aside>

        <section class="chat-main card-section">
            <!-- Header oculto por padrão - exibido após selecionar conversa -->
            <div class="chat-header">
                <!-- Botão voltar para lista (visível apenas em mobile) -->
                <button class="btn-voltar-conversas" id="btn-voltar-conversas" title="Voltar para conversas">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <div class="chat-recipient-info" style="display: none;">
                    <img src="" alt="Avatar" class="avatar-medium">
                    <div class="recipient-details" style="display: none;">
                        <span class="recipient-name"></span>
                        <span class="recipient-status"></span>
                    </div>
                </div>
                <div class="chat-actions">
                    <i class="fas fa-search"></i>
                    <i class="fas fa-video"></i>
                    <i class="fas fa-phone-alt"></i>
                    <i class="fas fa-ellipsis-v"></i>
                </div>
            </div>

            <!-- Área de mensagens vazia - preenchida após selecionar conversa -->
            <div class="chat-messages">
                <div class="empty-chat" style="
                    display: flex; flex-direction: column; align-items: center; 
                    justify-content: center; height: 100%; color: #AAA; text-align: center;
                ">
                    <i class="fas fa-comment-dots" style="font-size: 4em; margin-bottom: 20px; opacity: 0.5;"></i>
                    <h3 style="margin-bottom: 10px;">Nenhuma conversa selecionada</h3>
                    <p>Selecione uma conversa ou inicie um novo chat com um amigo.</p>
                </div>
            </div>

            <!-- Input oculto até selecionar conversa -->
            <div class="chat-input-area">
                <div class="chat-input-container" style="display: none;">
                    <input type="file" id="chat-image-input" accept="image/*" hidden>
                    <button class="btn-attach" id="btn-attach" title="Enviar imagem">
                        <i class="fas fa-image"></i>
                    </button>
                    <input type="text" id="chat-message-input" placeholder="Digite uma mensagem..." autocomplete="off">
                    <button class="btn-send" id="btn-send">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </section>
    `
};