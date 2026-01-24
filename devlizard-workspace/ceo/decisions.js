// decisions.js
(() => {
  const STORAGE_KEY = "devlizard:ceo:decisions";

  const form = document.getElementById("decision-form");
  const idEl = document.getElementById("decision-id");
  const titleEl = document.getElementById("decision-title");
  const reasonEl = document.getElementById("decision-reason");
  const impactEl = document.getElementById("decision-impact");
  const statusEl = document.getElementById("decision-status");
  const cancelBtn = document.getElementById("decision-cancel");
  const listEl = document.getElementById("decisions-list");
  const emptyEl = document.getElementById("decisions-empty");
  const searchEl = document.getElementById("decision-search");

  if (!form || !listEl || !titleEl || !reasonEl || !impactEl || !statusEl || !idEl) return;

  /** @type {{id:number, title:string, reason:string, impact:string, status:string, createdAt:number, updatedAt:number}[]} */
  let decisions = [];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      decisions = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(decisions)) decisions = [];
    } catch {
      decisions = [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
    } catch (e) {
      console.error('Erro ao salvar decisões:', e);
    }
  }

  function now() {
    return Date.now();
  }

  function fmt(ts) {
    return new Date(ts).toLocaleString("pt-BR");
  }

  function resetForm() {
    idEl.value = "";
    titleEl.value = "";
    reasonEl.value = "";
    impactEl.value = "alto";
    statusEl.value = "em_analise";
    cancelBtn.style.display = "none";
    document.getElementById("decision-save").textContent = "Salvar";
  }

  function setEditMode(d) {
    idEl.value = String(d.id);
    titleEl.value = d.title;
    reasonEl.value = d.reason;
    impactEl.value = d.impact;
    statusEl.value = d.status;
    cancelBtn.style.display = "inline-block";
    document.getElementById("decision-save").textContent = "Atualizar";
    titleEl.focus();
  }

  function upsertDecision(payload, id) {
    const title = payload.title.trim();
    const reason = payload.reason.trim();
    const impact = payload.impact;
    const status = payload.status;

    if (!title || !reason) return;

    if (id) {
      const idx = decisions.findIndex(x => x.id === id);
      if (idx >= 0) {
        decisions[idx] = { ...decisions[idx], title, reason, impact, status, updatedAt: now() };
      }
    } else {
      const ts = now();
      decisions.unshift({
        id: ts,
        title,
        reason,
        impact,
        status,
        createdAt: ts,
        updatedAt: ts
      });
    }

    save();
    render();
    resetForm();
  }

  function removeDecision(id) {
    decisions = decisions.filter(x => x.id !== id);
    save();
    render();
    resetForm();
  }

  function badge(text) {
    return `<span style="border:1px solid var(--border); padding:4px 8px; font-size:.8rem; color: var(--muted);">${text}</span>`;
  }

  function render() {
    const q = (searchEl?.value || "").trim().toLowerCase();

    listEl.innerHTML = "";
    const filtered = q
      ? decisions.filter(d =>
          d.title.toLowerCase().includes(q) ||
          d.reason.toLowerCase().includes(q) ||
          d.impact.toLowerCase().includes(q) ||
          d.status.toLowerCase().includes(q)
        )
      : decisions;

    if (emptyEl) emptyEl.style.display = filtered.length ? "none" : "block";

    filtered.forEach(d => {
      const card = document.createElement("div");
      card.className = "card";

      const impactTxt = d.impact.toUpperCase();
      const statusTxt = d.status.replaceAll("_", " ").toUpperCase();

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
          <div style="min-width:0;">
            <h3 style="margin:0; font-size:1.05rem;">${escapeHtml(d.title)}</h3>
            <p style="margin-top:8px; color: var(--muted);">
              ${escapeHtml(d.reason)}
            </p>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
              ${badge("Impacto: " + impactTxt)}
              ${badge("Status: " + statusTxt)}
            </div>
            <p style="margin-top:10px; color: var(--muted); font-size:0.8rem;">
              Criado: ${fmt(d.createdAt)} • Atualizado: ${fmt(d.updatedAt)}
            </p>
          </div>

          <div style="display:flex; flex-direction:column; gap:8px;">
            <button type="button" data-action="edit">Editar</button>
            <button type="button" data-action="delete">Excluir</button>
          </div>
        </div>
      `;

      card.querySelector('[data-action="edit"]').onclick = () => setEditMode(d);
      card.querySelector('[data-action="delete"]').onclick = () => {
        if (confirm("Excluir esta decisão?")) removeDecision(d.id);
      };

      listEl.appendChild(card);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Eventos
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = idEl.value ? Number(idEl.value) : null;

    upsertDecision(
      {
        title: titleEl.value,
        reason: reasonEl.value,
        impact: impactEl.value,
        status: statusEl.value
      },
      id
    );
  });

  cancelBtn.addEventListener("click", () => resetForm());

  if (searchEl) searchEl.addEventListener("input", () => render());

  // Boot
  load();
  render();
})();
