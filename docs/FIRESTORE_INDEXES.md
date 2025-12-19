# Índices Firestore - Sistema de Notificações

## Índice Necessário para `notificacoes`

Para otimizar a query de notificações não lidas, crie o seguinte índice composto:

### Via Console Firebase:
1. Acesse: [Firebase Console](https://console.firebase.google.com/)
2. Navegue para: **Firestore Database** → **Indexes** → **Composite**
3. Clique em **Create Index**
4. Configure:
   - **Collection ID**: `notificacoes`
   - **Fields indexed**:
     - `usuarioId` → Ascending
     - `lida` → Ascending
     - `criadoEm` → Descending (opcional, para ordenação)
   - **Query scope**: Collection

### Via Firebase CLI:

```json
{
  "indexes": [
    {
      "collectionGroup": "notificacoes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "usuarioId", "order": "ASCENDING" },
        { "fieldPath": "lida", "order": "ASCENDING" },
        { "fieldPath": "criadoEm", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Adicione ao arquivo `firestore.indexes.json` e execute:
```bash
firebase deploy --only firestore:indexes
```

## Notas:
- O índice é criado automaticamente quando a primeira query falhar
- Firestore exibe link direto no console do navegador para criar o índice
- Aguarde alguns minutos para o índice ser construído (status: Building → Enabled)
