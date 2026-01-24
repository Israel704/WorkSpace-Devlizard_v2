(() => {
  const TYPE_MULT = {
    "Web Site": 1.0,
    "Landing Page": 0.7,
    "App": 1.6,
    "Sistema": 1.8,
    "Consultoria": 1.2,
    "E-commerce": 2.0,
    "Integração/API": 1.4,
  };

  const COMPLEXITY_MULT = {
    "Fácil": 0.8,
    "Médio": 1.0,
    "Difícil": 1.35,
    "Complexo": 1.75,
  };

  const BASE_PER_FEATURE = 600;

  const MAINTENANCE_RATE = {
    "Nenhuma": 0,
    "3 meses": 0.1,
    "6 meses": 0.18,
    "12 meses": 0.3,
  };

  const RENT_MONTHLY_RATE = 0.12;
  const HISTORY_KEY = "cfo_pricing_history";

  let lastResult = null;

  const formatCurrency = (value) => {
    if (window.App?.formatCurrency) return window.App.formatCurrency(value);
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const devMultiplier = (devs) => {
    if (devs <= 1) return 1.0;
    if (devs === 2) return 1.12;
    if (devs === 3) return 1.22;
    if (devs <= 5) return 1.35;
    return 1.5;
  };

  const maintenanceMonths = (label) => {
    if (label === "3 meses") return 3;
    if (label === "6 meses") return 6;
    if (label === "12 meses") return 12;
    return 0;
  };

  const readNumber = (input, min, max) => {
    const raw = parseInt(input?.value, 10);
    if (Number.isNaN(raw)) return null;
    if (raw < min || raw > max) return null;
    return raw;
  };

  const readForm = () => {
    const type = document.getElementById("projectType")?.value;
    const complexity = document.getElementById("complexity")?.value;
    const features = readNumber(document.getElementById("features"), 1, 200);
    const devs = readNumber(document.getElementById("devs"), 1, 20);
    const acquisition = document.querySelector('input[name="acquisition"]:checked')?.value;
    const maintenance = document.getElementById("maintenance")?.value || "Nenhuma";
    const discount = Boolean(document.getElementById("discount")?.checked);

    if (!type) return alert("Selecione o tipo de projeto."), null;
    if (!complexity) return alert("Selecione a complexidade."), null;
    if (!features) return alert("Informe a quantidade de funcionalidades (1 a 200)."), null;
    if (!devs) return alert("Informe a quantidade de devs (1 a 20)."), null;
    if (!acquisition) return alert("Escolha o modelo de aquisição."), null;

    return { type, complexity, features, devs, acquisition, maintenance, discount };
  };

  const calculatePricing = (data) => {
    const baseCost = data.features * BASE_PER_FEATURE;
    const typeMult = TYPE_MULT[data.type] ?? 1;
    const complexityMult = COMPLEXITY_MULT[data.complexity] ?? 1;
    const devMult = devMultiplier(data.devs);

    const subtotal = baseCost * typeMult * complexityMult * devMult;
    const maintenanceRate = MAINTENANCE_RATE[data.maintenance] ?? 0;
    const maintenanceValue = subtotal * maintenanceRate;

    const totalBuy = subtotal + maintenanceValue;

    const months = maintenanceMonths(data.maintenance);
    const monthlyBase = subtotal * RENT_MONTHLY_RATE;
    const monthlyMaintenance = months > 0 ? maintenanceValue / months : 0;
    const monthlyTotal = monthlyBase + monthlyMaintenance;

    const finalValue = data.acquisition === "Compra"
      ? data.discount ? totalBuy * 0.55 : totalBuy
      : data.discount ? monthlyTotal * 0.55 : monthlyTotal;

    const originalValue = data.acquisition === "Compra" ? totalBuy : monthlyTotal;
    const discountSavings = data.discount ? originalValue - finalValue : 0;

    return {
      data,
      baseCost,
      typeMult,
      complexityMult,
      devMult,
      subtotal,
      maintenanceRate,
      maintenanceValue,
      totalBuy,
      months,
      monthlyBase,
      monthlyMaintenance,
      monthlyTotal,
      finalValue,
      discountSavings,
      originalValue,
    };
  };

  const renderBreakdownItem = (label, value) => {
    return `<div style="padding: 12px; border: 1px solid #eee; border-radius: 6px; background: rgba(255,255,255,0.04);">
      <p style="margin: 0; color: var(--muted); font-size: 12px;">${label}</p>
      <strong style="font-size: 16px;">${value}</strong>
    </div>`;
  };

  const renderResult = (calc) => {
    const resultCard = document.getElementById("resultCard");
    const resultContent = document.getElementById("resultContent");
    const resultSummary = document.getElementById("resultSummary");
    if (!resultCard || !resultContent || !resultSummary) return;

    const maintenancePercent = (calc.maintenanceRate * 100).toFixed(0) + "%";

    const items = [
      renderBreakdownItem("Preço por funcionalidade", formatCurrency(BASE_PER_FEATURE)),
      renderBreakdownItem("Multiplicador do tipo", `${calc.typeMult} (${calc.data.type})`),
      renderBreakdownItem("Multiplicador da complexidade", `${calc.complexityMult} (${calc.data.complexity})`),
      renderBreakdownItem("Multiplicador por devs", `${calc.devMult} (${calc.data.devs} devs)`),
      renderBreakdownItem("Subtotal (após multiplicadores)", formatCurrency(calc.subtotal)),
      renderBreakdownItem("Manutenção", `${maintenancePercent} → ${formatCurrency(calc.maintenanceValue)}`),
    ];

    if (calc.data.acquisition === "Aluguel") {
      items.push(renderBreakdownItem("Aluguel (12%/mês)", formatCurrency(calc.monthlyBase)));
      if (calc.monthlyMaintenance > 0) {
        items.push(renderBreakdownItem("Manutenção por mês", formatCurrency(calc.monthlyMaintenance)));
      }
    }

    resultContent.innerHTML = items.join("");

    const acquisitionLabel = calc.data.acquisition === "Compra" ? "Total (compra)" : "Mensal (aluguel)";
    const discountLabel = calc.data.discount ? "Sim" : "Não";
    const maintenanceLabel = calc.data.maintenance || "Nenhuma";
    const baseBeforeDiscount = calc.data.acquisition === "Compra" ? calc.totalBuy : calc.monthlyTotal;
    const discountSavingsLabel = formatCurrency(calc.discountSavings);

    resultSummary.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
        <div>
          <p style="margin: 0; color: var(--muted);">${acquisitionLabel}</p>
          <strong style="font-size: 20px;">${formatCurrency(calc.finalValue)}</strong>
        </div>
        <div>
          <p style="margin: 0; color: var(--muted);">Base antes do desconto</p>
          <strong>${formatCurrency(baseBeforeDiscount)}</strong>
        </div>
        <div>
          <p style="margin: 0; color: var(--muted);">Desconto aplicado</p>
          <strong>${discountLabel} (economia ${discountSavingsLabel})</strong>
        </div>
        <div>
          <p style="margin: 0; color: var(--muted);">Manutenção</p>
          <strong>${maintenanceLabel}</strong>
        </div>
      </div>
    `;

    resultCard.style.display = "block";
  };

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn("Erro ao ler histórico", e);
      return [];
    }
  };

  const persistHistory = (history) => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn("Erro ao salvar histórico", e);
    }
  };

  const renderHistory = () => {
    const container = document.getElementById("historyList");
    if (!container) return;

    const history = loadHistory();
    if (!history.length) {
      container.innerHTML = "<p style=\"color: var(--muted);\">Nenhuma estimativa salva.</p>";
      return;
    }

    const rows = history.slice(0, 10).map((item) => {
      const date = new Date(item.createdAt).toLocaleString("pt-BR");
      return `<div style="border: 1px solid #eee; border-radius: 6px; padding: 12px; margin-bottom: 8px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; align-items: center;">
        <div>
          <p style="margin: 0; color: var(--muted);">${date}</p>
          <strong>${item.type} • ${item.complexity}</strong>
        </div>
        <div>
          <p style="margin: 0; color: var(--muted);">Aquisição</p>
          <strong>${item.acquisition}</strong>
        </div>
        <div>
          <p style="margin: 0; color: var(--muted);">Funcionalidades / Devs</p>
          <strong>${item.features} / ${item.devs}</strong>
        </div>
        <div>
          <p style="margin: 0; color: var(--muted);">Resultado</p>
          <strong>${formatCurrency(item.resultValue)}</strong>
          <p style="margin: 0; color: var(--muted); font-size: 12px;">Desconto: ${item.discountApplied ? "Sim" : "Não"}</p>
        </div>
        <div style="text-align: right;">
          <button data-id="${item.id}" class="delete-history" style="padding: 8px 10px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Excluir item</button>
        </div>
      </div>`;
    });

    container.innerHTML = rows.join("");
  };

  const saveHistoryItem = (calc) => {
    const history = loadHistory();
    const entry = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      type: calc.data.type,
      complexity: calc.data.complexity,
      features: calc.data.features,
      devs: calc.data.devs,
      acquisition: calc.data.acquisition,
      maintenance: calc.data.maintenance,
      discountApplied: calc.data.discount,
      resultValue: calc.finalValue,
    };

    history.unshift(entry);
    persistHistory(history.slice(0, 50));
    renderHistory();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const data = readForm();
    if (!data) return;

    const calc = calculatePricing(data);
    lastResult = calc;
    renderResult(calc);
  };

  const handleClear = () => {
    const form = document.getElementById("pricingForm");
    if (form) form.reset();
    const maintenance = document.getElementById("maintenance");
    if (maintenance) maintenance.value = "Nenhuma";
    const resultCard = document.getElementById("resultCard");
    if (resultCard) resultCard.style.display = "none";
    lastResult = null;
  };

  const handleSave = () => {
    if (!lastResult) {
      alert("Calcule primeiro para salvar a estimativa.");
      return;
    }
    saveHistoryItem(lastResult);
    alert("Estimativa salva no histórico.");
  };

  const handleHistoryClick = (event) => {
    const target = event.target;
    if (target?.classList.contains("delete-history")) {
      const id = Number(target.getAttribute("data-id"));
      const history = loadHistory().filter((item) => item.id !== id);
      persistHistory(history);
      renderHistory();
    }
  };

  const handleClearHistory = () => {
    persistHistory([]);
    renderHistory();
  };

  const init = () => {
    const form = document.getElementById("pricingForm");
    const clearBtn = document.getElementById("clearBtn");
    const saveBtn = document.getElementById("saveBtn");
    const historyList = document.getElementById("historyList");
    const clearHistoryBtn = document.getElementById("clearHistory");

    if (form) form.addEventListener("submit", handleSubmit);
    if (clearBtn) clearBtn.addEventListener("click", handleClear);
    if (saveBtn) saveBtn.addEventListener("click", handleSave);
    if (historyList) historyList.addEventListener("click", handleHistoryClick);
    if (clearHistoryBtn) clearHistoryBtn.addEventListener("click", handleClearHistory);

    const maintenance = document.getElementById("maintenance");
    if (maintenance) maintenance.value = "Nenhuma";

    renderHistory();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
