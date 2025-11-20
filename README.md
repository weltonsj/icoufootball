# ⚽ iCouFootball: Sistema de Gestão de Campeonatos FC25 (EAFC)

O iCouFootball é um sistema web focado em transparência e confiabilidade para o gerenciamento e exibição de estatísticas de campeonatos no formato de **Pontos Corridos** para o jogo FC25 (EAFC).

## 🚀 Informações Gerais

| Detalhe | Valor |
| :--- | :--- |
| [cite_start]**Nome do Produto** | iCouFootball [cite: 1] |
| **Versão** | [cite_start]1.0 [cite: 2] |
| **Data do PRD** | [cite_start]20 de Novembro de 2025 [cite: 3] |
| **Desenvolvimento (Stack)** | [cite_start]HTML5, CSS e JavaScript (Vanilla - Sem Frameworks) [cite: 4] |
| **Idioma Padrão** | [cite_start]Português (Brasil) [cite: 5] |
| **Cores Primárias** | [cite_start]`#FD8A24` (Laranja) e `#605F54` (Cinza Escuro) [cite: 6] |
| **Foco** | [cite_start]Experiência pública, dinâmica e confiável no formato Pontos Corridos[cite: 8]. |

---

## 1. ✨ Metas e Visão do Produto

[cite_start]A missão do iCouFootball é ser uma plataforma **fácil de usar** [cite: 9] [cite_start]que oferece uma experiência de acompanhamento de competições limpa e transparente[cite: 9, 12].

| [cite_start]Meta [cite: 10] | Descrição |
| :--- | :--- |
| **Transparência** | [cite_start]Tabela e estatísticas **públicas** e atualizadas **em tempo real**[cite: 12]. |
| **Confiabilidade** | [cite_start]Sistema de **validação de placar (Fair Play)** e critérios de desempate robustos (incluindo Confronto Direto)[cite: 13, 24]. |
| **Gestão Simplificada** | [cite_start]Painel de controle **intuitivo** para Administradores[cite: 14]. |
| **Experiência do Jogador** | [cite_start]Autonomia para gerenciar perfis e inserir resultados[cite: 15]. |

---

## 2. ⚙️ Requisitos Funcionais Principais

### 2.1. Home Page (Pública)
[cite_start]A Home Page deve ser a vitrine do campeonato, acessível sem login[cite: 22].
* [cite_start]Exibição da **tabela atual** do campeonato em Pontos Corridos[cite: 22].
* [cite_start]Atualização da tabela em **tempo real** via `onSnapshot` do Firestore[cite: 23].
* [cite_start]Ranking listado por: **Pontos (P), Vitórias (V), Saldo de Gols (SG), Gols Pró (GP), Gols Contra (GC)**, e **Confronto Direto** como critério final de desempate[cite: 24, 50].
* [cite_start]Exibição de Estatísticas Avançadas (Melhor Ataque, Melhor Defesa, etc.)[cite: 26].

### 2.2. Inserção e Validação de Placar (Fair Play)
[cite_start]O processo deve garantir a confiabilidade dos resultados[cite: 13].
1.  [cite_start]**Lançamento:** O Jogador insere o placar, e o sistema registra como **"Confirmação Pendente"**[cite: 44].
2.  [cite_start]**Notificação:** O Jogador adversário recebe uma notificação (painel e/ou e-mail)[cite: 45].
3.  [cite_start]**Confirmação:** O Jogador adversário deve clicar em "Confirmar" para que o placar seja validado e os pontos atualizados[cite: 46].
4.  [cite_start]**Disputa:** O **Administrador** pode, a qualquer momento, **forçar a confirmação** do placar[cite: 47].

### 2.3. Autenticação e Perfis
* [cite_start]**Mecanismo:** Firebase Authentication (e-mail/senha)[cite: 28].
* [cite_start]**Tipos de Usuário:** Administrador (Controle total) [cite: 30] [cite_start]e Jogador (Permissões limitadas, foco na participação)[cite: 31].
* [cite_start]**Gestão de Perfil (Jogador):** Pode editar Nome, Time (Integração com TheSportsDB) [cite: 35, 64][cite_start], Descrição e Links de Redes Sociais[cite: 64].
* [cite_start]**Sistema de Estrelas:** Cada campeonato vencido confere uma estrela, com máximo de 5 visíveis[cite: 70, 71].

### 2.4. Gerenciamento (Admin)
[cite_start]O Administrador tem controle total[cite: 30]:
* [cite_start]**Campeonatos:** Iniciar/Finalizar [cite: 35][cite_start], pré-definir todas as Rodadas Fixas [cite: 39][cite_start], e exportar Tabela Final em PDF[cite: 42].
* [cite_start]**Usuários/Placares:** Editar/Remover placares [cite: 34][cite_start], Forçar Confirmação [cite: 34, 47][cite_start], Inativar Jogador [cite: 35][cite_start], e Excluir contas de terceiros[cite: 35].
* [cite_start]**Logs:** Acesso ao **Log de Atividades** para registrar ações críticas (ex: "Admin forçou confirmação do placar X")[cite: 79, 81].

---

## 3. 🛡️ Requisitos Não Funcionais (RNF)

| ID | Requisito | Detalhamento |
| :--- | :--- | :--- |
| **RNF1** | Performance | [cite_start]Tempo de carregamento da tabela **inferior a 2s** devido ao uso do `onSnapshot`[cite: 87]. |
| **RNF3** | Disponibilidade | [cite_start]Interfaces de **fallback/placeholders** são obrigatórias em caso de falha das APIs externas (ImgBB/TheSportsDB)[cite: 87]. |
| **RNF4** | Limitação de Upload | [cite_start]Validação em Frontend: Apenas **.jpg ou .png** e limite de **2MB** para o ImgBB[cite: 87]. |
| **RNF5** | Transmissão | [cite_start]Campo para inserir o **link da transmissão** (Youtube/OBS Studio) na criação da partida[cite: 87]. |
| **RNF6** | Segurança | [cite_start]Acesso ao Painel de Controle restrito via Firebase Auth[cite: 88]. |

---

## 4. 🌐 Proposta de Estrutura de Dados (Firestore Schema)

[cite_start]O banco de dados será estruturado em coleções primárias, com subcoleções para dados aninhados[cite: 96].

| Coleção | Documento (ID) | Descrição dos Campos Chave | Regras de Acesso |
| :--- | :--- | :--- | :--- |
| **users** | [cite_start]`[userId]` [cite: 98] | [cite_start]`nome`, `email`, `funcao`, `timeId`, `fotoUrl` (ImgBB), `estrelas`, `perfilPublico` [cite: 98] | [cite_start]Privado [cite: 98] |
| **campeonatos** | [cite_start]`[campeonatoId]` [cite: 98] | [cite_start]`nome`, `status`, `dataInicio`, `dataFim`, `rodadas` (subcoleção) [cite: 98] | [cite_start]Público [cite: 98] |
| [cite_start]**partidas** (Subcoleção de **rodadas**) [cite: 99] | [cite_start]`[partidaId]` [cite: 99] | [cite_start]`jogadorAId`, `jogadorBId`, `placarStatus` (Pendente/Confirmado/Forçado), `linkTransmissao` [cite: 99] | [cite_start]Público [cite: 99] |
| [cite_start]**logs** (Admin) [cite: 99] | [cite_start]`[logId]` [cite: 99] | [cite_start]`data`, `acao`, `userIdResponsavel`, `detalhes` [cite: 99] | [cite_start]Apenas Admin [cite: 99] |

Este projeto é de código aberto e está disponível para uso e modificação.
