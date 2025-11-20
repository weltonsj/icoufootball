# 🗺️ Roadmap de Desenvolvimento - iCouFootball V1.0

Este roadmap detalha as fases de desenvolvimento para a versão 1.0 do iCouFootball, focado na utilização de HTML5, CSS e JavaScript Vanilla, com Firebase para backend/auth e Firestore para o banco de dados.

## Fase 0: Configuração e Design (2-3 Semanas)

**Objetivo:** Estabelecer a base técnica, o ambiente de desenvolvimento e a identidade visual completa.

| Item | Requisitos Relacionados | Detalhamento das Tarefas |
| :--- | :--- | :--- |
| **Ambiente Inicial** | [cite_start]RF2 (Firebase Auth) [cite: 27] | [cite_start]Configuração inicial do projeto Firebase e do banco de dados Firestore[cite: 95]. Configurar ambiente de desenvolvimento Vanilla JS. |
| **Identidade Visual** | [cite_start]UI/UX (Design) [cite: 19] | [cite_start]Criação do CSS com as cores primárias (`#FD8A24` e `#605F54`) [cite: 6] e tipografia. [cite_start]Definir o design **responsivo (Mobile First)**[cite: 19]. |
| **Modo Escuro** | [cite_start]UI/UX (Modo Escuro) [cite: 19] | [cite_start]Implementação do tema escuro como padrão ou com alternância fácil[cite: 19]. |
| **Acessibilidade** | [cite_start]UI/UX (Acessibilidade) [cite: 19] | [cite_start]Verificação e ajuste de contraste entre texto e fundo[cite: 19]. |
| **Módulos JS** | [cite_start]Desenvolvimento [cite: 4] | [cite_start]Estruturação dos módulos JS (e.g., Auth, UI, Firestore CRUD)[cite: 4]. |

## Fase 1: Core System (Autenticação e Tabela Pública) (4-6 Semanas)

**Objetivo:** Lançar a base de dados, autenticação e a Home Page em tempo real (Transparência).

| Item | Requisitos Relacionados | Detalhamento das Tarefas |
| :--- | :--- | :--- |
| **Autenticação (Login/Registro)** | [cite_start]RF2 [cite: 27] | [cite_start]Implementar Firebase Authentication (e-mail/senha) e a Recuperação de Senha[cite: 28, 32]. |
| **Home Page (Pública)** | [cite_start]RF1 [cite: 21][cite_start], RNF1 [cite: 87] | [cite_start]Desenvolvimento da Home Page [cite: 21] e do componente de tabela. [cite_start]Implementar conexão **`onSnapshot` do Firestore** para atualização em tempo real[cite: 23, 87]. |
| **Lógica da Tabela I** | [cite_start]RF1, RF6 [cite: 48] | [cite_start]Implementação do cálculo de Pontos Corridos (3/1/0) [cite: 37] [cite_start]e ordenação básica (P, V, SG, GP, GC)[cite: 24]. |
| **Tabela de Players** | [cite_start]RF1 [cite: 25] | [cite_start]Exibição da lista de jogadores com nome, time e estrelas (parcialmente)[cite: 25]. |
| **Gestão de Perfil (Base)** | [cite_start]RF8 [cite: 63] | [cite_start]Módulo inicial para Jogador gerenciar Nome, Descrição e Perfil Público/Privado[cite: 64, 66, 67]. |

## Fase 2: Gestão e Fair Play (6-8 Semanas)

**Objetivo:** Entregar o Painel do Administrador e o sistema central de Fair Play (Confirmação de Placar).

| Item | Requisitos Relacionados | Detalhamento das Tarefas |
| :--- | :--- | :--- |
| **Painel Admin** | [cite_start]RF3, RF4 [cite: 33, 36] | [cite_start]Criação do Painel de Controle (restrito via Firebase Auth)[cite: 88]. [cite_start]Implementação das funções de Gestão de Usuários (Inativar, Excluir Terceiros, Mudar Função)[cite: 35]. |
| **Gestão de Campeonatos** | [cite_start]RF4 [cite: 36] | Implementação da criação/início/fim do campeonato. [cite_start]Módulo para Admin pré-definir **Rodadas Fixas**[cite: 39]. |
| **Sistema Fair Play** | [cite_start]RF5 [cite: 43] | [cite_start]Módulo de **Lançamento de Placar** por Jogador (Status "Pendente")[cite: 44]. [cite_start]Implementação da **Confirmação** pelo Jogador B[cite: 46]. |
| **Forçar e Logs** | [cite_start]RF5, RF9 [cite: 47, 73] | [cite_start]Função de **Forçar Confirmação** para Admin[cite: 47]. [cite_start]Implementação do **Log de Atividades** (Firestore) para registrar ações críticas do Admin[cite: 79]. |
| **Comunicação Básica** | [cite_start]RF9 [cite: 74] | [cite_start]Implementação do **Chat Interno** (requer Firestore) para usuários logados[cite: 74]. |

## Fase 3: Refinamento e Funcionalidades Avançadas (4-5 Semanas)

**Objetivo:** Finalizar os requisitos de UI/UX, integrar APIs externas e a lógica de desempate.

| Item | Requisitos Relacionados | Detalhamento das Tarefas |
| :--- | :--- | :--- |
| **Integração Imagens** | [cite_start]RF3, RNF4 [cite: 35, 87] | [cite_start]Módulo de upload de foto de perfil (Validação: `.jpg`/`.png` < 2MB) [cite: 35, 87] e integração com ImgBB. [cite_start]Implementação de **fallback/placeholder** (RNF3)[cite: 87]. |
| **Integração Times** | [cite_start]RF3, RNF3 [cite: 35, 87] | [cite_start]Integração com **TheSportsDB** para escolha de time[cite: 35]. [cite_start]Implementação de **fallback/placeholder** (RNF3)[cite: 87]. |
| **Critério de Desempate** | [cite_start]RF6 [cite: 48] | [cite_start]Implementação da lógica de desempate final por **Confronto Direto**[cite: 50]. |
| **Estatísticas Avançadas** | [cite_start]RF7 [cite: 51] | [cite_start]Cálculo e exibição das Estatísticas Avançadas (Melhor Ataque, Melhor Defesa) na Home Page [cite: 26] [cite_start]e no Dashboard Pessoal[cite: 52]. |
| **Transmissão e Estrelas** | [cite_start]RNF5 [cite: 87][cite_start], RF8 [cite: 68] | [cite_start]Adicionar campo de **Link de Transmissão** na partida[cite: 87]. [cite_start]Implementar a lógica de cálculo e exibição do **Sistema de Estrelas**[cite: 70]. |
| **Notificações por E-mail** | [cite_start]RF9 [cite: 75] | [cite_start]Configuração da ferramenta de envio de e-mails para Admin (Início de Campeonato/Rodada)[cite: 76, 77, 78]. |

## Fase 4: Finalização e Lançamento (2 Semanas)

**Objetivo:** Testes, documentação e entrega da versão 1.0.

| Item | Requisitos Relacionados | Detalhamento das Tarefas |
| :--- | :--- | :--- |
| **Testes de Segurança** | [cite_start]RNF6 [cite: 88] | [cite_start]Testes de acesso e permissões (Admin vs. Jogador)[cite: 88]. |
| **Testes de Performance** | [cite_start]RNF1 [cite: 87] | [cite_start]Garantir que o tempo de carregamento da tabela não exceda 2s[cite: 87]. |
| **Arquivamento/Exportação** | [cite_start]RF4 [cite: 41] | [cite_start]Finalizar a função de Arquivamento de campeonatos (máximo 12 meses) [cite: 41] [cite_start]e a função de **Exportação em PDF** (Admin)[cite: 42]. |
| **Documentação Técnica** | N/A | [cite_start]Documentação final do código e da estrutura do Firestore Schema[cite: 95]. |
| **Deploy** | N/A | Lançamento da versão 1.0. |

---

## 🔮 Roadmap Futuro (V2.0+)

[cite_start]Estas são sugestões para melhorias após o lançamento da V1.0[cite: 89].

* [cite_start]**Notificação Push:** Implementação via **Firebase Cloud Messaging (FCM)** para Fair Play mais rápido[cite: 91].
* [cite_start]**Visualização Gráfica:** Adicionar gráficos simples (barras/pizza) para estatísticas[cite: 92].
* [cite_start]**Sistema de Troféus:** Implementar "Troféus" virtuais por conquistas (Artilheiro, etc.)[cite: 93].
* [cite_start]**Sistema de Votação (MVP):** Permitir votos em "Melhor Jogador da Rodada"[cite: 94].

Este roadmap é um documento vivo e será atualizado conforme o projeto evolui.