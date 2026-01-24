// CTO – Gestão Técnica
// Index: Dashboard com contadores de Intake e Debt

const CTO = (() => {
  const STORAGE_KEYS = {
    INTAKE: "cto_intake_items",
    DEBT: "cto_debt_items",
  };

  function loadCounters() {
    const intakeData = JSON.parse(localStorage.getItem(STORAGE_KEYS.INTAKE) || "[]");
    const debtData = JSON.parse(localStorage.getItem(STORAGE_KEYS.DEBT) || "[]");

    // Contadores de Intake
    const intakePending = intakeData.filter(i => i.status === "pending").length;
    const intakeReviewed = intakeData.filter(i => i.status === "reviewed").length;

    // Contadores de Debt
    const debtCritical = debtData.filter(d => d.severity === "critical" || d.severity === "high").length;
    const debtInProgress = debtData.filter(d => d.status === "doing").length;

    // Atualizar DOM
    const pendingEl = document.getElementById("intakePendingCount");
    const reviewedEl = document.getElementById("intakeReviewedCount");
    const criticalEl = document.getElementById("debtCriticalCount");
    const progressEl = document.getElementById("debtProgressCount");

    if (pendingEl) pendingEl.textContent = intakePending;
    if (reviewedEl) reviewedEl.textContent = intakeReviewed;
    if (criticalEl) criticalEl.textContent = debtCritical;
    if (progressEl) progressEl.textContent = debtInProgress;
  }

  // Inicializar
  function init() {
    loadCounters();
  }

  init();
})();
