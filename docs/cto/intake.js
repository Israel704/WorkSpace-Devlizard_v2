// Tech Intake – Análise Técnica de Demandas

const Intake = (() => {
  const STORAGE_KEY = "cto_intake_items";

  // Estrutura padrão
  function createItem(data) {
    return {
      id: data.id || Date.now(),
      title: data.title || "",
      description: data.description || "",
      effort: data.effort || "M",
      risk: data.risk || "medium",
      dependencies: data.dependencies || "",
      recommendation: data.recommendation || "approve",
      status: data.status || "pending",
      createdAt: data.createdAt || Date.now(),
      updatedAt: data.updatedAt || Date.now(),
    };
  }

  // Load all items
  function getAllItems() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (e) {
      console.error('Erro ao carregar intake items:', e);
      return [];
    }
  }

  // Save items
  function saveItems(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Erro ao salvar intake items:', e);
    }
  }

  // Add new item
  function addItem(formData) {
    if (!formData.title?.trim() || !formData.description?.trim()) {
      alert("Título e descrição são obrigatórios!");
      return false;
    }

    const items = getAllItems();
    const newItem = createItem(formData);
    items.push(newItem);
    saveItems(items);
    return true;
  }

  // Update item
  function updateItem(id, formData) {
    const items = getAllItems();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return false;

    items[idx] = {
      ...items[idx],
      ...formData,
      updatedAt: Date.now(),
    };
    saveItems(items);
    return true;
  }

  // Mark as reviewed
  function markAsReviewed(id) {
    return updateItem(id, { status: "reviewed", updatedAt: Date.now() });
  }

  // Delete item
  function deleteItem(id) {
    const items = getAllItems().filter(i => i.id !== id);
    saveItems(items);
  }

  // Render item
  function renderItem(item) {
    const statusClass = item.status === "pending" ? "pending" : "reviewed";
    const statusLabel = item.status === "pending" ? "Pendente" : "Analisado";
    const riskColors = {
      low: "var(--success)",
      medium: "var(--warning)",
      high: "var(--danger)",
    };
    const recColors = {
      approve: "var(--success)",
      replan: "var(--warning)",
      deny: "var(--danger)",
    };

    return `
      <div style="padding: 16px; background: var(--surface-secondary); border-radius: 8px; border-left: 4px solid ${riskColors[item.risk] || "var(--border)"};">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div style="flex: 1;">
            <h3 style="margin: 0 0 8px 0;">${item.title}</h3>
            <p style="margin: 0 0 8px 0; color: var(--muted); font-size: 14px;">${item.description}</p>
            <div style="display: flex; gap: 16px; margin-top: 8px; flex-wrap: wrap;">
              <span style="font-size: 12px; color: var(--muted);">📊 Esforço: <strong>${item.effort}</strong></span>
              <span style="font-size: 12px; color: var(--muted);">⚠️ Risco: <strong>${item.risk}</strong></span>
              <span style="font-size: 12px; color: var(--muted);">✅ Rec: <strong style="color: ${recColors[item.recommendation]}">${item.recommendation}</strong></span>
              <span style="font-size: 12px; color: var(--muted);">📌 Status: <strong>${statusLabel}</strong></span>
            </div>
            ${item.dependencies ? `<p style="margin: 8px 0 0 0; color: var(--muted); font-size: 13px;"><strong>Dependências:</strong> ${item.dependencies}</p>` : ""}
          </div>
          <div style="display: flex; gap: 8px; margin-left: 16px;">
            <button class="edit-btn" data-id="${item.id}" style="padding: 6px 12px; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Editar</button>
            ${item.status === "pending" ? `<button class="review-btn" data-id="${item.id}" style="padding: 6px 12px; background: var(--success); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Marcar Analisado</button>` : ""}
            <button class="delete-btn" data-id="${item.id}" style="padding: 6px 12px; background: var(--danger); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Excluir</button>
          </div>
        </div>
      </div>
    `;
  }

  // Render list
  function renderList() {
    const items = getAllItems();
    const listContainer = document.getElementById("intakeList");
    if (!listContainer) return;

    if (items.length === 0) {
      listContainer.innerHTML = `<div style="padding: 16px; background: var(--surface-secondary); border-radius: 8px; text-align: center; color: var(--muted);">Nenhuma demanda registrada ainda.</div>`;
      return;
    }

    // Sort by status (pending first) and then by date
    const sorted = items.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return b.createdAt - a.createdAt;
    });

    listContainer.innerHTML = sorted.map(renderItem).join("");

    // Attach event listeners
    listContainer.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (confirm("Tem certeza que deseja excluir?")) {
          deleteItem(parseInt(btn.dataset.id));
          renderList();
        }
      });
    });

    listContainer.querySelectorAll(".review-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        markAsReviewed(parseInt(btn.dataset.id));
        renderList();
      });
    });

    listContainer.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const itemId = parseInt(btn.dataset.id);
        const item = items.find(i => i.id === itemId);
        if (item) {
          document.getElementById("intakeTitle").value = item.title;
          document.getElementById("intakeDescription").value = item.description;
          document.getElementById("intakeEffort").value = item.effort;
          document.getElementById("intakeRisk").value = item.risk;
          document.getElementById("intakeDependencies").value = item.dependencies;
          document.getElementById("intakeRecommendation").value = item.recommendation;
          window.intakeEditingId = itemId;
          window.scrollTo(0, 0);
        }
      });
    });
  }

  // Export as JSON
  function exportJSON() {
    const items = getAllItems();
    const dataStr = JSON.stringify(items, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tech-intake-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Initialize
  function init() {
    const form = document.getElementById("intakeForm");
    const exportBtn = document.getElementById("exportBtn");

    renderList();

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const formData = {
          title: document.getElementById("intakeTitle").value,
          description: document.getElementById("intakeDescription").value,
          effort: document.getElementById("intakeEffort").value,
          risk: document.getElementById("intakeRisk").value,
          dependencies: document.getElementById("intakeDependencies").value,
          recommendation: document.getElementById("intakeRecommendation").value,
        };

        if (window.intakeEditingId) {
          updateItem(window.intakeEditingId, formData);
          window.intakeEditingId = null;
          alert("Demanda atualizada com sucesso!");
        } else {
          if (addItem(formData)) {
            alert("Demanda criada com sucesso!");
          }
        }

        form.reset();
        renderList();
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener("click", exportJSON);
    }
  }

  // Public API
  return { init };
})();

// Run on load
document.addEventListener("DOMContentLoaded", () => {
  const ready = window.App?.storageReady || Promise.resolve();
  ready.then(() => Intake.init());
});
