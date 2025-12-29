import { Timestamp, addDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

import { getCurrentUser, getCurrentRole } from '../utils/authManager.js';
import { showModal, showConfirmModal } from '../components/modal.js';
import { showSpinner, hideSpinner } from '../components/spinner.js';
import { getUserMap } from '../services/usersService.js';
import { db } from '../services/firebase.js';
import {
  createChampionship,
  createFriendlyMatchFromRodadaFixa,
  deleteMatch,
  finalizeChampionship,
  resetUserStats,
  setUserActive,
  setUserRole,
  startChampionship,
  subscribeChampionships,
  subscribeLogs,
  subscribeRodadasFixas,
  subscribeUsers
} from '../services/adminService.js';
import { forcarConfirmacao, STATUS_PLACAR } from '../services/matchesService.js';

// Função auxiliar para registrar logs
async function addLogEntry({ acao, userIdResponsavel, entidadeAfetada, detalhes }) {
  try {
    await addDoc(collection(db, 'logs'), {
      acao,
      userIdResponsavel,
      entidadeAfetada,
      detalhes,
      data: serverTimestamp()
    });
  } catch (e) {
    console.error('[admin] addLogEntry erro:', e);
  }
}

function isAdminOrSuperadmin(role) {
  const r = String(role || '').trim().toLowerCase();
  return r === 'admin' || r === 'superadmin' || r === 'super-admin' || r === 'super admin';
}

function isSuperadmin(role) {
  const r = String(role || '').trim().toLowerCase();
  return r === 'superadmin' || r === 'super-admin' || r === 'super admin';
}

function isRoleAdminLike(role) {
  const r = String(role || '').trim().toLowerCase();
  return r === 'admin' || r === 'superadmin' || r === 'super-admin' || r === 'super admin';
}

function normalizeRole(role) {
  const r = String(role || '').trim().toLowerCase();
  if (r === 'admin') return 'Admin';
  if (r === 'superadmin' || r === 'super-admin' || r === 'super admin') return 'Superadmin';
  if (r === 'gestao' || r === 'gestão') return 'Gestao';
  if (!r) return 'Jogador';
  if (r === 'jogador') return 'Jogador';
  return role;
}

function friendlyAction(acao) {
  const a = String(acao || '').trim();
  const map = {
    forcar_placar: 'Forçou placar',
    alterar_funcao_usuario: 'Alterou função de usuário',
    resetar_estatisticas_usuario: 'Resetou estatísticas',
    inativar_jogador: 'Inativou jogador',
    reativar_jogador: 'Reativou jogador',
    criar_campeonato: 'Criou campeonato',
    iniciar_campeonato: 'Iniciou campeonato',
    finalizar_campeonato: 'Finalizou campeonato',
    criar_confronto_rodada: 'Criou confronto (rodada fixa)',
    criar_amistosa_rodada: 'Criou amistosa (rodada fixa)',
    contestar_partida_rodada: 'Contestou partida (rodada fixa)',
    excluir_partida: 'Excluiu partida'
  };
  return map[a] || a || '-';
}

function friendlyDetails({ acao, detalhes, entidadeAfetada }) {
  const d = detalhes && typeof detalhes === 'object' ? detalhes : null;
  const a = String(acao || '').trim();
  if (a === 'forcar_placar') {
    const pa = d && d.placarA != null ? d.placarA : '?';
    const pb = d && d.placarB != null ? d.placarB : '?';
    return `Partida: ${entidadeAfetada || '-'} | Placar: ${pa} x ${pb}`;
  }
  if (a === 'alterar_funcao_usuario') {
    return `Usuário: ${entidadeAfetada || '-'} | Função: ${d?.funcao || '-'}`;
  }
  if (a === 'resetar_estatisticas_usuario') {
    return `Usuário: ${entidadeAfetada || '-'} | Estatísticas resetadas`;
  }
  if (a === 'inativar_jogador' || a === 'reativar_jogador') {
    return `Usuário: ${entidadeAfetada || '-'} | Status: ${a === 'inativar_jogador' ? 'Inativo' : 'Ativo'}`;
  }
  if (a === 'criar_campeonato') {
    return `Campeonato: ${entidadeAfetada || '-'} | Nome: ${d?.nome || '-'}`;
  }
  if (a === 'finalizar_campeonato') {
    return `Campeonato: ${entidadeAfetada || '-'} | Campeão: ${d?.campeaoId || '-'}`;
  }
  if (a === 'criar_confronto_rodada') {
    return `Partida: ${entidadeAfetada || '-'} | Rodada: ${d?.rodadaId || '-'} | A: ${d?.jogadorAId || '-'} | B: ${d?.jogadorBId || '-'}`;
  }
  if (a === 'criar_amistosa_rodada') {
    return `Partida: ${entidadeAfetada || '-'} | Rodada: ${d?.rodadaId || '-'} | A: ${d?.jogadorAId || '-'} | B: ${d?.jogadorBId || '-'}`;
  }
  if (a === 'contestar_partida_rodada') {
    return `Partida: ${entidadeAfetada || '-'} | Motivo: ${d?.motivo || '-'}`;
  }
  if (a === 'excluir_partida') {
    return `Partida: ${entidadeAfetada || '-'} | Excluída`;
  }
  if (!d) return entidadeAfetada || '-';
  try {
    const json = JSON.stringify(d);
    return json.length > 140 ? `${json.slice(0, 140)}…` : json;
  } catch {
    return entidadeAfetada || '-';
  }
}

function formatDateTime(value) {
  if (!value) return '-';
  let d = null;
  if (value instanceof Date) d = value;
  else if (value instanceof Timestamp) d = value.toDate();
  else if (value && typeof value.toDate === 'function') d = value.toDate();
  if (!d) return '-';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function findCardByTitle(titleText) {
  const cards = Array.from(document.querySelectorAll('.card-section'));
  return cards.find((c) => {
    const h = c.querySelector('h3.card-title');
    return h && h.textContent.trim() === titleText;
  });
}

function setTableState(tbody, { loading = false, empty = false, error = null, colSpan = 4, message = '' } = {}) {
  if (!tbody) return;
  tbody.innerHTML = '';

  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = colSpan;
  td.style.opacity = '0.9';
  td.style.padding = '12px 10px';

  if (loading) td.textContent = message || 'Carregando…';
  else if (error) td.textContent = message || 'Erro ao carregar dados.';
  else if (empty) td.textContent = message || 'Nenhum registro encontrado.';
  else td.textContent = message || '';

  tr.appendChild(td);
  tbody.appendChild(tr);
}

function createOverlayForm({ title, bodyEl, primaryText = 'Confirmar', secondaryText = 'Cancelar' }) {
  return new Promise((resolve) => {
    const root = document.getElementById('modal-root') || (() => {
      const r = document.createElement('div');
      r.id = 'modal-root';
      document.body.appendChild(r);
      return r;
    })();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    const h = document.createElement('h3');
    h.textContent = title;

    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    const btnCancel = document.createElement('button');
    btnCancel.className = 'modal-btn';
    btnCancel.textContent = secondaryText;

    const btnOk = document.createElement('button');
    btnOk.className = 'modal-btn';
    btnOk.textContent = primaryText;

    function close(val) {
      overlay.remove();
      resolve(val);
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(null);
    });

    btnCancel.onclick = () => close(null);
    btnOk.onclick = () => close(true);

    modal.appendChild(h);
    modal.appendChild(bodyEl);
    modal.appendChild(actions);
    actions.appendChild(btnCancel);
    actions.appendChild(btnOk);

    overlay.appendChild(modal);
    root.appendChild(overlay);

    btnOk.focus();
  });
}

async function promptSelect({ title, options, placeholder = 'Selecione…' }) {
  const wrapper = document.createElement('div');
  const select = document.createElement('select');
  select.style.width = '100%';
  select.style.padding = '10px';

  const first = document.createElement('option');
  first.value = '';
  first.textContent = placeholder;
  select.appendChild(first);

  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    select.appendChild(o);
  }

  wrapper.appendChild(select);

  const ok = await createOverlayForm({ title, bodyEl: wrapper, primaryText: 'Continuar' });
  if (!ok) return null;
  return select.value || null;
}

async function promptMultiSelectUsers({ title, users, min = 1 }) {
  const wrapper = document.createElement('div');
  wrapper.style.maxHeight = '360px';
  wrapper.style.overflow = 'auto';

  const hint = document.createElement('p');
  hint.style.marginTop = '0';
  hint.style.opacity = '0.9';
  hint.textContent = `Selecione ${min} ou mais participantes:`;
  wrapper.appendChild(hint);

  const list = document.createElement('div');
  list.style.display = 'grid';
  list.style.gap = '8px';

  (users || []).forEach((u) => {
    const row = document.createElement('label');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '10px';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = u.id;

    const nome = u.nome || u.email || u.id;
    const time = u.timeName || u.timeId || 'Sem time';
    const text = document.createElement('span');
    text.textContent = `${nome} — ${time}`;

    row.appendChild(cb);
    row.appendChild(text);
    list.appendChild(row);
  });

  wrapper.appendChild(list);

  const ok = await createOverlayForm({ title, bodyEl: wrapper, primaryText: 'Continuar' });
  if (!ok) return null;

  const selected = Array.from(wrapper.querySelectorAll('input[type="checkbox"]:checked')).map((el) => el.value);
  if (selected.length < min) {
    showModal('info', 'Atenção', `Selecione pelo menos ${min} participantes.`);
    return null;
  }
  return selected;
}

async function promptText({ title, label, placeholder = '' }) {
  const wrapper = document.createElement('div');
  const p = document.createElement('p');
  p.textContent = label;

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  input.style.width = '100%';
  input.style.padding = '10px';

  wrapper.appendChild(p);
  wrapper.appendChild(input);

  const ok = await createOverlayForm({ title, bodyEl: wrapper, primaryText: 'Confirmar' });
  if (!ok) return null;
  return String(input.value || '').trim() || null;
}

async function promptScore({ title }) {
  const wrapper = document.createElement('div');
  const row = document.createElement('div');
  row.style.display = 'grid';
  row.style.gridTemplateColumns = '1fr 1fr';
  row.style.gap = '10px';

  const a = document.createElement('input');
  a.type = 'number';
  a.min = '0';
  a.placeholder = 'Placar A';
  a.style.width = '100%';
  a.style.padding = '10px';

  const b = document.createElement('input');
  b.type = 'number';
  b.min = '0';
  b.placeholder = 'Placar B';
  b.style.width = '100%';
  b.style.padding = '10px';

  row.appendChild(a);
  row.appendChild(b);
  wrapper.appendChild(row);

  const ok = await createOverlayForm({ title, bodyEl: wrapper, primaryText: 'Aplicar' });
  if (!ok) return null;

  const pa = Number(a.value);
  const pb = Number(b.value);
  if (!Number.isFinite(pa) || !Number.isFinite(pb) || pa < 0 || pb < 0) return null;
  return { placarA: pa, placarB: pb };
}

function wireCriticalButtons({ usersCache, campsCache, activeChampionshipId }) {
  const btns = Array.from(document.querySelectorAll('.admin-actions-critical .btn-critical'));
  if (btns.length < 4) return;

  const [btnForcarPlacar, btnInativarJogador, btnFinalizarCamp, btnExportarPdf] = btns;

  btnForcarPlacar.onclick = async () => {
    try {
      const user = getCurrentUser();
      const role = getCurrentRole();
      if (!user || !isAdminOrSuperadmin(role)) return;

      // Lista partidas pendentes/contestadas (oficial e não-oficial)
      const matches = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
      const { collection, getDocs, query, where } = matches;
      const q = query(collection((await import('../services/firebase.js')).db, 'partidas'), where('placarStatus', 'in', [STATUS_PLACAR.PENDENTE, STATUS_PLACAR.CONTESTADO]));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (list.length === 0) {
        showModal('info', 'Nada para forçar', 'Não há partidas pendentes/contestadas no momento.');
        return;
      }

      const selectedId = await promptSelect({
        title: 'Forçar placar',
        options: list.map((m) => ({
          value: m.id,
          label: `${m.jogadorANome || m.jogadorAId} vs ${m.jogadorBNome || m.jogadorBId} (${m.placarStatus})`
        })),
        placeholder: 'Selecione a partida'
      });
      if (!selectedId) return;

      const placar = await promptScore({ title: 'Defina o placar final' });
      if (!placar) {
        showModal('error', 'Dados inválidos', 'Informe placares válidos.');
        return;
      }

      const ok = await showConfirmModal('Confirmar ação', 'Você está prestes a forçar a confirmação do placar. Esta ação será registrada no log. Continuar?');
      if (!ok) return;

      await forcarConfirmacao(selectedId, user.uid, placar.placarA, placar.placarB);
      showModal('success', 'Sucesso', 'Placar confirmado com sucesso.');
    } catch (e) {
      console.error('[admin] forcar placar erro:', e);
      showModal('error', 'Erro', e?.message || 'Falha ao forçar placar.');
    }
  };

  btnInativarJogador.onclick = async () => {
    try {
      const user = getCurrentUser();
      const role = getCurrentRole();
      if (!user || !isAdminOrSuperadmin(role)) return;
      if (!isSuperadmin(role)) {
        showModal('error', 'Acesso restrito', 'Apenas Superadmin pode inativar jogadores.');
        return;
      }

      const options = usersCache
        .filter((u) => u.id !== user.uid)
        .map((u) => ({ value: u.id, label: `${u.nome || u.email || u.id} (${u.funcao || 'Jogador'})` }));

      const selectedId = await promptSelect({ title: 'Inativar/Reativar Jogador', options, placeholder: 'Selecione o usuário' });
      if (!selectedId) return;

      const target = usersCache.find((u) => u.id === selectedId);
      const ativoAtual = target && Object.prototype.hasOwnProperty.call(target, 'ativo') ? !!target.ativo : true;
      const nextAtivo = !ativoAtual;

      const ok = await showConfirmModal('Confirmar ação', `Você deseja ${nextAtivo ? 'REATIVAR' : 'INATIVAR'} este usuário? Esta ação será registrada no log.`);
      if (!ok) return;

      await setUserActive({ targetUserId: selectedId, ativo: nextAtivo, actorUserId: user.uid, actorRole: role });
      showModal('success', 'Sucesso', nextAtivo ? 'Usuário reativado.' : 'Usuário inativado.');
    } catch (e) {
      console.error('[admin] inativar jogador erro:', e);
      showModal('error', 'Erro', e?.message || 'Falha ao alterar status do usuário.');
    }
  };

  btnFinalizarCamp.onclick = async () => {
    try {
      const user = getCurrentUser();
      const role = getCurrentRole();
      if (!user || !isAdminOrSuperadmin(role)) return;

      const activeFromCache = (Array.isArray(campsCache) ? campsCache : []).find((c) => c.status === 'Ativo');
      const champId = activeChampionshipId || activeFromCache?.id || null;
      if (!champId) {
        showModal('info', 'Nenhum campeonato em andamento', 'Não há campeonato em andamento para finalizar no momento.');
        return;
      }

      const ok = await showConfirmModal('Finalizar campeonato', 'Você está prestes a finalizar o campeonato ativo e calcular o campeão. Continuar?');
      if (!ok) return;

      const result = await finalizeChampionship({ campeonatoId: champId, actorUserId: user.uid, actorRole: role });
      showModal('success', 'Campeonato finalizado', `Campeão: ${result.campeaoId}`);
    } catch (e) {
      console.error('[admin] finalizar campeonato erro:', e);
      showModal('error', 'Erro', e?.message || 'Falha ao finalizar campeonato.');
    }
  };

  btnExportarPdf.onclick = async () => {
    try {
      const user = getCurrentUser();
      const role = getCurrentRole();
      if (!user || !isAdminOrSuperadmin(role)) return;

      // Regra PRD: exportar tabela final do campeonato.
      // Preferência: campeonato ativo (se já tiver tabelaFinal), senão o mais recente finalizado.
      const { db } = await import('../services/firebase.js');
      const { collection, getDocs, query, orderBy, limit } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');

      let champ = null;
      if (activeChampionshipId) {
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
        const snap = await getDoc(doc(db, 'campeonatos', activeChampionshipId));
        if (snap.exists()) champ = { id: snap.id, ...snap.data() };
      }

      if (!champ || !Array.isArray(champ.tabelaFinal)) {
        // Evita índice composto (status + dataFim) buscando por dataFim e filtrando no client
        const snap = await getDocs(query(collection(db, 'campeonatos'), orderBy('dataFim', 'desc'), limit(10)));
        const candidates = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        champ = candidates.find((c) => c.status === 'Finalizado' && Array.isArray(c.tabelaFinal)) || null;

        if (!champ) {
          const snap2 = await getDocs(query(collection(db, 'campeonatos'), orderBy('criadoEm', 'desc'), limit(10)));
          const candidates2 = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
          champ = candidates2.find((c) => c.status === 'Finalizado' && Array.isArray(c.tabelaFinal)) || null;
        }
      }

      if (!champ || !Array.isArray(champ.tabelaFinal)) {
        showModal('info', 'PDF indisponível', 'Nenhum campeonato finalizado com tabela final disponível.');
        return;
      }

      const ranking = champ.tabelaFinal;
      const ids = ranking.map((r) => r.id);
      const map = await getUserMap(ids);
      const users = ids.map((id) => ({ id, ...(map.get(id) || {}) }));
      await gerarPdfTabela({ titulo: `Tabela Final - ${champ.nome || champ.id}`, ranking, users });
    } catch (e) {
      console.error('[admin] export pdf erro:', e);
      showModal('error', 'Erro', e?.message || 'Falha ao exportar PDF.');
    }
  };
}

async function ensureJsPdf() {
  if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;

  await new Promise((resolve, reject) => {
    const existing = document.getElementById('jspdf-cdn');
    if (existing) { resolve(); return; }
    const s = document.createElement('script');
    s.id = 'jspdf-cdn';
    s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Falha ao carregar jsPDF'));
    document.head.appendChild(s);
  });

  if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('jsPDF indisponível após carregamento');
  return window.jspdf.jsPDF;
}

async function gerarPdfTabela({ titulo, ranking, users }) {
  const jsPDF = await ensureJsPdf();
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text(String(titulo || 'Relatório'), 14, 16);

  doc.setFontSize(10);
  let y = 26;
  doc.text('Pos', 14, y);
  doc.text('Time/Jogador', 26, y);
  doc.text('P', 120, y);
  doc.text('V', 132, y);
  doc.text('SG', 144, y);
  doc.text('GP', 158, y);
  doc.text('GC', 172, y);
  y += 6;

  const map = new Map();
  for (const u of users) map.set(u.id, u);

  ranking.slice(0, 40).forEach((r, idx) => {
    const u = map.get(r.id) || {};
    const name = u.nome || u.email || String(r.id);
    doc.text(String(idx + 1), 14, y);
    doc.text(name.substring(0, 30), 26, y);
    doc.text(String(r.P || 0), 120, y);
    doc.text(String(r.V || 0), 132, y);
    doc.text(String(r.SG || 0), 144, y);
    doc.text(String(r.GP || 0), 158, y);
    doc.text(String(r.GC || 0), 172, y);
    y += 6;
    if (y > 280) {
      doc.addPage();
      y = 16;
    }
  });

  doc.save('icoufootball_relatorio.pdf');
}

function adminInit() {
  const user = getCurrentUser();
  const role = getCurrentRole();

  if (!user || !isAdminOrSuperadmin(role)) {
    showModal('error', 'Acesso negado', 'Esta página é restrita a administradores.');
    window.location.hash = '#homepage';
    return;
  }

  // Busca elementos pelo template com IDs corretos
  const tbodyRodadas = document.getElementById('admin-amistosos-tbody');
  const tbodyUsers = document.getElementById('admin-users-tbody');
  const tbodyCamps = document.getElementById('admin-camps-tbody');
  const tbodyLogs = document.getElementById('admin-logs-tbody');
  
  // Botões de ação nos headers
  const btnNovoAmistoso = document.getElementById('btn-novo-amistoso');
  const btnNovoCampeonato = document.getElementById('btn-novo-campeonato');

  // === SETUP PERMISSÕES TOGGLE ===
  const btnTogglePermissions = document.getElementById('btnTogglePermissions');
  const permissionsContent = document.getElementById('permissionsContent');
  if (btnTogglePermissions && permissionsContent) {
    btnTogglePermissions.onclick = () => {
      permissionsContent.classList.toggle('expanded');
      btnTogglePermissions.classList.toggle('rotated');
    };
  }

  // === SETUP FILTROS DE USUÁRIOS ===
  const filterUsersSearch = document.getElementById('filterUsersSearch');
  const filterUsersStatus = document.getElementById('filterUsersStatus');
  const filterUsersRole = document.getElementById('filterUsersRole');
  const filterUsersSort = document.getElementById('filterUsersSort');
  const btnClearUsersFilters = document.getElementById('btnClearUsersFilters');
  const usersResultsInfo = document.getElementById('usersResultsInfo');

  // === SETUP FILTROS DE CAMPEONATOS ===
  const filterCampsSearch = document.getElementById('filterCampsSearch');
  const filterCampsStatus = document.getElementById('filterCampsStatus');
  const filterCampsSort = document.getElementById('filterCampsSort');
  const btnClearCampsFilters = document.getElementById('btnClearCampsFilters');
  const campsResultsInfo = document.getElementById('campsResultsInfo');

  // Estados iniciais
  setTableState(tbodyRodadas, { loading: true, colSpan: 5 });
  setTableState(tbodyUsers, { loading: true, colSpan: 7 });
  setTableState(tbodyCamps, { loading: true, colSpan: 7 });
  setTableState(tbodyLogs, { loading: true, colSpan: 4 });

  const unsub = [];
  let usersCache = [];
  let campsCache = [];
  let activeChampId = null;

  // ============================================================================
  // FUNÇÕES DE FILTRO E RENDERIZAÇÃO
  // ============================================================================

  function applyUsersFilters() {
    if (!usersCache.length) return;

    const searchTerm = (filterUsersSearch?.value || '').toLowerCase().trim();
    const statusFilter = filterUsersStatus?.value || 'todos';
    const roleFilter = filterUsersRole?.value || 'todos';
    const sortBy = filterUsersSort?.value || 'nome-asc';

    let filtered = [...usersCache];

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(u => 
        (u.nome || '').toLowerCase().includes(searchTerm) ||
        (u.email || '').toLowerCase().includes(searchTerm) ||
        (u.nomeTime || u.timeName || '').toLowerCase().includes(searchTerm)
      );
    }

    // Filtro de status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(u => {
        const ativo = Object.prototype.hasOwnProperty.call(u, 'ativo') ? !!u.ativo : true;
        return statusFilter === 'ativo' ? ativo : !ativo;
      });
    }

    // Filtro de função
    if (roleFilter !== 'todos') {
      filtered = filtered.filter(u => normalizeRole(u.funcao) === roleFilter);
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'nome-desc':
          return (b.nome || '').localeCompare(a.nome || '');
        case 'criado-desc':
          return (b.criadoEm?.toMillis?.() || 0) - (a.criadoEm?.toMillis?.() || 0);
        case 'criado-asc':
          return (a.criadoEm?.toMillis?.() || 0) - (b.criadoEm?.toMillis?.() || 0);
        case 'estrelas-desc':
          return (Number(b.estrelas) || 0) - (Number(a.estrelas) || 0);
        default: // nome-asc
          return (a.nome || '').localeCompare(b.nome || '');
      }
    });

    // Atualiza info de resultados
    if (usersResultsInfo) {
      if (filtered.length !== usersCache.length) {
        usersResultsInfo.textContent = `Exibindo ${filtered.length} de ${usersCache.length} usuários`;
      } else {
        usersResultsInfo.textContent = '';
      }
    }

    renderUsersTable(filtered);
  }

  function applyCampsFilters() {
    if (!campsCache.length) return;

    const searchTerm = (filterCampsSearch?.value || '').toLowerCase().trim();
    const statusFilter = filterCampsStatus?.value || 'todos';
    const sortBy = filterCampsSort?.value || 'criado-desc';

    let filtered = [...campsCache];

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(c => 
        (c.nome || '').toLowerCase().includes(searchTerm)
      );
    }

    // Filtro de status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'criado-asc':
          return (a.criadoEm?.toMillis?.() || 0) - (b.criadoEm?.toMillis?.() || 0);
        case 'nome-asc':
          return (a.nome || '').localeCompare(b.nome || '');
        case 'participantes-desc':
          return (Array.isArray(b.participantesIds) ? b.participantesIds.length : 0) - 
                 (Array.isArray(a.participantesIds) ? a.participantesIds.length : 0);
        default: // criado-desc
          return (b.criadoEm?.toMillis?.() || 0) - (a.criadoEm?.toMillis?.() || 0);
      }
    });

    // Atualiza info de resultados
    if (campsResultsInfo) {
      if (filtered.length !== campsCache.length) {
        campsResultsInfo.textContent = `Exibindo ${filtered.length} de ${campsCache.length} campeonatos`;
      } else {
        campsResultsInfo.textContent = '';
      }
    }

    renderCampsTable(filtered);
  }

  // Listeners de filtros de usuários
  let usersFilterDebounce;
  if (filterUsersSearch) {
    filterUsersSearch.addEventListener('input', () => {
      clearTimeout(usersFilterDebounce);
      usersFilterDebounce = setTimeout(applyUsersFilters, 300);
    });
  }
  if (filterUsersStatus) filterUsersStatus.addEventListener('change', applyUsersFilters);
  if (filterUsersRole) filterUsersRole.addEventListener('change', applyUsersFilters);
  if (filterUsersSort) filterUsersSort.addEventListener('change', applyUsersFilters);
  if (btnClearUsersFilters) {
    btnClearUsersFilters.addEventListener('click', () => {
      if (filterUsersSearch) filterUsersSearch.value = '';
      if (filterUsersStatus) filterUsersStatus.value = 'todos';
      if (filterUsersRole) filterUsersRole.value = 'todos';
      if (filterUsersSort) filterUsersSort.value = 'nome-asc';
      applyUsersFilters();
    });
  }

  // Listeners de filtros de campeonatos
  let campsFilterDebounce;
  if (filterCampsSearch) {
    filterCampsSearch.addEventListener('input', () => {
      clearTimeout(campsFilterDebounce);
      campsFilterDebounce = setTimeout(applyCampsFilters, 300);
    });
  }
  if (filterCampsStatus) filterCampsStatus.addEventListener('change', applyCampsFilters);
  if (filterCampsSort) filterCampsSort.addEventListener('change', applyCampsFilters);
  if (btnClearCampsFilters) {
    btnClearCampsFilters.addEventListener('click', () => {
      if (filterCampsSearch) filterCampsSearch.value = '';
      if (filterCampsStatus) filterCampsStatus.value = 'todos';
      if (filterCampsSort) filterCampsSort.value = 'criado-desc';
      applyCampsFilters();
    });
  }

  // ============================================================================
  // FUNÇÕES DE ANÁLISE DE IMPACTO
  // ============================================================================

  async function getDeleteUserImpact(userId) {
    try {
      const { db } = await import('../services/firebase.js');
      const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
      
      // Conta partidas do usuário
      const partidasARef = query(collection(db, 'partidas'), where('jogadorAId', '==', userId));
      const partidasBRef = query(collection(db, 'partidas'), where('jogadorBId', '==', userId));
      const [snapA, snapB] = await Promise.all([getDocs(partidasARef), getDocs(partidasBRef)]);
      const totalPartidas = snapA.size + snapB.size;

      // Conta campeonatos onde participa
      const campsRef = query(collection(db, 'campeonatos'), where('participantesIds', 'array-contains', userId));
      const campsSnap = await getDocs(campsRef);
      const totalCampeonatos = campsSnap.size;

      // Conta amigos
      const amigosRef = query(collection(db, 'amigos'), where('userId', '==', userId));
      const amigosSnap = await getDocs(amigosRef);
      const totalAmigos = amigosSnap.size;

      return { totalPartidas, totalCampeonatos, totalAmigos };
    } catch (e) {
      console.error('[admin] getDeleteUserImpact erro:', e);
      return { totalPartidas: '?', totalCampeonatos: '?', totalAmigos: '?' };
    }
  }

  async function getCancelChampionshipImpact(campId, campData) {
    try {
      const { db } = await import('../services/firebase.js');
      const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
      
      const participantes = Array.isArray(campData.participantesIds) ? campData.participantesIds.length : 0;

      // Conta partidas do campeonato
      const partidasRef = query(collection(db, 'partidas'), where('campeonatoId', '==', campId));
      const partidasSnap = await getDocs(partidasRef);
      const totalPartidas = partidasSnap.size;
      
      // Conta partidas pendentes
      const pendentes = partidasSnap.docs.filter(d => {
        const data = d.data();
        return data.placarStatus !== 'confirmado';
      }).length;

      return { participantes, totalPartidas, partidasPendentes: pendentes };
    } catch (e) {
      console.error('[admin] getCancelChampionshipImpact erro:', e);
      return { participantes: '?', totalPartidas: '?', partidasPendentes: '?' };
    }
  }

  async function getForceScoreImpact(matchId, matchData) {
    try {
      const jogadorA = matchData.jogadorANome || matchData.jogadorAId || 'Jogador A';
      const jogadorB = matchData.jogadorBNome || matchData.jogadorBId || 'Jogador B';
      const placarAtual = matchData.placarA != null && matchData.placarB != null 
        ? `${matchData.placarA} x ${matchData.placarB}` 
        : 'Não definido';
      const isCampeonato = !!matchData.campeonatoId;

      return { jogadorA, jogadorB, placarAtual, isCampeonato };
    } catch (e) {
      console.error('[admin] getForceScoreImpact erro:', e);
      return { jogadorA: '?', jogadorB: '?', placarAtual: '?', isCampeonato: false };
    }
  }

  function createImpactAnalysisElement(title, items, loading = false) {
    const wrapper = document.createElement('div');
    wrapper.className = 'impact-analysis';

    const header = document.createElement('div');
    header.className = 'impact-analysis-header';
    header.innerHTML = `<i class="fas fa-chart-pie"></i><span>${title}</span>`;
    wrapper.appendChild(header);

    if (loading) {
      const loadingEl = document.createElement('div');
      loadingEl.className = 'impact-loading';
      loadingEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analisando impacto...';
      wrapper.appendChild(loadingEl);
    } else {
      items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = `impact-item ${item.type || 'impact-info'}`;
        itemEl.innerHTML = `
          <i class="fas fa-${item.icon || 'circle'}"></i>
          <span class="impact-label">${item.label}:</span>
          <span class="impact-value">${item.value}</span>
        `;
        wrapper.appendChild(itemEl);
      });
    }

    return wrapper;
  }

  // Configura botão "Novo Amistoso"
  if (btnNovoAmistoso) {
    btnNovoAmistoso.onclick = async () => {
      try {
        if (!usersCache.length) {
          showModal('error', 'Usuários indisponíveis', 'Aguarde o carregamento da lista de usuários.');
          return;
        }
        const options = usersCache.map((u) => ({ value: u.id, label: u.nome || u.email || u.id }));
        const aId = await promptSelect({ title: 'Confronto - Jogador A', options, placeholder: 'Selecione Jogador A' });
        if (!aId) return;
        const bId = await promptSelect({ title: 'Confronto - Jogador B', options, placeholder: 'Selecione Jogador B' });
        if (!bId) return;

        const rodada = await promptText({ title: 'Rodada', label: 'Identificador da rodada (ex: 1):', placeholder: '1' });
        if (!rodada) return;

        const ok = await showConfirmModal('Confirmar', 'Criar amistosa de Rodada Fixa? Esta ação será registrada no log.');
        if (!ok) return;

        const jogadorA = usersCache.find((u) => u.id === aId);
        const jogadorB = usersCache.find((u) => u.id === bId);

        await createFriendlyMatchFromRodadaFixa({
          rodadaId: String(rodada),
          jogadorA,
          jogadorB,
          dataPartida: null,
          actorUserId: user.uid,
          actorRole: role
        });

        showModal('success', 'Criado', 'Amistosa criada.');
      } catch (e) {
        showModal('error', 'Erro', e?.message || 'Falha ao criar amistosa.');
      }
    };
  }

  // Configura botão "Novo Campeonato"
  if (btnNovoCampeonato) {
    btnNovoCampeonato.onclick = async () => {
      const nome = await promptText({ title: 'Criar campeonato', label: 'Nome do campeonato:' });
      if (!nome) return;

      const tipo = await promptSelect({
        title: 'Tipo de campeonato',
        placeholder: 'Selecione o tipo…',
        options: [
          { value: 'pontos_corridos_predefinido', label: 'Pontos Corridos | Pré-definido (período ou pontuação)' },
          { value: 'pontos_corridos_avulso', label: 'Pontos Corridos | Avulso (vagas abertas)' },
          { value: 'chave', label: 'Chave / Mata-mata (mín. 4)' }
        ]
      });
      if (!tipo) return;

      let participantesIds = [];
      let configExtra = {};

      if (tipo === 'pontos_corridos_avulso') {
        // Campeonato avulso: define número de vagas
        const vagasStr = await promptText({ title: 'Vagas disponíveis', label: 'Número de vagas para inscrição:', placeholder: '16' });
        if (!vagasStr) return;
        const vagas = parseInt(vagasStr, 10);
        if (!vagas || vagas < 2) {
          showModal('error', 'Valor inválido', 'Informe um número de vagas válido (mínimo 2).');
          return;
        }
        configExtra = { vagas, inscricoesAbertas: true };
      } else {
        // Pré-definido ou chave: seleciona participantes
        const min = tipo === 'chave' ? 4 : 3;
        participantesIds = await promptMultiSelectUsers({ title: 'Participantes', users: usersCache || [], min });
        if (!participantesIds) return;

        if (tipo === 'pontos_corridos_predefinido') {
          const modo = await promptSelect({
            title: 'Modo de término',
            placeholder: 'Selecione…',
            options: [
              { value: 'periodo', label: 'Por período (data início/fim)' },
              { value: 'pontuacao', label: 'Por alcance de pontuação' }
            ]
          });
          if (!modo) return;

          if (modo === 'periodo') {
            const dataInicio = await promptText({ title: 'Data de início', label: 'Data (DD/MM/AAAA):', placeholder: '01/01/2025' });
            const dataFim = await promptText({ title: 'Data de término', label: 'Data (DD/MM/AAAA):', placeholder: '31/12/2025' });
            configExtra = { modo: 'periodo', dataInicio, dataFim };
          } else {
            const pontosStr = await promptText({ title: 'Pontuação alvo', label: 'Pontos para encerrar:', placeholder: '100' });
            const pontos = parseInt(pontosStr, 10);
            if (!pontos || pontos < 1) {
              showModal('error', 'Valor inválido', 'Informe uma pontuação válida.');
              return;
            }
            configExtra = { modo: 'pontuacao', pontosAlvo: pontos };
          }
        }
      }

      const confrontosModo = await promptSelect({
        title: 'Configuração de confrontos',
        placeholder: 'Selecione…',
        options: [
          { value: 'manual', label: 'Manual' },
          { value: 'aleatorio', label: 'Aleatório' }
        ]
      });
      if (!confrontosModo) return;

      try {
        await createChampionship({ nome, tipo, participantesIds, confrontosModo, configExtra, actorUserId: user.uid, actorRole: role });
        showModal('success', 'Criado', 'Campeonato criado. Convites enviados aos participantes.');
      } catch (e) {
        showModal('error', 'Erro', e?.message || 'Falha ao criar campeonato.');
      }
    };
  }

  // USERS
  unsub.push(
    subscribeUsers(async (users, err) => {
      if (err) {
        console.error('[admin] users err', err);
        setTableState(tbodyUsers, { error: err, colSpan: 7, message: 'Erro ao carregar usuários.' });
        return;
      }

      usersCache = users || [];
      if (!usersCache.length) {
        setTableState(tbodyUsers, { empty: true, colSpan: 7, message: 'Nenhum usuário encontrado.' });
        return;
      }

      // Aplica filtros (que renderiza a tabela)
      applyUsersFilters();

      // Atualiza critical buttons após ter cache de usuários
      wireCriticalButtons({ usersCache, campsCache, activeChampionshipId: activeChampId });
    })
  );

  // Função para renderizar tabela de usuários
  function renderUsersTable(usersList) {
    tbodyUsers.innerHTML = '';

    if (!usersList.length) {
      setTableState(tbodyUsers, { empty: true, colSpan: 7, message: 'Nenhum usuário encontrado com os filtros aplicados.' });
      return;
    }

    usersList.forEach((u) => {
      const tr = document.createElement('tr');
      const tdUser = document.createElement('td');
      
      // Adiciona avatar se disponível
      const userCell = document.createElement('div');
      userCell.className = 'user-name-cell';
      if (u.avatarUrl || u.photoURL) {
        const avatar = document.createElement('img');
        avatar.className = 'user-avatar-small';
        avatar.src = u.avatarUrl || u.photoURL;
        avatar.alt = '';
        avatar.onerror = () => { avatar.style.display = 'none'; };
        userCell.appendChild(avatar);
      }
      const nameSpan = document.createElement('span');
      nameSpan.textContent = u.nome || u.email || u.id;
      userCell.appendChild(nameSpan);
      tdUser.appendChild(userCell);

      const tdTime = document.createElement('td');
      tdTime.textContent = u.nomeTime || u.timeName || u.timeId || '—';

      const tdStars = document.createElement('td');
      tdStars.className = 'numeric';
      tdStars.textContent = String(Number(u.estrelas || 0));

      const tdCreated = document.createElement('td');
      tdCreated.textContent = formatDateTime(u.criadoEm || u.createdAt || null);

      const tdStatus = document.createElement('td');
      const ativo = Object.prototype.hasOwnProperty.call(u, 'ativo') ? !!u.ativo : true;
      const statusBadge = document.createElement('span');
      statusBadge.className = `status-badge ${ativo ? 'ativo' : 'inativo'}`;
      statusBadge.innerHTML = `<i class="fas fa-${ativo ? 'check-circle' : 'times-circle'}"></i> ${ativo ? 'Ativo' : 'Inativo'}`;
      tdStatus.appendChild(statusBadge);

      const tdRole = document.createElement('td');
      tdRole.textContent = u.funcao || 'Jogador';

      const tdActions = document.createElement('td');
      tdActions.className = 'admin-actions';

      // Botão Inativar/Reativar
      const btnToggle = document.createElement('button');
      btnToggle.className = `btn-icon ${ativo ? 'action-orange' : 'action-green'}`;
      btnToggle.innerHTML = `<i class="fas fa-${ativo ? 'user-slash' : 'user-check'}"></i>`;
      btnToggle.title = ativo ? 'Inativar' : 'Reativar';
      if (!isSuperadmin(role) || u.id === user.uid || isRoleAdminLike(u.funcao)) {
        btnToggle.disabled = true;
        btnToggle.title = isSuperadmin(role) ? 'Não é possível alterar este usuário' : 'Apenas Superadmin pode inativar/reativar';
      }

      btnToggle.onclick = async () => {
        const ok = await showConfirmModal('Confirmar', `Deseja ${ativo ? 'INATIVAR' : 'REATIVAR'} este usuário?\n\nUsuários inativados não poderão fazer login no sistema.`);
        if (!ok) return;
        try {
          await setUserActive({ targetUserId: u.id, ativo: !ativo, actorUserId: user.uid, actorRole: role });
        } catch (e) {
          showModal('error', 'Erro', e?.message || 'Falha ao alterar status.');
        }
      };

      // Botão Editar
      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn-icon action-blue';
      btnEdit.innerHTML = '<i class="fas fa-user-edit"></i>';
      btnEdit.title = 'Editar';

      btnEdit.onclick = async () => {
        // Modal mais completo (função + permissões de gestão)
        const wrapper = document.createElement('div');

        const roleLabel = document.createElement('p');
        roleLabel.textContent = 'Função do usuário:';

        const roleSelect = document.createElement('select');
        roleSelect.style.width = '100%';
        roleSelect.style.padding = '10px';

        const allowedRoles = isSuperadmin(role)
          ? ['Jogador', 'Gestao', 'Admin', 'Superadmin']
          : ['Jogador', 'Gestao', 'Admin'];

        allowedRoles.forEach((r) => {
          const opt = document.createElement('option');
          opt.value = r;
          opt.textContent = r;
          roleSelect.appendChild(opt);
        });
        roleSelect.value = normalizeRole(u.funcao || 'Jogador');

        const permTitle = document.createElement('p');
        permTitle.style.marginTop = '10px';
        permTitle.textContent = 'Permissões de Gestão (para usuários não-admin):';

        const permBox = document.createElement('div');
        permBox.style.display = 'grid';
        permBox.style.gap = '8px';

        const currentPerms = (u.permissoesGestao && typeof u.permissoesGestao === 'object') ? u.permissoesGestao : {};
        const perms = [
          { key: 'forcarPlacar', label: 'Forçar confirmação de placar' },
          { key: 'editarPartidas', label: 'Editar informações de partidas' },
          { key: 'iniciarRodadas', label: 'Iniciar/Finalizar rodadas' },
          { key: 'visualizarLogs', label: 'Visualizar logs' }
        ];

        const permInputs = new Map();
        perms.forEach((p) => {
          const row = document.createElement('label');
          row.style.display = 'flex';
          row.style.gap = '8px';
          row.style.alignItems = 'center';

          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = !!currentPerms[p.key];
          permInputs.set(p.key, cb);

          const span = document.createElement('span');
          span.textContent = p.label;

          row.appendChild(cb);
          row.appendChild(span);
          permBox.appendChild(row);
        });

        const note = document.createElement('p');
        note.style.marginTop = '8px';
        note.style.opacity = '0.85';
        note.textContent = 'Obs: exclusão/inativação de contas continua restrita ao Superadmin (PRD).';

        wrapper.appendChild(roleLabel);
        wrapper.appendChild(roleSelect);
        wrapper.appendChild(permTitle);
        wrapper.appendChild(permBox);
        wrapper.appendChild(note);

        const okForm = await createOverlayForm({ title: 'Editar usuário', bodyEl: wrapper, primaryText: 'Salvar' });
        if (!okForm) return;

        const selectedRole = normalizeRole(roleSelect.value);

        // Monta permissoesGestao
        const nextPerms = {
          forcarPlacar: !!permInputs.get('forcarPlacar')?.checked,
          editarPartidas: !!permInputs.get('editarPartidas')?.checked,
          iniciarRodadas: !!permInputs.get('iniciarRodadas')?.checked,
          visualizarLogs: !!permInputs.get('visualizarLogs')?.checked,
          excluirContas: false
        };

        // Se marcar permissões e função não for admin-like, mantém como Gestao
        const anyPerm = Object.entries(nextPerms).some(([k, v]) => k !== 'excluirContas' && v === true);
        const finalRole = (isRoleAdminLike(selectedRole) ? selectedRole : (anyPerm ? 'Gestao' : (selectedRole === 'Gestao' ? 'Gestao' : 'Jogador')));

        const ok = await showConfirmModal('Confirmar', 'Esta ação será registrada no log. Continuar?');
        if (!ok) return;

        try {
          // Atualiza função
          await setUserRole({ targetUserId: u.id, newRole: finalRole, actorUserId: user.uid, actorRole: role });

          // Atualiza permissões apenas para não-admin
          if (!isRoleAdminLike(finalRole)) {
            const { db } = await import('../services/firebase.js');
            const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
            await updateDoc(doc(db, 'users', u.id), { permissoesGestao: nextPerms, atualizadoEm: serverTimestamp() });
          }
        } catch (e) {
          showModal('error', 'Erro', e?.message || 'Falha ao salvar usuário.');
          return;
        }

        const reset = await showConfirmModal('Resetar estatísticas?', 'Deseja também resetar as estatísticas deste usuário (partidas, vitórias, gols)?');
        if (reset) {
          try {
            await resetUserStats({ targetUserId: u.id, actorUserId: user.uid, actorRole: role });
            showModal('success', 'OK', 'Usuário atualizado e estatísticas resetadas.');
          } catch (e) {
            showModal('error', 'Erro', e?.message || 'Falha ao resetar estatísticas.');
          }
        } else {
          showModal('success', 'OK', 'Usuário atualizado.');
        }
      };

      // Botão Excluir (apenas Superadmin) - COM ANÁLISE DE IMPACTO
      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn-icon action-red';
      btnDelete.innerHTML = '<i class="fas fa-trash-alt"></i>';
      btnDelete.title = isSuperadmin(role) ? 'Excluir' : 'Apenas Superadmin pode excluir usuários';
      if (!isSuperadmin(role) || u.id === user.uid || isRoleAdminLike(u.funcao)) {
        btnDelete.disabled = true;
      }

      btnDelete.onclick = async () => {
        // Mostra modal de confirmação com análise de impacto
        const wrapper = document.createElement('div');
        
        const warning = document.createElement('div');
        warning.className = 'excluir-warning';
        warning.innerHTML = `
          <i class="fas fa-exclamation-triangle"></i>
          <div class="excluir-warning-content">
            <div class="excluir-warning-title">Ação irreversível!</div>
            <div class="excluir-warning-text">Esta ação excluirá permanentemente o usuário e todos os seus dados. Esta operação não pode ser desfeita.</div>
          </div>
        `;
        
        const userInfo = document.createElement('div');
        userInfo.className = 'excluir-user-info';
        userInfo.innerHTML = `
          ${u.avatarUrl || u.photoURL ? `<img class="excluir-user-avatar" src="${u.avatarUrl || u.photoURL}" alt="">` : ''}
          <div class="excluir-user-details">
            <div class="excluir-user-name">${u.nome || 'Sem nome'}</div>
            <div class="excluir-user-email">${u.email || u.id}</div>
          </div>
        `;

        // Análise de impacto (inicialmente com loading)
        const impactEl = createImpactAnalysisElement('Análise de Impacto', [], true);

        wrapper.appendChild(warning);
        wrapper.appendChild(userInfo);
        wrapper.appendChild(impactEl);

        // Busca impacto em background
        getDeleteUserImpact(u.id).then(impact => {
          const items = [
            { icon: 'futbol', label: 'Partidas afetadas', value: impact.totalPartidas, type: impact.totalPartidas > 0 ? 'impact-warning' : 'impact-info' },
            { icon: 'trophy', label: 'Campeonatos', value: impact.totalCampeonatos, type: impact.totalCampeonatos > 0 ? 'impact-warning' : 'impact-info' },
            { icon: 'users', label: 'Amizades', value: impact.totalAmigos, type: 'impact-info' }
          ];
          const newImpactEl = createImpactAnalysisElement('Análise de Impacto', items);
          impactEl.replaceWith(newImpactEl);
        });

        const okForm = await createOverlayForm({ 
          title: 'Excluir Usuário', 
          bodyEl: wrapper, 
          primaryText: 'Excluir Permanentemente',
          secondaryText: 'Cancelar'
        });
        
        if (!okForm) return;

        // Confirmação adicional
        const confirmText = await promptText({ 
          title: 'Confirmar exclusão', 
          label: `Digite "EXCLUIR" para confirmar:`,
          placeholder: 'EXCLUIR'
        });
        
        if (confirmText?.toUpperCase() !== 'EXCLUIR') {
          showModal('info', 'Cancelado', 'A exclusão foi cancelada.');
          return;
        }

        try {
          // Exclui o usuário do Firestore
          const { db } = await import('../services/firebase.js');
          const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
          
          // Registra no log antes de excluir
          await addLogEntry({
            acao: 'excluir_usuario',
            userIdResponsavel: user.uid,
            entidadeAfetada: u.id,
            detalhes: { nome: u.nome, email: u.email }
          });
          
          // Exclui o documento do usuário
          await deleteDoc(doc(db, 'users', u.id));
          
          showModal('success', 'Excluído', 'Usuário excluído permanentemente.');
        } catch (e) {
          console.error('[admin] excluir usuario erro:', e);
          showModal('error', 'Erro', e?.message || 'Falha ao excluir usuário.');
        }
      };

      tdActions.appendChild(btnToggle);
      tdActions.appendChild(btnEdit);
      tdActions.appendChild(btnDelete);

      tr.appendChild(tdUser);
      tr.appendChild(tdTime);
      tr.appendChild(tdStars);
      tr.appendChild(tdCreated);
      tr.appendChild(tdStatus);
      tr.appendChild(tdRole);
      tr.appendChild(tdActions);
      tbodyUsers.appendChild(tr);
    });
  }

  // CHAMPIONSHIPS
  unsub.push(
    subscribeChampionships(async (camps, err) => {
      if (err) {
        console.error('[admin] camps err', err);
        setTableState(tbodyCamps, { error: err, colSpan: 7, message: 'Erro ao carregar campeonatos.' });
        return;
      }

      campsCache = camps || [];
      
      if (!campsCache.length) {
        setTableState(tbodyCamps, { empty: true, colSpan: 7, message: 'Nenhum campeonato encontrado.' });
        return;
      }

      // Atualiza activeChampId
      const active = campsCache.find((c) => c.status === 'Ativo');
      activeChampId = active ? active.id : null;

      // Aplica filtros (que renderiza a tabela)
      applyCampsFilters();

      // Critical buttons podem depender de activeChampId
      wireCriticalButtons({ usersCache, campsCache, activeChampionshipId: activeChampId });
    })
  );

  // Função para renderizar tabela de campeonatos
  function renderCampsTable(campsList) {
    tbodyCamps.innerHTML = '';

    if (!campsList.length) {
      setTableState(tbodyCamps, { empty: true, colSpan: 7, message: 'Nenhum campeonato encontrado com os filtros aplicados.' });
      return;
    }

    campsList.forEach((c) => {
        const tr = document.createElement('tr');
        const tdC = document.createElement('td');
        tdC.textContent = c.nome || c.id;

        const tdTipo2 = document.createElement('td');
        tdTipo2.textContent = c.tipo || '—';

        const tdS = document.createElement('td');
        const statusClass = (c.status || '').toLowerCase().replace(/\s+/g, '-');
        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge ${statusClass === 'ativo' ? 'em-andamento' : statusClass}`;
        const statusIcon = statusClass === 'ativo' || statusClass === 'em-andamento' ? 'play-circle' :
                          statusClass === 'finalizado' ? 'check-circle' :
                          statusClass === 'cancelado' ? 'times-circle' : 'clock';
        statusBadge.innerHTML = `<i class="fas fa-${statusIcon}"></i> ${c.status || '-'}`;
        tdS.appendChild(statusBadge);

        const tdCriado2 = document.createElement('td');
        tdCriado2.textContent = formatDateTime(c.criadoEm || null);

        const tdFim2 = document.createElement('td');
        tdFim2.textContent = formatDateTime(c.dataFim || c.finalizadoEm || null);

        const tdParticipantes = document.createElement('td');
        tdParticipantes.className = 'numeric';
        tdParticipantes.textContent = Array.isArray(c.participantesIds) ? c.participantesIds.length : '—';

        const tdA = document.createElement('td');
        tdA.className = 'admin-actions';

        // Botão Status (estatísticas)
        const btnStatus = document.createElement('button');
        btnStatus.className = 'btn-icon action-blue';
        btnStatus.innerHTML = '<i class="fas fa-chart-bar"></i>';
        btnStatus.title = 'Ver Status';
        btnStatus.onclick = async () => {
          const wrapper = document.createElement('div');
          
          // Grid de estatísticas
          const statsGrid = document.createElement('div');
          statsGrid.className = 'campeonato-stats-grid';
          
          const participantes = Array.isArray(c.participantesIds) ? c.participantesIds.length : 0;
          const partidas = c.totalPartidas || 0;
          const partidasRealizadas = c.partidasRealizadas || 0;
          
          statsGrid.innerHTML = `
            <div class="stat-card">
              <span class="stat-value">${participantes}</span>
              <span class="stat-label">Participantes</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">${partidas}</span>
              <span class="stat-label">Total Partidas</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">${partidasRealizadas}</span>
              <span class="stat-label">Realizadas</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">${partidas - partidasRealizadas}</span>
              <span class="stat-label">Pendentes</span>
            </div>
          `;
          
          // Lista de informações
          const infoList = document.createElement('ul');
          infoList.className = 'campeonato-info-list';
          infoList.innerHTML = `
            <li><span class="info-label">Nome</span><span class="info-value">${c.nome || '—'}</span></li>
            <li><span class="info-label">Tipo</span><span class="info-value">${c.tipo || '—'}</span></li>
            <li><span class="info-label">Status</span><span class="info-value">${c.status || '—'}</span></li>
            <li><span class="info-label">Criado em</span><span class="info-value">${formatDateTime(c.criadoEm)}</span></li>
            <li><span class="info-label">Campeão</span><span class="info-value">${c.campeaoId || '—'}</span></li>
          `;
          
          wrapper.appendChild(statsGrid);
          wrapper.appendChild(infoList);
          
          await createOverlayForm({ title: `Status: ${c.nome || 'Campeonato'}`, bodyEl: wrapper, primaryText: 'Fechar', secondaryText: '' });
        };

        if (c.status === 'ConvitesPendentes') {
          const btnStart = document.createElement('button');
          btnStart.className = 'btn-icon action-orange';
          btnStart.innerHTML = '<i class="fas fa-flag-checkered"></i>';
          btnStart.title = 'Iniciar';
          btnStart.onclick = async () => {
            const ok = await showConfirmModal('Iniciar campeonato', 'Iniciar este campeonato? Só será permitido se todos os convites estiverem confirmados.');
            if (!ok) return;
            try {
              await startChampionship({ campeonatoId: c.id, actorUserId: user.uid, actorRole: role });
              showModal('success', 'Iniciado', 'Campeonato iniciado com sucesso.');
            } catch (e) {
              showModal('error', 'Erro', e?.message || 'Falha ao iniciar campeonato.');
            }
          };

          tdA.appendChild(btnStart);
        } else if (c.status === 'Ativo') {
          const btnFin = document.createElement('button');
          btnFin.className = 'btn-icon action-green';
          btnFin.innerHTML = '<i class="fas fa-flag-checkered"></i>';
          btnFin.title = 'Finalizar';
          btnFin.onclick = async () => {
            const ok = await showConfirmModal('Finalizar campeonato', 'Calcular campeão e finalizar? Esta ação será registrada no log.');
            if (!ok) return;
            try {
              const result = await finalizeChampionship({ campeonatoId: c.id, actorUserId: user.uid, actorRole: role });
              showModal('success', 'Finalizado', `Campeão: ${result.campeaoId}`);
            } catch (e) {
              showModal('error', 'Erro', e?.message || 'Falha ao finalizar campeonato.');
            }
          };

          tdA.appendChild(btnFin);
        }

        // Botão Cancelar (apenas para campeonatos ativos ou pendentes) - COM ANÁLISE DE IMPACTO
        if (c.status === 'Ativo' || c.status === 'ConvitesPendentes') {
          const btnCancel = document.createElement('button');
          btnCancel.className = 'btn-icon action-orange';
          btnCancel.innerHTML = '<i class="fas fa-ban"></i>';
          btnCancel.title = 'Cancelar';
          btnCancel.onclick = async () => {
            const wrapper = document.createElement('div');
            
            // Warning
            const warning = document.createElement('div');
            warning.className = 'excluir-warning';
            warning.innerHTML = `
              <i class="fas fa-exclamation-triangle"></i>
              <div class="excluir-warning-content">
                <div class="excluir-warning-title">Cancelar Campeonato</div>
                <div class="excluir-warning-text">Esta ação irá cancelar o campeonato "${c.nome}" e afetar todos os participantes.</div>
              </div>
            `;
            wrapper.appendChild(warning);

            // Análise de impacto (inicialmente com loading)
            const impactEl = createImpactAnalysisElement('Análise de Impacto', [], true);
            wrapper.appendChild(impactEl);

            // Busca impacto em background
            getCancelChampionshipImpact(c.id, c).then(impact => {
              const items = [
                { icon: 'users', label: 'Participantes afetados', value: impact.participantes, type: impact.participantes > 0 ? 'impact-warning' : 'impact-info' },
                { icon: 'futbol', label: 'Total de partidas', value: impact.totalPartidas, type: 'impact-info' },
                { icon: 'clock', label: 'Partidas pendentes', value: impact.partidasPendentes, type: impact.partidasPendentes > 0 ? 'impact-warning' : 'impact-info' }
              ];
              const newImpactEl = createImpactAnalysisElement('Análise de Impacto', items);
              impactEl.replaceWith(newImpactEl);
            });

            // Opções de modo
            const optionsDiv = document.createElement('div');
            optionsDiv.innerHTML = `
              <p style="margin: 16px 0 12px 0; font-weight: 500;">Modo de cancelamento:</p>
              <div class="cancelar-options">
                <label class="cancelar-option">
                  <input type="radio" name="cancelar-modo" value="silencioso" checked>
                  <div class="cancelar-option-content">
                    <div class="cancelar-option-title">Cancelamento silencioso</div>
                    <div class="cancelar-option-desc">O campeonato será cancelado sem notificar os participantes.</div>
                  </div>
                </label>
                <label class="cancelar-option">
                  <input type="radio" name="cancelar-modo" value="notificar">
                  <div class="cancelar-option-content">
                    <div class="cancelar-option-title">Notificar participantes</div>
                    <div class="cancelar-option-desc">Os participantes receberão uma notificação sobre o cancelamento.</div>
                  </div>
                </label>
              </div>
            `;
            wrapper.appendChild(optionsDiv);
            
            const okForm = await createOverlayForm({ 
              title: 'Cancelar Campeonato', 
              bodyEl: wrapper, 
              primaryText: 'Confirmar Cancelamento',
              secondaryText: 'Voltar'
            });
            
            if (!okForm) return;
            
            const modo = wrapper.querySelector('input[name="cancelar-modo"]:checked')?.value || 'silencioso';
            
            try {
              const { db } = await import('../services/firebase.js');
              const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
              
              await updateDoc(doc(db, 'campeonatos', c.id), { 
                status: 'Cancelado',
                canceladoEm: serverTimestamp(),
                canceladoPor: user.uid,
                motivoCancelamento: modo === 'notificar' ? 'Cancelado pelo administrador' : null
              });
              
              // Registra no log
              await addLogEntry({
                acao: 'cancelar_campeonato',
                userIdResponsavel: user.uid,
                entidadeAfetada: c.id,
                detalhes: { nome: c.nome, modo, participantes: Array.isArray(c.participantesIds) ? c.participantesIds.length : 0 }
              });
              
              if (modo === 'notificar' && Array.isArray(c.participantesIds)) {
                // Envia notificações aos participantes
                const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
                for (const participanteId of c.participantesIds) {
                  await addDoc(collection(db, 'notificacoes'), {
                    userId: participanteId,
                    tipo: 'campeonato_cancelado',
                    titulo: 'Campeonato Cancelado',
                    mensagem: `O campeonato "${c.nome}" foi cancelado pelo administrador.`,
                    lida: false,
                    criadoEm: serverTimestamp()
                  });
                }
              }
              
              showModal('success', 'Cancelado', 'Campeonato cancelado com sucesso.');
            } catch (e) {
              console.error('[admin] cancelar campeonato erro:', e);
              showModal('error', 'Erro', e?.message || 'Falha ao cancelar campeonato.');
            }
          };
          
          tdA.appendChild(btnCancel);
        }

        // Botão PDF (apenas para finalizados ou ativos com tabela)
        if (c.status === 'Finalizado' || (c.status === 'Ativo' && Array.isArray(c.tabelaFinal))) {
          const btnPdf = document.createElement('button');
          btnPdf.className = 'btn-icon action-green';
          btnPdf.innerHTML = '<i class="fas fa-file-pdf"></i>';
          btnPdf.title = 'Gerar PDF';
          btnPdf.onclick = async () => {
            try {
              const ranking = Array.isArray(c.tabelaFinal) ? c.tabelaFinal : null;
              if (!ranking) {
                showModal('info', 'Sem tabela final', 'Finalize o campeonato para gerar PDF com tabela final.');
                return;
              }
              const ids = ranking.map((r) => r.id);
              const map = await getUserMap(ids);
              const users = ids.map((id) => ({ id, ...(map.get(id) || {}) }));
              await gerarPdfTabela({ titulo: `Tabela Final - ${c.nome || c.id}`, ranking, users });
            } catch (e) {
              showModal('error', 'Erro', e?.message || 'Falha ao gerar PDF.');
            }
          };
          
          tdA.appendChild(btnPdf);
        }

        // Botão Excluir (apenas para cancelados ou finalizados)
        if (c.status === 'Cancelado' || c.status === 'Finalizado') {
          const btnDelete = document.createElement('button');
          btnDelete.className = 'btn-icon action-red';
          btnDelete.innerHTML = '<i class="fas fa-trash-alt"></i>';
          btnDelete.title = 'Excluir';
          btnDelete.onclick = async () => {
            const ok = await showConfirmModal('Excluir campeonato', `Deseja excluir permanentemente o campeonato "${c.nome}"? Esta ação não pode ser desfeita.`);
            if (!ok) return;
            
            try {
              const { db } = await import('../services/firebase.js');
              const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js');
              
              await addLogEntry({
                acao: 'excluir_campeonato',
                userIdResponsavel: user.uid,
                entidadeAfetada: c.id,
                detalhes: { nome: c.nome }
              });
              
              await deleteDoc(doc(db, 'campeonatos', c.id));
              showModal('success', 'Excluído', 'Campeonato excluído permanentemente.');
            } catch (e) {
              console.error('[admin] excluir campeonato erro:', e);
              showModal('error', 'Erro', e?.message || 'Falha ao excluir campeonato.');
            }
          };
          
          tdA.appendChild(btnDelete);
        }

        tdA.appendChild(btnStatus);

        tr.appendChild(tdC);
        tr.appendChild(tdTipo2);
        tr.appendChild(tdS);
        tr.appendChild(tdCriado2);
        tr.appendChild(tdFim2);
        tr.appendChild(tdParticipantes);
        tr.appendChild(tdA);
        tbodyCamps.appendChild(tr);
      });
  }

  function setupRodadasListener() {
    // Remove listener anterior de rodadas
    const existing = unsub.find((u) => u && u.__kind === 'rodadas');
    if (existing) {
      try { existing(); } catch (e) {}
      const idx = unsub.indexOf(existing);
      if (idx >= 0) unsub.splice(idx, 1);
    }

    const un = subscribeRodadasFixas(async (matches, err) => {
      if (err) {
        console.error('[admin] rodadas err', err);
        setTableState(tbodyRodadas, { error: err, colSpan: 5, message: 'Erro ao carregar rodadas fixas.' });
        return;
      }

      const list = (matches || []).slice().sort((x, y) => {
        const ax = x.dataPartida || x.criadoEm || x.atualizadoEm;
        const ay = y.dataPartida || y.criadoEm || y.atualizadoEm;
        const dx = ax && typeof ax.toDate === 'function' ? ax.toDate().getTime() : 0;
        const dy = ay && typeof ay.toDate === 'function' ? ay.toDate().getTime() : 0;
        return dy - dx;
      });
      tbodyRodadas.innerHTML = '';

      if (!list.length) {
        setTableState(tbodyRodadas, { empty: true, colSpan: 5, message: 'Nenhum amistoso encontrado.' });
        return;
      }

      list.forEach((m) => {
        const tr = document.createElement('tr');

        const tdMatch = document.createElement('td');
        tdMatch.textContent = `${m.jogadorANome || m.jogadorAId} vs ${m.jogadorBNome || m.jogadorBId}`;

        const tdDate = document.createElement('td');
        tdDate.textContent = formatDateTime(m.dataPartida || m.criadoEm);

        const tdStatus = document.createElement('td');
        const statusClass = (m.placarStatus || m.status || '').toLowerCase().replace(/\s+/g, '-');
        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge ${statusClass === 'confirmado' ? 'ativo' : statusClass === 'contestado' ? 'inativo' : 'pendente'}`;
        statusBadge.textContent = m.placarStatus || m.status || '-';
        tdStatus.appendChild(statusBadge);

        const tdDetails = document.createElement('td');
        tdDetails.textContent = String(m.placarStatus || '').toLowerCase() === 'contestado' ? (m.motivoContestacao || '-') : '-';

        const tdActions = document.createElement('td');
        tdActions.className = 'admin-actions';

        // Botão Forçar Placar - COM ANÁLISE DE IMPACTO
        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn-icon action-blue';
        btnEdit.innerHTML = '<i class="fas fa-edit"></i>';
        btnEdit.title = 'Resolver contestação / Forçar placar';
        btnEdit.onclick = async () => {
          try {
            const status = String(m.placarStatus || '').toLowerCase();
            if (status !== STATUS_PLACAR.CONTESTADO) {
              showModal('info', 'Sem contestação', 'Use esta ação para forçar o placar quando a partida estiver CONTESTADA por algum jogador.');
              return;
            }

            // Mostra modal com análise de impacto
            const wrapper = document.createElement('div');
            
            // Warning
            const warning = document.createElement('div');
            warning.className = 'excluir-warning';
            warning.style.marginBottom = '16px';
            warning.innerHTML = `
              <i class="fas fa-gavel"></i>
              <div class="excluir-warning-content">
                <div class="excluir-warning-title">Forçar Placar</div>
                <div class="excluir-warning-text">Você está prestes a definir o placar final desta partida contestada. Esta ação sobrescreve qualquer contestação.</div>
              </div>
            `;
            wrapper.appendChild(warning);

            // Análise de impacto
            const impact = await getForceScoreImpact(m.id, m);
            const impactItems = [
              { icon: 'user', label: 'Jogador A', value: impact.jogadorA, type: 'impact-info' },
              { icon: 'user', label: 'Jogador B', value: impact.jogadorB, type: 'impact-info' },
              { icon: 'futbol', label: 'Placar atual', value: impact.placarAtual || 'Não definido', type: 'impact-info' },
              { icon: 'trophy', label: 'Tipo', value: impact.isCampeonato ? 'Partida de Campeonato' : 'Amistoso', type: impact.isCampeonato ? 'impact-warning' : 'impact-info' }
            ];
            const impactEl = createImpactAnalysisElement('Detalhes da Partida', impactItems);
            wrapper.appendChild(impactEl);

            // Inputs de placar
            const placarDiv = document.createElement('div');
            placarDiv.className = 'forcar-placar-inputs';
            placarDiv.innerHTML = `
              <p style="margin: 16px 0 12px 0; font-weight: 500;">Definir placar final:</p>
              <div style="display: flex; gap: 16px; align-items: center; justify-content: center;">
                <div style="text-align: center;">
                  <label style="display: block; margin-bottom: 4px; font-size: 12px; opacity: 0.7;">${impact.jogadorA}</label>
                  <input type="number" id="forcarPlacarA" min="0" max="99" value="${m.placarA ?? 0}" style="width: 60px; padding: 10px; text-align: center; font-size: 18px; font-weight: bold; border-radius: 8px; border: 1px solid var(--border-color);">
                </div>
                <span style="font-size: 24px; font-weight: bold;">×</span>
                <div style="text-align: center;">
                  <label style="display: block; margin-bottom: 4px; font-size: 12px; opacity: 0.7;">${impact.jogadorB}</label>
                  <input type="number" id="forcarPlacarB" min="0" max="99" value="${m.placarB ?? 0}" style="width: 60px; padding: 10px; text-align: center; font-size: 18px; font-weight: bold; border-radius: 8px; border: 1px solid var(--border-color);">
                </div>
              </div>
            `;
            wrapper.appendChild(placarDiv);

            const okForm = await createOverlayForm({ 
              title: 'Forçar Placar', 
              bodyEl: wrapper, 
              primaryText: 'Confirmar Placar',
              secondaryText: 'Cancelar'
            });
            
            if (!okForm) return;

            const placarA = parseInt(wrapper.querySelector('#forcarPlacarA')?.value, 10);
            const placarB = parseInt(wrapper.querySelector('#forcarPlacarB')?.value, 10);

            if (isNaN(placarA) || isNaN(placarB) || placarA < 0 || placarB < 0) {
              showModal('error', 'Dados inválidos', 'Informe placares válidos (números >= 0).');
              return;
            }

            await forcarConfirmacao(m.id, user.uid, placarA, placarB);
            showModal('success', 'Sucesso', 'Placar confirmado com sucesso.');
          } catch (e) {
            showModal('error', 'Erro', e?.message || 'Falha ao forçar placar.');
          }
        };

        const btnDel = document.createElement('button');
        btnDel.className = 'btn-icon action-red';
        btnDel.innerHTML = '<i class="fas fa-trash-alt"></i>';
        btnDel.title = 'Excluir';
        btnDel.onclick = async () => {
          const ok = await showConfirmModal('Excluir partida', 'Deseja excluir este confronto? Esta ação será registrada no log.');
          if (!ok) return;
          try {
            await deleteMatch({ partidaId: m.id, actorUserId: user.uid, actorRole: role });
            showModal('success', 'Excluída', 'Partida removida.');
          } catch (e) {
            showModal('error', 'Erro', e?.message || 'Falha ao excluir partida.');
          }
        };

        tdActions.appendChild(btnEdit);
        tdActions.appendChild(btnDel);

        tr.appendChild(tdMatch);
        tr.appendChild(tdDate);
        tr.appendChild(tdStatus);
        tr.appendChild(tdDetails);
        tr.appendChild(tdActions);
        tbodyRodadas.appendChild(tr);
      });
    });

    // tag para remover depois
    un.__kind = 'rodadas';
    unsub.push(un);
  }

  // Rodadas Fixas não dependem de campeonato
  setupRodadasListener();

  // LOGS
  unsub.push(
    subscribeLogs(async (logs, err) => {
      if (err) {
        console.error('[admin] logs err', err);
        setTableState(tbodyLogs, { error: err, colSpan: 4, message: 'Erro ao carregar logs.' });
        return;
      }

      const list = logs || [];
      if (!list.length) {
        setTableState(tbodyLogs, { empty: true, colSpan: 4, message: 'Nenhum log encontrado.' });
        return;
      }

      const ids = Array.from(new Set(list.map((l) => l.userIdResponsavel).filter(Boolean)));
      const map = ids.length ? await getUserMap(ids) : new Map();

      tbodyLogs.innerHTML = '';
      list.forEach((l) => {
        const tr = document.createElement('tr');

        const tdDate = document.createElement('td');
        tdDate.textContent = formatDateTime(l.data);

        const tdResp = document.createElement('td');
        const u = l.userIdResponsavel ? (map.get(l.userIdResponsavel) || {}) : null;
        tdResp.textContent = u ? (u.nome || u.email || l.userIdResponsavel) : 'Sistema';

        const tdAcao = document.createElement('td');
        tdAcao.textContent = friendlyAction(l.acao);

        const tdDet = document.createElement('td');
        tdDet.textContent = friendlyDetails({ acao: l.acao, detalhes: l.detalhes, entidadeAfetada: l.entidadeAfetada });

        tr.appendChild(tdDate);
        tr.appendChild(tdResp);
        tr.appendChild(tdAcao);
        tr.appendChild(tdDet);

        tbodyLogs.appendChild(tr);
      });
    })
  );

  // Cleanup quando sair
  window.destruirAdmin = () => {
    unsub.forEach((u) => {
      try { if (typeof u === 'function') u(); } catch (e) {}
    });
    unsub.length = 0;
  };
}

// Executa ao carregar a página
try {
  const container = document.querySelector('main.app-content');
  if (container) showSpinner(container);
  adminInit();
  if (container) hideSpinner();
} catch (e) {
  console.error('[admin] init error', e);
  showModal('error', 'Erro', 'Falha ao inicializar painel admin.');
}
