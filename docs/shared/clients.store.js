// Shared Clients Store (localStorage) - DevLizard
(function () {
  const STORAGE_KEY = "dl_clients_v1";
  const LEGACY_KEYS = ["cfo_clients"];

  const ROLE_LABELS = {
    ceo: "CEO",
    coo: "COO",
    cto: "CTO",
    cfo: "CFO",
    cmo: "CMO",
    comercial: "Comercial",
  };

  const getActor = () => {
    const role = (window.App?.getRole?.() || localStorage.getItem(window.App?.STORAGE_KEYS?.ROLE) || "").toLowerCase();
    const name =
      localStorage.getItem(window.App?.STORAGE_KEYS?.PROFILE_NAME || "profile_name") ||
      window.App?.getUser?.() ||
      "Usuário";
    return { role, name };
  };

  const normalizeDocument = (value) => String(value || "").replace(/\D/g, "");

  const loadRaw = (key) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn("Erro ao ler clientes:", err);
      return [];
    }
  };

  const saveAll = (clients) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  };

  const migrateLegacy = () => {
    const current = loadRaw(STORAGE_KEY);
    if (current !== null) return current;

    let migrated = [];
    LEGACY_KEYS.forEach((key) => {
      const legacy = loadRaw(key);
      if (!legacy.length) return;
      legacy.forEach((item) => {
        const now = Date.now();
        migrated.push({
          id: item.id || Date.now() + Math.floor(Math.random() * 1000),
          name: item.name || "Cliente sem nome",
          documentId: "",
          contact: item.contact || "",
          leadSource: "",
          responsibleRole: "cfo",
          responsibleName: "",
          relationshipStatus: item.status === "inactive" ? "inativo" : "ativo",
          createdAt: item.createdAt || now,
          updatedAt: item.updatedAt || now,
          history: [
            {
              at: now,
              byRole: "system",
              byName: "Migração",
              changes: [
                { field: "migratedFrom", from: "-", to: key },
              ],
            },
          ],
        });
      });
    });

    if (migrated.length) saveAll(migrated);
    else saveAll([]);
    return migrated;
  };

  const getAll = () => migrateLegacy();

  const findById = (id) => getAll().find((c) => c.id === id);

  const isDocumentUnique = (documentId, excludeId = null) => {
    const normalized = normalizeDocument(documentId);
    if (!normalized) return true;
    return !getAll().some((c) => c.documentId === normalized && c.id !== excludeId);
  };

  const formatRole = (role) => ROLE_LABELS[role] || role || "-";

  const canEditClient = (client, role) => {
    if (!client) return false;
    if (role === "ceo" || role === "coo") return true;
    return client.responsibleRole === role;
  };

  const createClient = (payload) => {
    const actor = getActor();
    const now = Date.now();
    const clients = getAll();
    const normalizedDoc = normalizeDocument(payload.documentId);

    const client = {
      id: now,
      name: payload.name || "",
      documentId: normalizedDoc,
      contact: payload.contact || "",
      leadSource: payload.leadSource || "",
      responsibleRole: payload.responsibleRole || "",
      responsibleName: payload.responsibleName || "",
      relationshipStatus: payload.relationshipStatus || "lead",
      createdAt: now,
      updatedAt: now,
      history: [
        {
          at: now,
          byRole: actor.role || "system",
          byName: actor.name,
          changes: [
            { field: "create", from: "-", to: "Cliente criado" },
          ],
        },
      ],
    };

    clients.push(client);
    saveAll(clients);
    return client;
  };

  const updateClient = (id, payload) => {
    const actor = getActor();
    const now = Date.now();
    const clients = getAll();
    const index = clients.findIndex((c) => c.id === id);
    if (index < 0) return null;

    const current = clients[index];
    const normalizedDoc = normalizeDocument(payload.documentId);
    const updated = {
      ...current,
      name: payload.name || "",
      documentId: normalizedDoc,
      contact: payload.contact || "",
      leadSource: payload.leadSource || "",
      responsibleRole: payload.responsibleRole || "",
      responsibleName: payload.responsibleName || "",
      relationshipStatus: payload.relationshipStatus || "lead",
      updatedAt: now,
    };

    const changes = [];
    const fields = [
      ["name", "Nome/Razão Social"],
      ["documentId", "CPF/CNPJ"],
      ["contact", "Contato principal"],
      ["leadSource", "Origem do lead"],
      ["responsibleRole", "C responsável"],
      ["responsibleName", "Nome responsável"],
      ["relationshipStatus", "Status do relacionamento"],
    ];
    fields.forEach(([key, label]) => {
      if (String(current[key] || "") !== String(updated[key] || "")) {
        changes.push({ field: label, from: current[key] || "-", to: updated[key] || "-" });
      }
    });

    if (changes.length) {
      const history = Array.isArray(current.history) ? current.history.slice() : [];
      history.push({
        at: now,
        byRole: actor.role || "system",
        byName: actor.name,
        changes,
      });
      updated.history = history;
    }

    clients[index] = updated;
    saveAll(clients);
    return updated;
  };

  const removeClient = (id) => {
    const clients = getAll().filter((c) => c.id !== id);
    saveAll(clients);
  };

  window.ClientsStore = {
    STORAGE_KEY,
    ROLE_LABELS,
    getAll,
    findById,
    createClient,
    updateClient,
    removeClient,
    normalizeDocument,
    isDocumentUnique,
    formatRole,
    canEditClient,
  };
})();
