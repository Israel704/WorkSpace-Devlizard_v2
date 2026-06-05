// notes.js
(() => {
  const STORAGE_KEY = "devlizard:cto:notes";

  // DOM
  const form = document.getElementById("note-form");
  const idEl = document.getElementById("note-id");
  const titleEl = document.getElementById("note-title");
  const textEl = document.getElementById("note-text");
  const cancelBtn = document.getElementById("note-cancel");
  const listEl = document.getElementById("notes-list");
  const emptyEl = document.getElementById("notes-empty");
  const searchEl = document.getElementById("note-search");

  // Segurança: se a página não tem esses elementos, não roda.
  if (!form || !listEl || !titleEl || !textEl || !idEl) return;

  /** @type {{id:number, title:string, text:string, createdAt:number, updatedAt:number}[]} */
  let notes = [];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      notes = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(notes)) notes = [];
    } catch (e) {
      console.error('Erro ao carregar notas:', e);
      notes = [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (e) {
      console.error('Erro ao salvar notas:', e);
    }
  }

  function now() {
    return Date.now();
  }

  function fmt(ts) {
    const d = new Date(ts);
    return d.toLocaleString("pt-BR");
  }

  function resetForm() {
    idEl.value = "";
    titleEl.value = "";
    textEl.value = "";
    cancelBtn.style.display = "none";
    document.getElementById("note-save").textContent = "Salvar";
  }

  function setEditMode(note) {
    idEl.value = String(note.id);
    titleEl.value = note.title;
    textEl.value = note.text;
    cancelBtn.style.display = "inline-block";
    document.getElementById("note-save").textContent = "Atualizar";
    titleEl.focus();
  }

  function upsertNote(title, text, id) {
    const t = title.trim();
    const x = text.trim();
    if (!t || !x) return;

    if (id) {
      const idx = notes.findIndex(n => n.id === id);
      if (idx >= 0) {
        notes[idx] = { ...notes[idx], title: t, text: x, updatedAt: now() };
      }
    } else {
      const ts = now();
      notes.unshift({
        id: ts,
        title: t,
        text: x,
        createdAt: ts,
        updatedAt: ts
      });
    }
    save();
    render();
    resetForm();
  }

  function removeNote(id) {
    notes = notes.filter(n => n.id !== id);
    save();
    render();
    resetForm();
  }

  function render() {
    const q = (searchEl?.value || "").trim().toLowerCase();

    listEl.innerHTML = "";
    const filtered = q
      ? notes.filter(n =>
          n.title.toLowerCase().includes(q) ||
          n.text.toLowerCase().includes(q)
        )
      : notes;

    if (emptyEl) emptyEl.style.display = filtered.length ? "none" : "block";

    filtered.forEach(note => {
      const card = document.createElement("div");
      card.style.cssText = "padding: 20px; background: rgba(0, 0, 0, 0.3); border-radius: 8px; border-left: 4px solid var(--primary); border: 1px solid rgba(255, 255, 255, 0.1); border-left: 4px solid var(--primary);";

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
          <div style="min-width:0; flex: 1;">
            <h3 style="margin:0; font-size:1.05rem; font-weight: 600;">${escapeHtml(note.title)}</h3>
            <p style="margin-top:8px; color: var(--muted); margin-bottom: 12px;">
              ${escapeHtml(note.text)}
            </p>
            <p style="margin-top:10px; color: var(--muted); font-size:0.85rem;">
              Criado: ${fmt(note.createdAt)} • Atualizado: ${fmt(note.updatedAt)}
            </p>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px; white-space: nowrap;">
            <button type="button" data-action="edit" style="padding: 8px 12px; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500;">Editar</button>
            <button type="button" data-action="delete" style="padding: 8px 12px; background: var(--danger); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500;">Excluir</button>
          </div>
        </div>
      `;

      card.querySelector('[data-action="edit"]').onclick = () => setEditMode(note);
      card.querySelector('[data-action="delete"]').onclick = () => {
        if (confirm("Excluir esta nota?")) removeNote(note.id);
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
    upsertNote(titleEl.value, textEl.value, id);
  });

  cancelBtn.addEventListener("click", () => resetForm());

  if (searchEl) {
    searchEl.addEventListener("input", () => render());
  }

  // Boot
  const ready = window.App?.storageReady || Promise.resolve();
  ready.then(() => {
    load();
    render();
  });
})();
