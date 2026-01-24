
# GUIA DE TESTES - CMO: Roteiro de Promessas

## ✅ Implementação Concluída

### Arquivos Criados:
1. `cmo/promises.js` - Módulo core com localStorage `cmo_promises`
2. `cmo/promises.html` - Página CRUD de promessas
3. `cmo/library.html` - Biblioteca de promessas aprovadas (read-only)
4. `cmo/library.js` - Script da biblioteca
5. `cmo/status.html` - Dashboard de status de validações
6. `cmo/status.js` - Script do status
7. `cmo/cmo.guard.js` - Proteção de acesso (apenas CMO)

### Arquivos Alterados:
- `cmo/index.html` - Nova visão geral com estatísticas e atalhos
- `cmo/cmo.js` - Adicionadas estatísticas de promessas
- `shared/app.js` - Menu CMO atualizado (Roteiro, Status, Biblioteca)
- Todos os `**/proposals.html` - Adicionada categoria "Roteiro de Promessa" (CEO, COO, CFO, CTO, CMO)

---

## 🧪 COMO TESTAR

### **PASSO 1: Fazer login como CMO**
1. Abra a aplicação
2. Email: `cmo@devlizard.com`
3. Senha: `cmo2024`

### **PASSO 2: Navegar até o menu CMO**
- Clique em "Roteiro de Promessas" no menu lateral
- Você deve ver a página `promises.html`

### **PASSO 3: Criar uma Promessa de Teste**
Preencha o formulário com:
- **Título:** `"Integração com Slack até março"`
- **Tipo:** `"Prazo"`
- **Público-alvo:** `"Clientes enterprise"`
- **Prazo prometido:** `45` dias
- **Descrição:** `"Promessa de integração nativa com Slack em até 45 dias para clientes enterprise"`
- **Selecione:** ☑️ Requer validação do CTO

Clique em **"Salvar rascunho"**
- Deve aparecer na lista abaixo como "Rascunho"

### **PASSO 4: Editar a Promessa (ainda em rascunho)**
1. Clique no botão **"Editar"** da promessa criada
2. O formulário é preenchido com os dados
3. Mude o prazo para `60` dias
4. Clique em **"Salvar rascunho"** novamente
5. Confirme que a lista foi atualizada

### **PASSO 5: Enviar para Validação (CTO)**
1. Na promessa em rascunho, clique **"Enviar para validação"**
2. Confirme no diálogo
3. A promessa deve mudar para status **"Aguardando CTO"**
4. Backend deve ter criado uma proposta com:
   - Título: `"[PROMESSA] Integração com Slack até março"`
   - Categoria: `"promessa"`
   - Descrição contendo prazo, público, etc.

### **PASSO 6: Criar outra Promessa com CFO**
Preencha com:
- **Título:** `"Novo pacote PRO a R$499/mês"`
- **Tipo:** `"Preço"`
- **Público-alvo:** `"Mid-market"`
- **Preço:** `499`
- **Descrição:** `"Novo pacote PRO com features avançadas"`
- **Selecione:** ☑️ Requer validação do CFO

Clique **"Salvar rascunho"** e depois **"Enviar para validação"**

### **PASSO 7: Criar Promessa que Exige Ambos (CTO + CFO)**
Preencha com:
- **Título:** `"Suporte 24/7 a $399/cliente/ano"`
- **Tipo:** `"Aluguel/Venda"`
- **Prazo:** `30` dias
- **Preço:** `399`
- **Modelo:** `"Aluguel"`
- **Descrição:** `"Novo serviço de suporte 24/7 com SLA garantido"`
- **Selecione:** ☑️ Requer CTO E ☑️ Requer CFO

Clique **"Enviar para validação"**
- Backend deve criar DUAS propostas: uma para CTO, outra para CFO

### **PASSO 8: Ver Status na Aba Status**
1. Clique em **"Status"** no menu
2. Você deve ver 3 cards:
   - **Aguardando CTO:** 2 promessas (a do Slack e a de Suporte)
   - **Aguardando CFO:** 2 promessas (a do PRO e a de Suporte)
   - **Aprovadas/Rejeitadas:** vazios (por enquanto)

### **PASSO 9: Aprovar/Rejeitar como CTO**
1. Login como CTO: `cto@devlizard.com` / `cto2024`
2. Vá para **"Propostas"** → aba **"Recebidas"**
3. Você deve ver as propostas de promessas (com categoria "promessa")
4. Clique em **"Aprovar"** na promessa de Slack:
   - Adicione comentário: `"Viável, podemos entregar em 40 dias"`
   - Clique em ✓ **Aprovar**

### **PASSO 10: Aprovar/Rejeitar como CFO**
1. Login como CFO: `cfo@devlizard.com` / `cfo2024`
2. Vá para **"Propostas"** → aba **"Recebidas"**
3. Você deve ver as propostas das promessas
4. Clique em **"Aprovar"** na promessa do PRO:
   - Adicione comentário: `"Margem adequada, aprovado"`
   - Clique em ✓ **Aprovar**
5. Clique em **"Rejeitar"** na promessa de Suporte:
   - Adicione comentário: `"Não temos capacidade de suporte 24/7 este ano"`
   - Clique em ✗ **Rejeitar**

### **PASSO 11: Voltar para CMO e Verificar Sincronização**
1. Faça login novamente como CMO
2. Vá para **"Status"**
3. Verifique os estados:
   - **Aguardando CTO:** Apenas Suporte (que ainda aguarda CTO)
   - **Aguardando CFO:** vazios (Suporte foi rejeitado pelo CTO? não, espera CFO)
   - **Aprovadas:** Slack (aprovado CTO) e PRO (aprovado CFO)
   - **Rejeitadas:** Suporte (rejeitado pelo CFO)

### **PASSO 12: Acessar Biblioteca**
1. Clique em **"Biblioteca"** no menu
2. Você deve ver apenas:
   - Promessa de Slack ✓ Aprovada
   - Promessa de PRO ✓ Aprovada
3. Clique em **"Marcar como obsoleta"** em uma delas
4. A promessa desaparece da biblioteca

### **PASSO 13: Dashboard Inicial**
1. Clique em **"Visão Geral"** (home do CMO)
2. Verifique os contadores:
   - **Rascunhos:** 0 (todas foram enviadas)
   - **Aguardando CTO:** 0 ou 1 (conforme status)
   - **Aguardando CFO:** 0 ou 1
   - **Aprovadas:** 2 (Slack e PRO)
   - **Rejeitadas:** 1 (Suporte)

---

## 🔍 VALIDAÇÕES OBRIGATÓRIAS (Conforme Especificação)

✅ Título obrigatório
✅ Descrição obrigatória
✅ Se tipo = "preço" ou "aluguel_venda" → CFO obrigatório
✅ Se houver prazo → CTO obrigatório
✅ Rascunhos são editáveis
✅ Quando enviados → criam propostas para CTO/CFO
✅ Propostas criadas com categoria "promessa"
✅ Status sincroniza quando CTO/CFO aprovam/rejeitam
✅ Biblioteca só mostra aprovadas
✅ Guard impede não-CMO de acessar páginas CMO

---

## 📊 ESTRUTURA DE DADOS (localStorage)

Chave: `cmo_promises`

Exemplo de promessa:
```json
{
  "id": 1234567890,
  "title": "Integração com Slack até março",
  "type": "prazo",
  "audience": "Clientes enterprise",
  "description": "Promessa de integração nativa...",
  "promisedDeadlineDays": 45,
  "promisedPrice": null,
  "acquisitionModel": null,
  "requiresCTO": true,
  "requiresCFO": false,
  "status": "waiting_cto",
  "proposalIds": {
    "cto": 102,
    "cfo": null
  },
  "approvedAt": null,
  "createdAt": 1234567890,
  "updatedAt": 1234567890
}
```

---

## ⚠️ IMPORTANTES

- ❌ Sem alterações em estrutura de pastas fora do `cmo/`
- ❌ Sem libs externas
- ❌ Sem alteração de funcionalidades existentes
- ✅ Apenas adicionada categoria "promessa" aos formulários de propostas
- ✅ Tudo funciona apenas com localStorage (sem backend novo)
- ✅ Sincronização com propostas é read-only (não altera propostas)

---

## 🐛 TROUBLESHOOTING

**Problema:** Promessas não aparecem após salvar
- **Solução:** Limpar console, verificar localStorage via DevTools → Application → Local Storage

**Problema:** Não consegue enviar para validação
- **Solução:** Verificar que pelo menos CTO ou CFO está selecionado

**Problema:** Menu do CMO não mostra novas opções
- **Solução:** Recarregar página (`F5`), verificar que está logado como CMO

**Problema:** Status não atualiza após CTO/CFO aprovarem
- **Solução:** Recarregar página ou ir em outro menu e voltar para Status

---

## ✨ RESUMO EXECUTIVO

✅ **Roteiro de Promessas:** CRUD completo em HTML/CSS/JS puro
✅ **Integração com Propostas:** Sem quebra, usando categoria "promessa"
✅ **Status em Tempo Real:** Sincroniza com decisões do CTO/CFO
✅ **Biblioteca:** Promessas aprovadas para referência comercial
✅ **Dashboard CMO:** Visão geral com estatísticas
✅ **Zero Dependencies:** Apenas JavaScript vanilla + localStorage
✅ **Guard:** Apenas CMO acessa páginas do CMO

