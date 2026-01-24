// risks.js
(() => {
  const STORAGE_KEY = "devlizard:ceo:risks";

  const form = document.getElementById("risk-form");
  const idEl = document.getElementById("risk-id");
  const titleEl = document.getElementById("risk-title");
  const ownerEl = document.getElementById("risk-owner");
  const probEl = document.getElementById("risk-prob");
  const impactEl = document.getElementById("risk-impact");
  const statusEl = document.getElementById("risk-status");
  const mitigationEl = document.getElementById("risk-mitigation");
  const cancelBtn = document.getElementById("risk-cancel");
  const listEl = document.getElementById("risks-list");
  const emptyEl = document.getElementById("risks-empty");
  const searchEl = document.getElementById("risk-search");

  if (!form || !listEl || !idEl || !titleEl || !ownerEl || !probEl || !impactEl || !statusEl || !mitigationEl) return;

  /** @type {{id:number, title:string, owner:string, prob:string, impact:string, status:string, mitigation:string, createdAt:number, updatedAt:number}[]} */
  let risks = [];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      risks = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(risks)) risks = [];
    } catch (e) {
      console.error('Erro ao carregar riscos:', e);
      risks = [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(risks));
    } catch (e) {
      console.error('Erro ao salvar riscos:', e);
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
    ownerEl.value = "";
    probEl.value = "baixa";
    impactEl.value = "baixo";
    statusEl.value = "aberto";
    mitigationEl.value = "";
    cancelBtn.style.display = "none";
    document.getElementById("risk-save").textContent = "Salvar";
  }

  function setEditMode(r) {
    idEl.value = String(r.id);
    titleEl.value = r.title;
    ownerEl.value = r.owner;
    probEl.value = r.prob;
    impactEl.value = r.impact;
    statusEl.value = r.status;
    mitigationEl.value = r.mitigation;
    cancelBtn.style.display = "inline-block";
    document.getElementById("risk-save").textContent = "Atualizar";
    titleEl.focus();
  }

  function upsert(payload, id) {
    const title = payload.title.trim();
    const owner = payload.owner.trim();
    const mitigation = payload.mitigation.trim();
    const prob = payload.prob;
    const impact = payload.impact;
    const status = payload.status;

    if (!title || !owner || !mitigation) return;

    if (id) {
      const idx = risks.findIndex(x => x.id === id);
      if (idx >= 0) {
        risks[idx] = { ...risks[idx], title, owner, mitigation, prob, impact, status, updatedAt: now() };
      }
    } else {
      const ts = now();
      risks.unshift({
        id: ts,
        title,
        owner,
        mitigation,
        prob,
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

  function removeRisk(id) {
    risks = risks.filter(x => x.id !== id);
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
      ? risks.filter(r =>
          r.title.toLowerCase().includes(q) ||
          r.owner.toLowerCase().includes(q) ||
          r.mitigation.toLowerCase().includes(q) ||
          r.prob.toLowerCase().includes(q) ||
          r.impact.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q)
        )
      : risks;

    if (emptyEl) emptyEl.style.display = filtered.length ? "none" : "block";

    filtered.forEach(r => {
      const card = document.createElement("div");
      card.className = "card";

      const probTxt = r.prob.toUpperCase();
      const impactTxt = r.impact.toUpperCase();
      const statusTxt = r.status.toUpperCase();

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
          <div style="min-width:0;">
            <h3 style="margin:0; font-size:1.05rem;">${escapeHtml(r.title)}</h3>
            <p style="margin-top:8px; color: var(--muted);">
              <strong style="color: var(--text);">Responsável:</strong> ${escapeHtml(r.owner)}
            </p>
            <p style="margin-top:8px; color: var(--muted);">
              <strong style="color: var(--text);">Mitigação:</strong> ${escapeHtml(r.mitigation)}
            </p>

            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
              ${badge("Prob.: " + probTxt)}
              ${badge("Impacto: " + impactTxt)}
              ${badge("Status: " + statusTxt)}
            </div>

            <p style="margin-top:10px; color: var(--muted); font-size:0.8rem;">
              Criado: ${fmt(r.createdAt)} • Atualizado: ${fmt(r.updatedAt)}
            </p>
          </div>

          <div style="display:flex; flex-direction:column; gap:8px;">
            <button type="button" data-action="edit">Editar</button>
            <button type="button" data-action="delete">Excluir</button>
          </div>
        </div>
      `;

      card.querySelector('[data-action="edit"]').onclick = () => setEditMode(r);
      card.querySelector('[data-action="delete"]').onclick = () => {
        if (confirm("Excluir este risco?")) removeRisk(r.id);
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

    upsert(
      {
        title: titleEl.value,
        owner: ownerEl.value,
        prob: probEl.value,
        impact: impactEl.value,
        status: statusEl.value,
        mitigation: mitigationEl.value
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
