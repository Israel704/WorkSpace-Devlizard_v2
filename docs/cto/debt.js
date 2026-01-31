// Debt & Quality Board – Dívidas Técnicas e Bugs Críticos

const Debt = (() => {
  const STORAGE_KEY = "cto_debt_items";

  // Filter state
  let filterSeverity = "";
  let filterStatus = "";

  // Estrutura padrão
  function createItem(data) {
    return {
      id: data.id || Date.now(),
      title: data.title || "",
      description: data.description || "",
      severity: data.severity || "medium",
      status: data.status || "todo",
      owner: data.owner || "",
      impact: data.impact || "",
      createdAt: data.createdAt || Date.now(),
      updatedAt: data.updatedAt || Date.now(),
    };
  }

  // Load all items
  function getAllItems() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (e) {
      console.error('Erro ao carregar debt items:', e);
      return [];
    }
  }

  // Save items
  function saveItems(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Erro ao salvar debt items:', e);
    }
  }

  // Add new item
  function addItem(formData) {
    if (!formData.title?.trim()) {
      alert("Título é obrigatório!");
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

  // Delete item
  function deleteItem(id) {
    const items = getAllItems().filter(i => i.id !== id);
    saveItems(items);
  }

  // Filter items
  function getFilteredItems() {
    let items = getAllItems();

    if (filterSeverity) {
      items = items.filter(i => i.severity === filterSeverity);
    }
    if (filterStatus) {
      items = items.filter(i => i.status === filterStatus);
    }

    return items;
  }

  // Render item
  function renderItem(item) {
    const severityColors = {
      low: "var(--success)",
      medium: "var(--warning)",
      high: "var(--danger)",
      critical: "var(--danger)",
    };
    const severityLabels = {
      low: "Baixa",
      medium: "Média",
      high: "Alta",
      critical: "Crítica",
    };
    const statusLabels = {
      todo: "A Fazer",
      doing: "Em Progresso",
      done: "Concluído",
    };
    const statusColors = {
      todo: "var(--muted)",
      doing: "var(--warning)",
      done: "var(--success)",
    };

    return `
      <div style="padding: 16px; background: var(--surface-secondary); border-radius: 8px; border-left: 4px solid ${severityColors[item.severity] || "var(--border)"};">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div style="flex: 1;">
            <h3 style="margin: 0 0 8px 0;">${item.title}</h3>
            ${item.description ? `<p style="margin: 0 0 8px 0; color: var(--muted); font-size: 14px;">${item.description}</p>` : ""}
            <div style="display: flex; gap: 16px; margin-top: 8px; flex-wrap: wrap;">
              <span style="font-size: 12px; color: var(--muted);">🔴 Severidade: <strong style="color: ${severityColors[item.severity]}">${severityLabels[item.severity]}</strong></span>
              <span style="font-size: 12px; color: var(--muted);">📊 Status: <strong style="color: ${statusColors[item.status]}">${statusLabels[item.status]}</strong></span>
              ${item.owner ? `<span style="font-size: 12px; color: var(--muted);">👤 Responsável: <strong>${item.owner}</strong></span>` : ""}
              ${item.impact ? `<span style="font-size: 12px; color: var(--muted);">💥 Impacto: <strong>${item.impact}</strong></span>` : ""}
            </div>
          </div>
          <div style="display: flex; gap: 8px; margin-left: 16px; flex-wrap: wrap; justify-content: flex-end;">
            <button class="edit-btn" data-id="${item.id}" style="padding: 6px 12px; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Editar</button>
            ${item.status !== "done" ? `<button class="status-btn" data-id="${item.id}" style="padding: 6px 12px; background: var(--success); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">${item.status === "todo" ? "Iniciar" : "Concluir"}</button>` : ""}
            <button class="delete-btn" data-id="${item.id}" style="padding: 6px 12px; background: var(--danger); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Excluir</button>
          </div>
        </div>
      </div>
    `;
  }

  // Render list
  function renderList() {
    const items = getFilteredItems();
    const listContainer = document.getElementById("debtList");
    if (!listContainer) return;

    if (items.length === 0) {
      listContainer.innerHTML = `<div style="padding: 16px; background: var(--surface-secondary); border-radius: 8px; text-align: center; color: var(--muted);">Nenhum item encontrado.</div>`;
      return;
    }

    // Sort: critical/high first, then by status (todo, doing, done), then by date
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const statusOrder = { todo: 0, doing: 1, done: 2 };
    const sorted = items.sort((a, b) => {
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
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

    listContainer.querySelectorAll(".status-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const itemId = parseInt(btn.dataset.id);
        const items = getAllItems();
        const item = items.find(i => i.id === itemId);
        if (item) {
          const newStatus = item.status === "todo" ? "doing" : "done";
          updateItem(itemId, { status: newStatus });
          renderList();
        }
      });
    });

    listContainer.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const itemId = parseInt(btn.dataset.id);
        const items = getAllItems();
        const item = items.find(i => i.id === itemId);
        if (item) {
          document.getElementById("debtTitle").value = item.title;
          document.getElementById("debtDescription").value = item.description;
          document.getElementById("debtSeverity").value = item.severity;
          document.getElementById("debtStatus").value = item.status;
          document.getElementById("debtOwner").value = item.owner;
          document.getElementById("debtImpact").value = item.impact;
          window.debtEditingId = itemId;
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
    a.download = `debt-quality-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Initialize
  function init() {
    const form = document.getElementById("debtForm");
    const exportBtn = document.getElementById("exportBtn");
    const filterSeveritySelect = document.getElementById("filterSeverity");
    const filterStatusSelect = document.getElementById("filterStatus");
    const resetFiltersBtn = document.getElementById("resetFiltersBtn");

    renderList();

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const formData = {
          title: document.getElementById("debtTitle").value,
          description: document.getElementById("debtDescription").value,
          severity: document.getElementById("debtSeverity").value,
          status: document.getElementById("debtStatus").value,
          owner: document.getElementById("debtOwner").value,
          impact: document.getElementById("debtImpact").value,
        };

        if (window.debtEditingId) {
          updateItem(window.debtEditingId, formData);
          window.debtEditingId = null;
          alert("Item atualizado com sucesso!");
        } else {
          if (addItem(formData)) {
            alert("Item criado com sucesso!");
          }
        }

        form.reset();
        renderList();
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener("click", exportJSON);
    }

    if (filterSeveritySelect) {
      filterSeveritySelect.addEventListener("change", (e) => {
        filterSeverity = e.target.value;
        renderList();
      });
    }

    if (filterStatusSelect) {
      filterStatusSelect.addEventListener("change", (e) => {
        filterStatus = e.target.value;
        renderList();
      });
    }

    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener("click", () => {
        filterSeverity = "";
        filterStatus = "";
        filterSeveritySelect.value = "";
        filterStatusSelect.value = "";
        renderList();
      });
    }
  }

  // Public API
  return { init };
})();

// Run on load
document.addEventListener("DOMContentLoaded", () => {
  const ready = window.App?.storageReady || Promise.resolve();
  ready.then(() => Debt.init());
});
