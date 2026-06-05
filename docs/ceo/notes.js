// notes.js
(() => {
  const STORAGE_KEY = "devlizard:ceo:notes";

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
      card.className = "card";

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
          <div style="min-width:0;">
            <h3 style="margin:0; font-size:1.05rem;">${escapeHtml(note.title)}</h3>
            <p style="margin-top:8px; color: var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              ${escapeHtml(note.text)}
            </p>
            <p style="margin-top:10px; color: var(--muted); font-size:0.8rem;">
              Criado: ${fmt(note.createdAt)} • Atualizado: ${fmt(note.updatedAt)}
            </p>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <button type="button" data-action="edit">Editar</button>
            <button type="button" data-action="delete">Excluir</button>
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
