(function () {
  const STORAGE_KEY = "cmo_promises";
  const TYPE_LABELS = {
    funcionalidade: "Funcionalidade",
    sistema: "Sistema",
    prazo: "Prazo",
    preco: "Preço",
    aluguel_venda: "Aluguel/Venda",
  };

  let lastSentProposals = [];

  const getNow = () => Date.now();

  const read = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Erro ao carregar promessas CMO:", e);
      return [];
    }
  };

  const persist = (list) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error("Erro ao salvar promessas CMO:", e);
    }
  };

  const sanitizePayload = (data) => {
    const payload = { ...data };
    payload.title = (payload.title || "").trim();
    payload.type = (payload.type || "funcionalidade").trim();
    payload.audience = (payload.audience || "").trim();
    payload.description = (payload.description || "").trim();

    const deadline = Number(payload.promisedDeadlineDays);
    payload.promisedDeadlineDays = Number.isFinite(deadline) && deadline > 0 ? Math.round(deadline) : null;

    const price = Number(payload.promisedPrice);
    payload.promisedPrice = Number.isFinite(price) && price >= 0 ? price : null;

    const acquisition = payload.acquisitionModel || null;
    payload.acquisitionModel = acquisition ? String(acquisition) : null;

    payload.requiresCTO = Boolean(payload.requiresCTO);
    payload.requiresCFO = Boolean(payload.requiresCFO);

    return payload;
  };

  const validateCore = (payload) => {
    const errors = [];
    if (!payload.title) errors.push("Título é obrigatório.");
    if (!payload.description) errors.push("Descrição é obrigatória.");
    if (!TYPE_LABELS[payload.type]) errors.push("Tipo inválido.");

    if ((payload.type === "preco" || payload.type === "aluguel_venda") && !payload.requiresCFO) {
      errors.push("Promessas de preço/aluguel exigem validação do CFO.");
    }

    if (payload.promisedDeadlineDays && !payload.requiresCTO) {
      errors.push("Promessas com prazo exigem validação do CTO.");
    }

    return errors;
  };

  const getAll = () => {
    return read().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  };

  const getById = (id) => {
    return getAll().find((p) => p.id === id) || null;
  };

  const createPromise = (data) => {
    const payload = sanitizePayload(data);
    const errors = validateCore(payload);
    if (errors.length) {
      return { error: errors.join(" \n") };
    }

    const now = getNow();
    const promise = {
      id: payload.id || now,
      title: payload.title,
      type: payload.type,
      audience: payload.audience,
      description: payload.description,
      promisedDeadlineDays: payload.promisedDeadlineDays,
      promisedPrice: payload.promisedPrice,
      acquisitionModel: payload.acquisitionModel,
      requiresCTO: payload.requiresCTO,
      requiresCFO: payload.requiresCFO,
      status: "draft",
      proposalId: null,
      proposalIds: { cto: null, cfo: null },
      createdAt: now,
      updatedAt: now,
    };

    const list = read();
    list.unshift(promise);
    persist(list);

    return { promise };
  };

  const updatePromise = (id, updates) => {
    const list = read();
    const index = list.findIndex((p) => p.id === id);
    if (index === -1) return { error: "Promessa não encontrada." };
    if (list[index].status !== "draft") return { error: "Apenas rascunhos podem ser editados." };

    const payload = sanitizePayload({ ...list[index], ...updates });
    const errors = validateCore(payload);
    if (errors.length) return { error: errors.join(" \n") };

    const updated = {
      ...list[index],
      ...payload,
      status: "draft",
      updatedAt: getNow(),
    };
    list[index] = updated;
    persist(list);

    return { promise: updated };
  };

  const markObsolete = (id) => {
    const list = read();
    const index = list.findIndex((p) => p.id === id);
    if (index === -1) return { error: "Promessa não encontrada." };
    const updated = { ...list[index], status: "obsolete", updatedAt: getNow() };
    list[index] = updated;
    persist(list);
    return { promise: updated };
  };

  const buildProposalDescription = (promise) => {
    const parts = [
      `Tipo: ${TYPE_LABELS[promise.type] || promise.type}`,
      `Público-alvo: ${promise.audience || "-"}`,
    ];

    if (promise.promisedDeadlineDays) {
      parts.push(`Prazo prometido: ${promise.promisedDeadlineDays} dia(s)`);
    }

    if (promise.promisedPrice !== null && promise.promisedPrice !== undefined) {
      parts.push(`Preço prometido: ${promise.promisedPrice}`);
    }

    if (promise.acquisitionModel) {
      parts.push(`Modelo de aquisição: ${promise.acquisitionModel}`);
    }

    parts.push("Descrição:");
    parts.push(promise.description);
    parts.push(`PROMISE_ID:${promise.id}`);

    return parts.join("\n");
  };

  const sendProposal = async (title, description, toRole) => {
    const payload = { title, description, toRole, category: "promessa" };

    if (window.App?.apiFetch) {
      return window.App.apiFetch("http://localhost:3000/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    const token = localStorage.getItem((window.STORAGE_KEYS && window.STORAGE_KEYS.TOKEN) || "token");
    const response = await fetch("http://localhost:3000/api/proposals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || "Erro ao criar proposta");
    return json;
  };

  const ensureValidatorsForSend = (promise) => {
    const errors = validateCore(promise);
    if (!promise.requiresCTO && !promise.requiresCFO) {
      errors.push("Selecione pelo menos uma validação (CTO ou CFO).");
    }
    return errors;
  };

  const sendForValidation = async (id) => {
    const list = read();
    const index = list.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Promessa não encontrada.");

    const promise = list[index];
    if (promise.status !== "draft") throw new Error("Apenas rascunhos podem ser enviados.");

    const errors = ensureValidatorsForSend(promise);
    if (errors.length) throw new Error(errors.join(" \n"));

    const description = buildProposalDescription(promise);
    const proposalTitle = `[PROMESSA] ${promise.title}`;

    const created = { cto: null, cfo: null };

    if (promise.requiresCTO) {
      const res = await sendProposal(proposalTitle, description, "cto");
      created.cto = res?.id || null;
    }

    if (promise.requiresCFO) {
      const res = await sendProposal(proposalTitle, description, "cfo");
      created.cfo = res?.id || null;
    }

    const updated = {
      ...promise,
      proposalId: created.cto || created.cfo || null,
      proposalIds: { cto: created.cto, cfo: created.cfo },
      status: (() => {
        if (promise.requiresCTO && promise.requiresCFO) return "waiting_cto";
        if (promise.requiresCTO) return "waiting_cto";
        if (promise.requiresCFO) return "waiting_cfo";
        return "draft";
      })(),
      updatedAt: getNow(),
    };

    list[index] = updated;
    persist(list);

    return { promise: updated, created };
  };

  const fetchSentProposals = async () => {
    try {
      if (window.App?.apiFetch) {
        return await window.App.apiFetch("http://localhost:3000/api/proposals/sent", {});
      }

      const token = localStorage.getItem((window.STORAGE_KEYS && window.STORAGE_KEYS.TOKEN) || "token");
      const response = await fetch("http://localhost:3000/api/proposals/sent", {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Erro ao carregar propostas enviadas");
      return json;
    } catch (e) {
      console.error("Erro ao carregar propostas enviadas:", e);
      return [];
    }
  };

  const decideStatus = (promise, map) => {
    if (promise.status === "obsolete") return "obsolete";
    if (promise.status === "draft") return "draft";

    const ctoId = promise.proposalIds?.cto || null;
    const cfoId = promise.proposalIds?.cfo || null;
    const cto = ctoId ? map.get(ctoId) : null;
    const cfo = cfoId ? map.get(cfoId) : null;

    const anyRejected = (promise.requiresCTO && cto?.status === "rejected") ||
      (promise.requiresCFO && cfo?.status === "rejected");
    if (anyRejected) return "rejected";

    if (promise.requiresCTO && promise.requiresCFO) {
      if (cto?.status === "approved" && cfo?.status === "approved") return "approved";
      if (cto?.status === "approved" && (!cfo || cfo.status === "pending")) return "waiting_cfo";
      if (cfo?.status === "approved" && (!cto || cto.status === "pending")) return "waiting_cto";
      return "waiting_cto";
    }

    if (promise.requiresCTO) {
      if (cto?.status === "approved") return "approved";
      return "waiting_cto";
    }

    if (promise.requiresCFO) {
      if (cfo?.status === "approved") return "approved";
      return "waiting_cfo";
    }

    return promise.status || "draft";
  };

  const syncWithProposals = async () => {
    const list = read();
    if (!list.length) {
      lastSentProposals = [];
      return getAll();
    }

    const sent = await fetchSentProposals();
    lastSentProposals = Array.isArray(sent) ? sent : [];
    const map = new Map();
    lastSentProposals.forEach((p) => map.set(p.id, p));

    let touched = false;

    const updatedList = list.map((promise) => {
      let mutated = false;
      if (!promise.proposalIds && promise.proposalId) {
        mutated = true;
        promise.proposalIds = { cto: promise.proposalId, cfo: null };
      }

      const nextStatus = decideStatus(promise, map);
      if (nextStatus !== promise.status) {
        mutated = true;
        const approvals = [];
        if (promise.requiresCTO && promise.proposalIds?.cto) {
          const p = map.get(promise.proposalIds.cto);
          if (p?.decidedAt && p.status === "approved") approvals.push(p.decidedAt * 1000);
        }
        if (promise.requiresCFO && promise.proposalIds?.cfo) {
          const p = map.get(promise.proposalIds.cfo);
          if (p?.decidedAt && p.status === "approved") approvals.push(p.decidedAt * 1000);
        }

        const approvedAt = approvals.length ? Math.max(...approvals) : promise.approvedAt;

        promise = {
          ...promise,
          status: nextStatus,
          approvedAt,
          updatedAt: getNow(),
        };
      }

      if (mutated) touched = true;
      return promise;
    });

    if (touched) persist(updatedList);
    return updatedList;
  };

  const getStats = () => {
    const base = {
      draft: 0,
      waiting_cto: 0,
      waiting_cfo: 0,
      approved: 0,
      rejected: 0,
      obsolete: 0,
    };
    getAll().forEach((p) => {
      if (base[p.status] !== undefined) base[p.status] += 1;
    });
    return base;
  };

  window.CMOPromises = {
    TYPE_LABELS,
    getAll,
    getById,
    createPromise,
    updatePromise,
    markObsolete,
    sendForValidation,
    syncWithProposals,
    getStats,
    getLastSentProposals: () => lastSentProposals,
  };
})();

// =====================
// Página: Roteiro
// =====================

(function initPromisesPage() {
  const form = document.getElementById("promiseForm");
  const listContainer = document.getElementById("promisesList");

  if (!form || !listContainer || !window.CMOPromises) return;

  const idField = document.getElementById("promiseId");
  const titleField = document.getElementById("promiseTitle");
  const typeField = document.getElementById("promiseType");
  const audienceField = document.getElementById("promiseAudience");
  const descriptionField = document.getElementById("promiseDescription");
  const deadlineField = document.getElementById("promiseDeadline");
  const priceField = document.getElementById("promisePrice");
  const acquisitionField = document.getElementById("promiseAcquisitionModel");
  const requiresCTOField = document.getElementById("requiresCTO");
  const requiresCFOField = document.getElementById("requiresCFO");

  const resetForm = () => {
    idField.value = "";
    titleField.value = "";
    typeField.value = "funcionalidade";
    audienceField.value = "";
    descriptionField.value = "";
    deadlineField.value = "";
    priceField.value = "";
    acquisitionField.value = "";
    requiresCTOField.checked = false;
    requiresCFOField.checked = false;
  };

  const resetBtn = document.getElementById("resetFormBtn");
  if (resetBtn) resetBtn.onclick = resetForm;

  const fillForm = (promise) => {
    idField.value = promise.id;
    titleField.value = promise.title;
    typeField.value = promise.type;
    audienceField.value = promise.audience || "";
    descriptionField.value = promise.description || "";
    deadlineField.value = promise.promisedDeadlineDays || "";
    priceField.value = promise.promisedPrice ?? "";
    acquisitionField.value = promise.acquisitionModel || "";
    requiresCTOField.checked = !!promise.requiresCTO;
    requiresCFOField.checked = !!promise.requiresCFO;
  };

  const collectPayload = () => ({
    title: titleField.value,
    type: typeField.value,
    audience: audienceField.value,
    description: descriptionField.value,
    promisedDeadlineDays: deadlineField.value,
    promisedPrice: priceField.value,
    acquisitionModel: acquisitionField.value,
    requiresCTO: requiresCTOField.checked,
    requiresCFO: requiresCFOField.checked,
  });

  const renderList = () => {
    const promises = window.CMOPromises.getAll();
    if (!promises.length) {
      listContainer.innerHTML = '<div class="card"><p style="color: var(--muted);">Nenhuma promessa cadastrada.</p></div>';
      return;
    }

    const badge = (status) => {
      const map = {
        draft: "Rascunho",
        waiting_cto: "Aguardando CTO",
        waiting_cfo: "Aguardando CFO",
        approved: "Aprovada",
        rejected: "Rejeitada",
        obsolete: "Obsoleta",
      };
      return map[status] || status;
    };

    listContainer.innerHTML = promises
      .map((promise) => {
        const waiting = promise.status === "waiting_cto" || promise.status === "waiting_cfo";
        const isDraft = promise.status === "draft";
        const canObsolete = promise.status === "approved" || promise.status === "rejected";

        return `
          <div class="card" style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
              <div>
                <h3 style="margin: 0;">${promise.title}</h3>
                <p style="margin: 4px 0; color: var(--muted);">
                  ${window.CMOPromises.TYPE_LABELS[promise.type] || promise.type} • ${badge(promise.status)}
                </p>
                <p style="margin: 8px 0; color: var(--muted); font-size: 14px;">${promise.description}</p>
              </div>
              <div style="display: flex; gap: 8px;">
                ${isDraft ? `<button data-action="edit" data-id="${promise.id}" style="padding: 8px 12px; background: #6c757d; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Editar</button>` : ""}
                ${isDraft ? `<button data-action="send" data-id="${promise.id}" style="padding: 8px 12px; background: #007bff; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Enviar para validação</button>` : ""}
                ${canObsolete ? `<button data-action="obsolete" data-id="${promise.id}" style="padding: 8px 12px; background: #dc3545; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Marcar obsoleta</button>` : ""}
              </div>
            </div>
            <div style="margin-top: 8px; display: flex; gap: 12px; flex-wrap: wrap; color: var(--muted); font-size: 13px;">
              ${promise.audience ? `<span>Público: ${promise.audience}</span>` : ""}
              ${promise.promisedDeadlineDays ? `<span>Prazo: ${promise.promisedDeadlineDays} dia(s)</span>` : ""}
              ${promise.promisedPrice !== null && promise.promisedPrice !== undefined ? `<span>Preço: ${promise.promisedPrice}</span>` : ""}
              ${promise.acquisitionModel ? `<span>Modelo: ${promise.acquisitionModel}</span>` : ""}
              ${promise.requiresCTO ? `<span>Requer CTO</span>` : ""}
              ${promise.requiresCFO ? `<span>Requer CFO</span>` : ""}
            </div>
          </div>
        `;
      })
      .join("");
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const payload = collectPayload();
    const editingId = idField.value ? Number(idField.value) : null;
    const action = editingId ? window.CMOPromises.updatePromise(editingId, payload) : window.CMOPromises.createPromise(payload);

    if (action.error) {
      alert(action.error);
      return;
    }

    alert(editingId ? "Promessa atualizada como rascunho." : "Promessa salva como rascunho.");
    resetForm();
    renderList();
  });

  listContainer.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const id = Number(btn.getAttribute("data-id"));
    const action = btn.getAttribute("data-action");

    if (action === "edit") {
      const promise = window.CMOPromises.getById(id);
      if (!promise) return;
      fillForm(promise);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (action === "obsolete") {
      const res = window.CMOPromises.markObsolete(id);
      if (res.error) alert(res.error);
      else alert("Promessa marcada como obsoleta.");
      renderList();
    }

    if (action === "send") {
      if (!confirm("Enviar para validação? Isso criará propostas para CTO/CFO.")) return;
      try {
        await window.CMOPromises.sendForValidation(id);
        alert("Promessa enviada para validação.");
        renderList();
      } catch (err) {
        alert(err.message);
      }
    }
  });

  window.CMOPromises.syncWithProposals().finally(renderList);
})();
