/* ======================================================
   DECISIONS STORE

   Gerencia decisões globais em localStorage.
   - getDecisions()
   - addDecision()
   - updateDecision()
   - deleteDecision()

   Regra: Apenas COO pode escrever.
====================================================== */

window.DecisionsStore = (() => {
  const STORAGE_KEY = "global_decisions";

  /**
   * Carrega todas as decisões do storage
   * @returns {Array} Lista de decisões
   */
  const getDecisions = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Erro ao carregar decisões:", error);
      return [];
    }
  };

  /**
   * Salva decisões no storage
   * @param {Array} decisions - Lista de decisões
   */
  const setDecisions = (decisions) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
      return true;
    } catch (error) {
      console.error("Erro ao salvar decisões:", error);
      return false;
    }
  };

  /**
   * Verifica se o usuário é COO
   * @returns {boolean}
   */
  const isCOO = () => {
    try {
      const role = localStorage.getItem("role");
      return role && String(role).toLowerCase() === "coo";
    } catch (e) {
      console.error('Erro ao verificar role:', e);
      return false;
    }
  };

  /**
   * Adiciona uma nova decisão
   * @param {Object} decision - Objeto com title, summary, fromRole, toRole, status, tags
   * @returns {Object|null} Decisão criada ou null se erro
   */
  const addDecision = (decision) => {
    if (!isCOO()) {
      console.warn("Apenas COO pode adicionar decisões");
      return null;
    }

    try {
      const decisions = getDecisions();
      const newDecision = {
        id: decisions.length > 0 ? Math.max(...decisions.map(d => d.id)) + 1 : 1,
        title: decision.title || "",
        summary: decision.summary || "",
        fromRole: decision.fromRole || "",
        toRole: decision.toRole || "",
        status: decision.status || "pending",
        decidedAt: Date.now(),
        decidedBy: (() => {
          try {
            return localStorage.getItem("role") || "coo";
          } catch (e) {
            return "coo";
          }
        })(),
        tags: decision.tags || [],
      };

      decisions.push(newDecision);
      setDecisions(decisions);
      return newDecision;
    } catch (error) {
      console.error("Erro ao adicionar decisão:", error);
      return null;
    }
  };

  /**
   * Atualiza uma decisão existente
   * @param {number} id - ID da decisão
   * @param {Object} updates - Campos a atualizar
   * @returns {Object|null} Decisão atualizada ou null se erro
   */
  const updateDecision = (id, updates) => {
    if (!isCOO()) {
      console.warn("Apenas COO pode atualizar decisões");
      return null;
    }

    try {
      const decisions = getDecisions();
      const index = decisions.findIndex(d => d.id === id);

      if (index === -1) {
        console.warn(`Decisão ${id} não encontrada`);
        return null;
      }

      decisions[index] = {
        ...decisions[index],
        ...updates,
        decidedAt: decisions[index].decidedAt, // não sobrescreve timestamp
      };

      setDecisions(decisions);
      return decisions[index];
    } catch (error) {
      console.error("Erro ao atualizar decisão:", error);
      return null;
    }
  };

  /**
   * Remove uma decisão
   * @param {number} id - ID da decisão
   * @returns {boolean} true se removida com sucesso
   */
  const deleteDecision = (id) => {
    if (!isCOO()) {
      console.warn("Apenas COO pode remover decisões");
      return false;
    }

    try {
      const decisions = getDecisions();
      const filtered = decisions.filter(d => d.id !== id);
      setDecisions(filtered);
      return true;
    } catch (error) {
      console.error("Erro ao remover decisão:", error);
      return false;
    }
  };

  /**
   * Obtém uma decisão específica
   * @param {number} id - ID da decisão
   * @returns {Object|null}
   */
  const getDecisionById = (id) => {
    const decisions = getDecisions();
    return decisions.find(d => d.id === id) || null;
  };

  /**
   * Filtra decisões por critérios
   * @param {Object} filters - Objeto com filtros (status, fromRole, toRole, etc)
   * @returns {Array} Decisões filtradas
   */
  const filterDecisions = (filters = {}) => {
    let decisions = getDecisions();

    if (filters.status) {
      decisions = decisions.filter(d => d.status === filters.status);
    }

    if (filters.fromRole) {
      decisions = decisions.filter(d => d.fromRole === filters.fromRole);
    }

    if (filters.toRole) {
      decisions = decisions.filter(d => d.toRole === filters.toRole);
    }

    return decisions;
  };

  /**
   * Formata timestamp para data legível
   * @param {number} timestamp
   * @returns {string}
   */
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // API Pública
  return {
    getDecisions,
    addDecision,
    updateDecision,
    deleteDecision,
    getDecisionById,
    filterDecisions,
    formatDate,
    isCOO,
  };
})();
