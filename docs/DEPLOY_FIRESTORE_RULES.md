# Deploy das Regras do Firestore

## Problema Resolvido
- ❌ **Erro anterior**: `FirebaseError: Missing or insufficient permissions` ao marcar mensagens como entregues
- ✅ **Correção**: Regra do Firestore atualizada para permitir atualizar campo `entregue`

## Como Fazer o Deploy

### Opção 1: Via Firebase CLI (Recomendado)

```bash
# No terminal, na raiz do projeto
firebase deploy --only firestore:rules
```

### Opção 2: Via Console do Firebase

1. Acesse: https://console.firebase.google.com
2. Selecione seu projeto
3. Vá em **Firestore Database**
4. Clique na aba **Regras**
5. Copie o conteúdo do arquivo `config/firestore.rules`
6. Cole no editor online
7. Clique em **Publicar**

## Regra Corrigida

**Antes** (ERRO):
```javascript
allow update: if isAuthenticated() && 
  resource.data.remetenteId != request.auth.uid &&
  request.resource.data.lida == true &&
  // ❌ Só permitia atualizar quando lida == true
```

**Depois** (CORRETO):
```javascript
allow update: if isAuthenticated() && 
  resource.data.remetenteId != request.auth.uid &&
  request.resource.data.remetenteId == resource.data.remetenteId &&
  request.resource.data.conteudo == resource.data.conteudo &&
  (
    // ✅ Permite marcar como entregue
    (request.resource.data.entregue == true && 
     request.resource.data.lida == resource.data.lida) ||
    // ✅ Permite marcar como lida
    (request.resource.data.lida == true)
  );
```

## Validação

Após o deploy, teste:

1. Envie uma mensagem entre dois usuários
2. O destinatário abre o chat
3. Verifique no console:
   - ✅ Não deve aparecer erro de permissão
   - ✅ Mensagens devem ser marcadas como entregues (✓✓ cinza)
   - ✅ Ao ler, mensagens devem ficar com ✓✓ azul

## Sistema de Ticks (WhatsApp)

| Estado | Visual | Cor | Campo |
|--------|--------|-----|-------|
| Enviado | ✓ | Cinza | `enviado: true` |
| Entregue | ✓✓ | Cinza | `entregue: true` |
| Lido | ✓✓ | Azul | `lida: true` |

## Estrutura de Mensagem

```javascript
{
  remetenteId: "userId1",
  conteudo: "Olá!",
  tipo: "texto",
  dataEnvio: Timestamp,
  enviado: true,      // ✓ cinza
  entregue: false,    // ✓✓ cinza (quando true)
  lida: false         // ✓✓ azul (quando true)
}
```
