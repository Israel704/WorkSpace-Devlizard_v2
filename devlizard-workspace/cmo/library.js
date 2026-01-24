(function () {
  const listEl = document.getElementById("libraryList");
  if (!listEl || !window.CMOPromises) return;

  const render = () => {
    const promises = window.CMOPromises.getAll().filter((p) => p.status === "approved");
    const proposalsMap = new Map((window.CMOPromises.getLastSentProposals() || []).map((p) => [p.id, p]));

    if (!promises.length) {
      listEl.innerHTML = '<div class="card"><p style="color: var(--muted);">Nenhuma promessa aprovada até o momento.</p></div>';
      return;
    }

    const formatDate = (ts) => {
      if (!ts) return "-";
      const d = new Date(ts);
      return d.toLocaleDateString("pt-BR", { year: "numeric", month: "2-digit", day: "2-digit" });
    };

    listEl.innerHTML = promises
      .map((p) => {
        const approvalTs = p.approvedAt || (() => {
          const dates = [];
          if (p.proposalIds?.cto) {
            const prop = proposalsMap.get(p.proposalIds.cto);
            if (prop?.decidedAt) dates.push(prop.decidedAt * 1000);
          }
          if (p.proposalIds?.cfo) {
            const prop = proposalsMap.get(p.proposalIds.cfo);
            if (prop?.decidedAt) dates.push(prop.decidedAt * 1000);
          }
          return dates.length ? Math.max(...dates) : null;
        })();

        return `
          <div class="card" style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; gap: 12px; align-items: flex-start;">
              <div>
                <h3 style="margin: 0;">${p.title}</h3>
                <p style="margin: 4px 0; color: var(--muted);">${window.CMOPromises.TYPE_LABELS[p.type] || p.type}</p>
                <p style="margin: 6px 0; color: var(--muted); font-size: 14px;">${p.description}</p>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; color: var(--muted); font-size: 13px;">
                  ${p.audience ? `<span>Público: ${p.audience}</span>` : ""}
                  ${p.promisedDeadlineDays ? `<span>Prazo: ${p.promisedDeadlineDays} dia(s)</span>` : ""}
                  ${p.promisedPrice !== null && p.promisedPrice !== undefined ? `<span>Preço: ${p.promisedPrice}</span>` : ""}
                  ${p.acquisitionModel ? `<span>Modelo: ${p.acquisitionModel}</span>` : ""}
                  <span>Aprovada em: ${formatDate(approvalTs)}</span>
                </div>
              </div>
              <button data-id="${p.id}" class="obsolete" style="padding: 8px 12px; background: #dc3545; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Marcar como obsoleta</button>
            </div>
          </div>
        `;
      })
      .join("");
  };

  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button.obsolete");
    if (!btn) return;
    const id = Number(btn.getAttribute("data-id"));
    const res = window.CMOPromises.markObsolete(id);
    if (res.error) alert(res.error);
    else render();
  });

  window.CMOPromises.syncWithProposals().then(render).catch(render);
})();
