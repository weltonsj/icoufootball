/**
 * Audio Manager - Controla a reprodução de áudio/música de fundo do sistema
 * Persiste estado em localStorage e fornece controle visual via ícone SVG
 * Suporta Playlist contínua com persistência de posição e tempo
 */

const AUDIO_KEY = 'icoufootball_audio_enabled';
const AUDIO_VOLUME_KEY = 'icoufootball_audio_volume';
const AUDIO_TRACK_INDEX_KEY = 'icoufootball_audio_track_index';
const AUDIO_CURRENT_TIME_KEY = 'icoufootball_audio_current_time';

// Estado global do áudio
let audioState = {
    enabled: false,
    volume: 0.3,
    audioElement: null,
    currentTrackIndex: 0,
    isUserInteracted: false
};

// Playlist de músicas de fundo
const PLAYLIST = [
    'https://github.com/weltonsj/tracks/raw/refs/heads/main/FILE0000.mp3',
    'https://github.com/weltonsj/tracks/raw/refs/heads/main/FILE0001.mp3',
    'https://github.com/weltonsj/tracks/raw/refs/heads/main/FILE0014.mp3',
    'https://github.com/weltonsj/tracks/raw/refs/heads/main/FILE0015.mp3'
];

/**
 * Obtém o estado completo do áudio do localStorage
 */
function getAudioState() {
    try {
        const savedEnabled = localStorage.getItem(AUDIO_KEY);
        const savedVolume = localStorage.getItem(AUDIO_VOLUME_KEY);
        const savedTrackIndex = localStorage.getItem(AUDIO_TRACK_INDEX_KEY);
        const savedCurrentTime = localStorage.getItem(AUDIO_CURRENT_TIME_KEY);
        
        return {
            enabled: savedEnabled === 'true',
            volume: savedVolume ? parseFloat(savedVolume) : 0.3,
            trackIndex: savedTrackIndex ? parseInt(savedTrackIndex, 10) : 0,
            currentTime: savedCurrentTime ? parseFloat(savedCurrentTime) : 0
        };
    } catch (e) {
        console.error('Erro ao ler estado do áudio:', e);
        return { enabled: false, volume: 0.3, trackIndex: 0, currentTime: 0 };
    }
}

/**
 * Salva o estado completo do áudio no localStorage
 */
function saveAudioState(enabled, volume, trackIndex, currentTime) {
    try {
        localStorage.setItem(AUDIO_KEY, enabled.toString());
        localStorage.setItem(AUDIO_VOLUME_KEY, volume.toString());
        localStorage.setItem(AUDIO_TRACK_INDEX_KEY, trackIndex.toString());
        localStorage.setItem(AUDIO_CURRENT_TIME_KEY, currentTime.toString());
    } catch (e) {
        console.error('Erro ao salvar estado do áudio:', e);
    }
}

/**
 * Salva apenas o tempo atual (chamado frequentemente)
 */
function saveCurrentTime(currentTime) {
    try {
        localStorage.setItem(AUDIO_CURRENT_TIME_KEY, currentTime.toString());
    } catch (e) {
        // Silencioso para não poluir console
    }
}

/**
 * Atualiza o ícone SVG de acordo com o estado
 */
function updateAudioIcon(enabled) {
    const iconOn = document.getElementById('audio-icon-on');
    const iconOff = document.getElementById('audio-icon-off');
    const audioToggle = document.getElementById('audio-toggle');
    
    if (iconOn && iconOff) {
        if (enabled) {
            iconOn.style.display = 'block';
            iconOff.style.display = 'none';
            audioToggle?.setAttribute('aria-label', 'Som ligado - Clique para mutar');
            audioToggle?.setAttribute('title', 'Mutar som');
        } else {
            iconOn.style.display = 'none';
            iconOff.style.display = 'block';
            audioToggle?.setAttribute('aria-label', 'Som desligado - Clique para ativar');
            audioToggle?.setAttribute('title', 'Ativar som');
        }
    }
}

/**
 * Cria ou obtém o elemento de áudio com a faixa atual
 */
function getAudioElement() {
    if (!audioState.audioElement) {
        audioState.audioElement = new Audio();
        audioState.audioElement.volume = audioState.volume;
        audioState.audioElement.preload = 'auto';
        
        // Listener para avançar para próxima faixa quando terminar
        audioState.audioElement.addEventListener('ended', () => {
            playNextTrack();
        });
        
        // Listener para salvar tempo atual periodicamente
        audioState.audioElement.addEventListener('timeupdate', () => {
            if (audioState.enabled && audioState.audioElement) {
                saveCurrentTime(audioState.audioElement.currentTime);
            }
        });
        
        // Listener para erros de carregamento
        audioState.audioElement.addEventListener('error', (e) => {
            console.warn('Erro ao carregar áudio, tentando próxima faixa:', e);
            playNextTrack();
        });
    }
    return audioState.audioElement;
}

/**
 * Carrega e toca uma faixa específica
 */
async function loadAndPlayTrack(trackIndex, startTime = 0) {
    const audio = getAudioElement();
    
    // Validar índice
    const validIndex = trackIndex % PLAYLIST.length;
    audioState.currentTrackIndex = validIndex;
    
    const trackUrl = PLAYLIST[validIndex];
    audio.src = trackUrl;
    
    try {
        // Aguarda metadados carregarem
        await new Promise((resolve, reject) => {
            const onLoaded = () => {
                audio.removeEventListener('loadedmetadata', onLoaded);
                audio.removeEventListener('error', onError);
                resolve();
            };
            const onError = (e) => {
                audio.removeEventListener('loadedmetadata', onLoaded);
                audio.removeEventListener('error', onError);
                reject(e);
            };
            audio.addEventListener('loadedmetadata', onLoaded);
            audio.addEventListener('error', onError);
            audio.load();
        });
        
        // Define o tempo de início
        if (startTime > 0 && startTime < audio.duration) {
            audio.currentTime = startTime;
        }
        
        // Tenta reproduzir
        if (audioState.enabled) {
            await audio.play();
            console.log(`🎵 Tocando faixa ${validIndex + 1}/${PLAYLIST.length}: ${trackUrl}`);
        }
        
        // Salva estado
        saveAudioState(audioState.enabled, audioState.volume, validIndex, audio.currentTime);
        
    } catch (e) {
        console.warn('Erro ao carregar/reproduzir faixa:', e.message);
        throw e;
    }
}

/**
 * Avança para a próxima faixa da playlist
 */
async function playNextTrack() {
    const nextIndex = (audioState.currentTrackIndex + 1) % PLAYLIST.length;
    try {
        await loadAndPlayTrack(nextIndex, 0);
    } catch (e) {
        console.warn('Erro ao tocar próxima faixa:', e);
    }
}

/**
 * Reproduz ou pausa o áudio
 */
async function toggleAudioPlayback(enabled) {
    const audio = getAudioElement();
    
    try {
        if (enabled) {
            // Se não tem src, carrega a faixa atual
            if (!audio.src || audio.src === window.location.href) {
                const saved = getAudioState();
                await loadAndPlayTrack(saved.trackIndex, saved.currentTime);
            } else {
                await audio.play();
            }
        } else {
            audio.pause();
            // Salva posição ao pausar
            saveAudioState(audioState.enabled, audioState.volume, audioState.currentTrackIndex, audio.currentTime);
        }
    } catch (e) {
        // Navegadores bloqueiam autoplay sem interação do usuário
        console.warn('Autoplay bloqueado pelo navegador:', e.message);
        
        // Mostra toast ou indicador visual para o usuário
        showResumeAudioHint();
        throw e;
    }
}

/**
 * Mostra dica visual para retomar áudio (quando autoplay é bloqueado)
 */
function showResumeAudioHint() {
    // Verifica se já existe um toast
    if (document.getElementById('audio-resume-toast')) return;
    
    const toast = document.createElement('div');
    toast.id = 'audio-resume-toast';
    toast.className = 'audio-resume-toast';
    toast.innerHTML = `
        <i class="fas fa-music"></i>
        <span>Clique para retomar a música</span>
    `;
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--highlight-color, #FD8A24);
        color: white;
        padding: 10px 20px;
        border-radius: 25px;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideUp 0.3s ease;
        font-size: 0.9em;
    `;
    
    // Adiciona animação CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from { opacity: 0; transform: translateX(-50%) translateY(20px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
    `;
    document.head.appendChild(style);
    
    toast.onclick = async () => {
        toast.remove();
        audioState.isUserInteracted = true;
        if (audioState.enabled) {
            try {
                await toggleAudioPlayback(true);
            } catch (e) {
                console.warn('Ainda não foi possível reproduzir:', e);
            }
        }
    };
    
    document.body.appendChild(toast);
    
    // Auto-remove após 5 segundos
    setTimeout(() => toast.remove(), 5000);
}

/**
 * Alterna o estado do áudio (mudo/ativo)
 */
async function toggleAudio() {
    const newState = !audioState.enabled;
    audioState.enabled = newState;
    audioState.isUserInteracted = true;
    
    updateAudioIcon(newState);
    
    try {
        await toggleAudioPlayback(newState);
    } catch (e) {
        // Autoplay bloqueado, mas estado já foi atualizado
    }
    
    // Salva estado
    const audio = getAudioElement();
    saveAudioState(newState, audioState.volume, audioState.currentTrackIndex, audio.currentTime || 0);
    
    return newState;
}

/**
 * Define o volume do áudio (0.0 a 1.0)
 */
function setAudioVolume(volume) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    audioState.volume = clampedVolume;
    
    if (audioState.audioElement) {
        audioState.audioElement.volume = clampedVolume;
    }
    
    const audio = getAudioElement();
    saveAudioState(audioState.enabled, clampedVolume, audioState.currentTrackIndex, audio.currentTime || 0);
}

/**
 * Verifica se o áudio está habilitado
 */
function isAudioEnabled() {
    return audioState.enabled;
}

/**
 * Inicializa o gerenciador de áudio
 */
function initAudioManager() {
    // Carrega estado salvo
    const saved = getAudioState();
    audioState.enabled = saved.enabled;
    audioState.volume = saved.volume;
    audioState.currentTrackIndex = saved.trackIndex;
    
    // Atualiza ícone inicial
    updateAudioIcon(audioState.enabled);
    
    // Configura listener do botão
    const audioToggle = document.getElementById('audio-toggle');
    if (audioToggle) {
        audioToggle.addEventListener('click', async (e) => {
            e.preventDefault();
            await toggleAudio();
        });
    }
    
    // Se estava habilitado, tenta retomar de onde parou
    if (audioState.enabled) {
        // Tenta reproduzir imediatamente (pode ser bloqueado)
        const attemptAutoplay = async () => {
            try {
                await loadAndPlayTrack(saved.trackIndex, saved.currentTime);
                console.log('🎵 Áudio retomado automaticamente');
            } catch (e) {
                console.warn('Autoplay bloqueado, aguardando interação do usuário');
                
                // Aguarda qualquer interação do usuário para iniciar
                const startAudioOnInteraction = async () => {
                    if (audioState.enabled && !audioState.isUserInteracted) {
                        audioState.isUserInteracted = true;
                        try {
                            const currentSaved = getAudioState();
                            await loadAndPlayTrack(currentSaved.trackIndex, currentSaved.currentTime);
                        } catch (err) {
                            console.warn('Erro ao retomar áudio:', err);
                        }
                    }
                    document.removeEventListener('click', startAudioOnInteraction);
                    document.removeEventListener('keydown', startAudioOnInteraction);
                    document.removeEventListener('touchstart', startAudioOnInteraction);
                };
                
                document.addEventListener('click', startAudioOnInteraction, { once: true });
                document.addEventListener('keydown', startAudioOnInteraction, { once: true });
                document.addEventListener('touchstart', startAudioOnInteraction, { once: true });
            }
        };
        
        // Pequeno delay para garantir que o DOM está pronto
        setTimeout(attemptAutoplay, 100);
    }
    
    // Salva posição antes de fechar/atualizar a página
    window.addEventListener('beforeunload', () => {
        if (audioState.audioElement && audioState.enabled) {
            saveAudioState(
                audioState.enabled,
                audioState.volume,
                audioState.currentTrackIndex,
                audioState.audioElement.currentTime
            );
        }
    });
    
    console.log('🔊 AudioManager inicializado com playlist de', PLAYLIST.length, 'faixas');
}

export {
    initAudioManager,
    toggleAudio,
    setAudioVolume,
    isAudioEnabled,
    playNextTrack
};
