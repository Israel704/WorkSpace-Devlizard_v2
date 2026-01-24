(function () {
  const containers = {
    waitingCTO: document.getElementById("waitingCTO"),
    waitingCFO: document.getElementById("waitingCFO"),
    approved: document.getElementById("approved"),
    rejected: document.getElementById("rejected"),
  };

  if (!containers.waitingCTO || !window.CMOPromises) return;

  const renderGroup = (container, items, emptyText, proposalsMap) => {
    if (!items.length) {
      container.innerHTML = `<div class="card"><p style="color: var(--muted);">${emptyText}</p></div>`;
      return;
    }

    const badge = (status) => {
      const map = { pending: "Aguardando", approved: "Aprovada", rejected: "Rejeitada" };
      return map[status] || status;
    };

    const roleStatus = (promise, role) => {
      if (!promise[`requires${role.toUpperCase()}`]) return "Não requerido";
      const propId = promise.proposalIds?.[role];
      if (!propId) return "Proposta não gerada";
      const prop = proposalsMap.get(propId);
      if (!prop) return "Proposta ausente";
      return badge(prop.status);
    };

    container.innerHTML = items
      .map((p) => `
        <div class="card" style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; gap: 12px; align-items: flex-start;">
            <div>
              <h3 style="margin: 0;">${p.title}</h3>
              <p style="margin: 4px 0; color: var(--muted);">${window.CMOPromises.TYPE_LABELS[p.type] || p.type}</p>
              <p style="margin: 6px 0; color: var(--muted); font-size: 14px;">${p.description}</p>
              <div style="display: flex; gap: 12px; flex-wrap: wrap; color: var(--muted); font-size: 13px;">
                ${p.requiresCTO ? `<span>CTO: ${roleStatus(p, "cto")}</span>` : ""}
                ${p.requiresCFO ? `<span>CFO: ${roleStatus(p, "cfo")}</span>` : ""}
              </div>
            </div>
            <div style="text-align: right; color: var(--muted); font-size: 13px;">
              ${p.promisedDeadlineDays ? `<div>Prazo: ${p.promisedDeadlineDays} dia(s)</div>` : ""}
              ${p.promisedPrice !== null && p.promisedPrice !== undefined ? `<div>Preço: ${p.promisedPrice}</div>` : ""}
            </div>
          </div>
        </div>
      `)
      .join("");
  };

  const render = () => {
    const promises = window.CMOPromises.getAll();
    const proposalsMap = new Map((window.CMOPromises.getLastSentProposals() || []).map((p) => [p.id, p]));

    const awaitingCTO = promises.filter((p) => p.status === "waiting_cto");
    const awaitingCFO = promises.filter((p) => p.status === "waiting_cfo");
    const approved = promises.filter((p) => p.status === "approved");
    const rejected = promises.filter((p) => p.status === "rejected");

    renderGroup(containers.waitingCTO, awaitingCTO, "Nenhuma promessa aguardando CTO.", proposalsMap);
    renderGroup(containers.waitingCFO, awaitingCFO, "Nenhuma promessa aguardando CFO.", proposalsMap);
    renderGroup(containers.approved, approved, "Nenhuma promessa aprovada.", proposalsMap);
    renderGroup(containers.rejected, rejected, "Nenhuma promessa rejeitada.", proposalsMap);
  };

  window.CMOPromises.syncWithProposals().then(render).catch(render);
})();
