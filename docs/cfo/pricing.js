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

(() => {
  const STORAGE_KEY = "cfm_project_costs_v2";
  const CATEGORY_LIST = [
    "Infraestrutura",
    "Serviços técnicos",
    "Comunicação/Transacional",
    "Operação/Manutenção",
  ];

  const DEFAULT_STATE = {
    projectType: "",
    contractMonths: 12,
    contingencyPct: 10,
    serverMonthly: 0,
    domainValue: 0,
    domainFrequency: "mensal",
    recurringItems: [],
    oneTimeItems: [],
  };

  const TEMPLATES = {
    site: {
      recurring: [
        { name: "Hospedagem (site)", category: "Infraestrutura" },
        { name: "Monitoramento/Uptime", category: "Serviços técnicos" },
        { name: "E-mail profissional (opcional)", category: "Comunicação/Transacional" },
      ],
      oneTime: [
        { name: "Design/UI (one-time)" },
        { name: "Implementação/Setup (one-time)" },
        { name: "SEO básico (one-time)" },
      ],
    },
    sistema: {
      recurring: [
        { name: "Servidor/Compute", category: "Infraestrutura" },
        { name: "Banco de dados", category: "Infraestrutura" },
        { name: "Storage/Arquivos", category: "Infraestrutura" },
        { name: "Backups", category: "Serviços técnicos" },
        { name: "Logs/Erros (Sentry etc.)", category: "Serviços técnicos" },
        { name: "E-mail transacional", category: "Comunicação/Transacional" },
      ],
      oneTime: [
        { name: "Setup/Implantação" },
        { name: "Configuração de ambiente/CI-CD" },
      ],
    },
    saas: {
      recurring: [
        { name: "Compute escalável", category: "Infraestrutura" },
        { name: "Banco gerenciado", category: "Infraestrutura" },
        { name: "Storage", category: "Infraestrutura" },
        { name: "Cache (Redis)", category: "Infraestrutura" },
        { name: "Monitoramento/Observabilidade", category: "Serviços técnicos" },
        { name: "Backups/DR", category: "Serviços técnicos" },
        { name: "E-mail transacional", category: "Comunicação/Transacional" },
        { name: "SMS/WhatsApp (se aplicável)", category: "Comunicação/Transacional" },
        { name: "Suporte/Operação mensal", category: "Operação/Manutenção" },
        { name: "Custos de pagamento (gateway) (opcional mensal)", category: "Operação/Manutenção" },
      ],
      oneTime: [
        { name: "Setup/Implantação" },
        { name: "Config. pagamentos/assinaturas" },
        { name: "Config. emissão de nota (se aplicável)" },
      ],
    },
    app: {
      recurring: [
        { name: "Backend/Servidor", category: "Infraestrutura" },
        { name: "Banco de dados", category: "Infraestrutura" },
        { name: "Storage", category: "Infraestrutura" },
        { name: "Crash/Analytics", category: "Serviços técnicos" },
        { name: "Push notifications", category: "Comunicação/Transacional" },
        { name: "Apple Developer (equiv. mensal)", category: "Operação/Manutenção" },
      ],
      oneTime: [
        { name: "Publicação Google Play" },
        { name: "Setup/Implantação" },
      ],
    },
  };

  let state = { ...DEFAULT_STATE };
  let saveTimer = null;

  const formatCurrency = (value) => {
    if (window.App?.formatCurrency) return window.App.formatCurrency(value);
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const clampNumber = (value, min, max) => {
    if (Number.isNaN(value)) return min;
    if (value < min) return min;
    if (value > max) return max;
    return value;
  };

  const parseValue = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    const normalized = String(value).replace(",", ".");
    const parsed = Number.parseFloat(normalized);
    if (Number.isNaN(parsed) || parsed < 0) return 0;
    return parsed;
  };

  const nextId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const domainMonthlyEquivalent = () => {
    const base = parseValue(state.domainValue);
    return state.domainFrequency === "anual" ? base / 12 : base;
  };

  const totals = () => {
    const recurringSum = state.recurringItems.reduce((sum, item) => sum + parseValue(item.valueMonthly), 0);
    const oneTimeSum = state.oneTimeItems.reduce((sum, item) => sum + parseValue(item.valueOneTime), 0);
    const serverMonthly = parseValue(state.serverMonthly);
    const domainMonthly = domainMonthlyEquivalent();
    const totalRecurringMonthly = serverMonthly + domainMonthly + recurringSum;
    const totalUnico = oneTimeSum;
    const months = parseValue(state.contractMonths);
    const basePeriod = (totalRecurringMonthly * months) + totalUnico;
    const contingencyPct = clampNumber(parseValue(state.contingencyPct), 0, 30);
    const contingencyValue = basePeriod * (contingencyPct / 100);
    const totalWithContingency = basePeriod + contingencyValue;

    return {
      totalRecurringMonthly,
      totalUnico,
      basePeriod,
      contingencyValue,
      totalWithContingency,
      contingencyPct,
      serverMonthly,
      domainMonthly,
    };
  };

  const categoryTotals = () => {
    const grouped = {};
    CATEGORY_LIST.forEach((category) => {
      grouped[category] = 0;
    });
    state.recurringItems.forEach((item) => {
      const category = item.category || CATEGORY_LIST[0];
      if (!grouped[category]) grouped[category] = 0;
      grouped[category] += parseValue(item.valueMonthly);
    });
    return grouped;
  };

  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn("Erro ao salvar custos do projeto", e);
      }
    }, 300);
  };

  const setState = (patch, renderMode = "all") => {
    state = { ...state, ...patch };
    if (renderMode === "all") {
      renderAll();
    } else if (renderMode === "totals") {
      renderDomainEquivalent();
      updateCategorySubtotals();
      renderTotals();
    }
    scheduleSave();
  };

  const hydrateState = (incoming) => {
    if (!incoming || typeof incoming !== "object") return;
    state = {
      ...DEFAULT_STATE,
      ...incoming,
      recurringItems: Array.isArray(incoming.recurringItems) ? incoming.recurringItems : [],
      oneTimeItems: Array.isArray(incoming.oneTimeItems) ? incoming.oneTimeItems : [],
    };
  };

  const loadState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      hydrateState(JSON.parse(raw));
    } catch (e) {
      console.warn("Erro ao carregar custos do projeto", e);
    }
  };

  const renderCategoryOptions = () => {
    const select = document.getElementById("costRecurringCategory");
    if (!select) return;
    select.innerHTML = CATEGORY_LIST.map((category) => `<option value="${category}">${category}</option>`).join("");
  };

  const renderProjectType = () => {
    const select = document.getElementById("costProjectType");
    if (select) select.value = state.projectType || "";
  };

  const renderInputs = () => {
    const months = document.getElementById("costContractMonths");
    const contingency = document.getElementById("costContingency");
    const server = document.getElementById("costServerMonthly");
    const domainValue = document.getElementById("costDomainValue");
    const domainFreq = document.getElementById("costDomainFrequency");

    if (months) months.value = String(state.contractMonths ?? 12);
    if (contingency) contingency.value = state.contingencyPct ?? 10;
    if (server) server.value = state.serverMonthly ?? 0;
    if (domainValue) domainValue.value = state.domainValue ?? 0;
    if (domainFreq) domainFreq.value = state.domainFrequency ?? "mensal";
  };

  const renderDomainEquivalent = () => {
    const label = document.getElementById("costDomainEquivalent");
    if (!label) return;
    const monthly = domainMonthlyEquivalent();
    label.textContent = `Equivalente mensal: ${formatCurrency(monthly)}`;
  };

  const renderRecurring = () => {
    const container = document.getElementById("costRecurringCategories");
    if (!container) return;
    const totalsByCategory = categoryTotals();

    const sections = CATEGORY_LIST.map((category) => {
      const items = state.recurringItems.filter((item) => item.category === category);
      const rows = items.length
        ? items.map((item) => `
            <div class="cost-item-row" data-id="${item.id}" style="display: grid; grid-template-columns: 2fr 1fr 150px 90px; gap: 8px; align-items: center; padding: 8px; border: 1px solid #1f1f1f; border-radius: 6px; background: rgba(255,255,255,0.02);">
              <input data-field="name" type="text" value="${item.name ?? ""}" style="width: 100%; padding: 8px; border: 1px solid #333; border-radius: 4px;" />
              <input data-field="valueMonthly" type="number" min="0" step="0.01" value="${item.valueMonthly ?? 0}" style="width: 100%; padding: 8px; border: 1px solid #333; border-radius: 4px;" />
              <select data-field="category" style="width: 100%; padding: 8px; border: 1px solid #333; border-radius: 4px;">
                ${CATEGORY_LIST.map((opt) => `<option value="${opt}" ${opt === item.category ? "selected" : ""}>${opt}</option>`).join("")}
              </select>
              <button data-action="remove-recurring" style="padding: 8px 10px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Remover</button>
            </div>
          `).join("")
        : `<div style="color: var(--muted); font-size: 13px; padding: 8px;">Nenhum item.</div>`;

      return `
        <details open data-category="${category}" style="border: 1px solid #1f1f1f; border-radius: 6px; padding: 10px; background: rgba(255,255,255,0.02);">
          <summary style="cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
            <strong>${category}</strong>
            <span class="category-subtotal" style="color: var(--muted);">${formatCurrency(totalsByCategory[category] || 0)}</span>
          </summary>
          <div style="display: grid; gap: 8px; margin-top: 10px;">
            ${rows}
          </div>
        </details>
      `;
    });

    container.innerHTML = sections.join("");
  };

  const renderOneTime = () => {
    const container = document.getElementById("costOneTimeList");
    if (!container) return;
    if (!state.oneTimeItems.length) {
      container.innerHTML = `<div style="color: var(--muted); font-size: 13px; padding: 8px; border: 1px solid #1f1f1f; border-radius: 6px; background: rgba(255,255,255,0.02);">Nenhum item.</div>`;
      return;
    }

    container.innerHTML = state.oneTimeItems.map((item) => `
      <div class="cost-item-row" data-id="${item.id}" style="display: grid; grid-template-columns: 2fr 1fr 90px; gap: 8px; align-items: center; padding: 8px; border: 1px solid #1f1f1f; border-radius: 6px; background: rgba(255,255,255,0.02);">
        <input data-field="name" type="text" value="${item.name ?? ""}" style="width: 100%; padding: 8px; border: 1px solid #333; border-radius: 4px;" />
        <input data-field="valueOneTime" type="number" min="0" step="0.01" value="${item.valueOneTime ?? 0}" style="width: 100%; padding: 8px; border: 1px solid #333; border-radius: 4px;" />
        <button data-action="remove-one-time" style="padding: 8px 10px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Remover</button>
      </div>
    `).join("");
  };

  const renderTotals = () => {
    const container = document.getElementById("costTotals");
    if (!container) return;
    const summary = totals();
    const categories = categoryTotals();

    const categoryLines = CATEGORY_LIST.map((category) => {
      return `<div style="display: flex; justify-content: space-between; gap: 8px;">
        <span style="color: var(--muted);">${category}</span>
        <strong>${formatCurrency(categories[category] || 0)}</strong>
      </div>`;
    }).join("");

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
        <div>
          <p style="margin: 0; color: var(--muted);">Total recorrente mensal</p>
          <strong style="font-size: 18px;">${formatCurrency(summary.totalRecurringMonthly)}</strong>
        </div>
        <div>
          <p style="margin: 0; color: var(--muted);">Total único</p>
          <strong style="font-size: 18px;">${formatCurrency(summary.totalUnico)}</strong>
        </div>
        <div>
          <p style="margin: 0; color: var(--muted);">Total no período</p>
          <strong style="font-size: 18px;">${formatCurrency(summary.basePeriod)}</strong>
        </div>
        <div>
          <p style="margin: 0; color: var(--muted);">Contingência (${summary.contingencyPct}%)</p>
          <strong style="font-size: 18px;">${formatCurrency(summary.contingencyValue)}</strong>
        </div>
        <div>
          <p style="margin: 0; color: var(--muted);">Total com contingência</p>
          <strong style="font-size: 18px;">${formatCurrency(summary.totalWithContingency)}</strong>
        </div>
      </div>
      <div style="margin-top: 12px; border-top: 1px dashed #333; padding-top: 12px; display: grid; gap: 6px;">
        <strong>Subtotais por categoria (recorrente)</strong>
        ${categoryLines}
      </div>
    `;
  };

  const updateCategorySubtotals = () => {
    const totalsByCategory = categoryTotals();
    CATEGORY_LIST.forEach((category) => {
      const details = document.querySelector(`details[data-category="${category}"]`);
      const label = details?.querySelector(".category-subtotal");
      if (label) label.textContent = formatCurrency(totalsByCategory[category] || 0);
    });
  };

  const renderAll = () => {
    renderProjectType();
    renderInputs();
    renderDomainEquivalent();
    renderRecurring();
    renderOneTime();
    renderTotals();
  };

  const updateRecurringItem = (id, field, value) => {
    let shouldRerender = false;
    state.recurringItems = state.recurringItems.map((item) => {
      if (item.id !== id) return item;
      if (field === "name") return { ...item, name: value };
      if (field === "valueMonthly") return { ...item, valueMonthly: parseValue(value) };
      if (field === "category") {
        shouldRerender = true;
        return { ...item, category: value };
      }
      return item;
    });
    if (shouldRerender) {
      renderAll();
    } else {
      updateCategorySubtotals();
      renderTotals();
    }
    scheduleSave();
  };

  const updateOneTimeItem = (id, field, value) => {
    state.oneTimeItems = state.oneTimeItems.map((item) => {
      if (item.id !== id) return item;
      if (field === "name") return { ...item, name: value };
      if (field === "valueOneTime") return { ...item, valueOneTime: parseValue(value) };
      return item;
    });
    renderTotals();
    scheduleSave();
  };

  const handleRecurringList = (event) => {
    const target = event.target;
    const row = target.closest(".cost-item-row");
    if (!row) return;
    const id = row.getAttribute("data-id");
    if (!id) return;

    if (target.dataset.action === "remove-recurring") {
      state.recurringItems = state.recurringItems.filter((item) => item.id !== id);
      renderAll();
      scheduleSave();
      return;
    }

    if (target.dataset.field) {
      updateRecurringItem(id, target.dataset.field, target.value);
    }
  };

  const handleOneTimeList = (event) => {
    const target = event.target;
    const row = target.closest(".cost-item-row");
    if (!row) return;
    const id = row.getAttribute("data-id");
    if (!id) return;

    if (target.dataset.action === "remove-one-time") {
      state.oneTimeItems = state.oneTimeItems.filter((item) => item.id !== id);
      renderAll();
      scheduleSave();
      return;
    }

    if (target.dataset.field) {
      updateOneTimeItem(id, target.dataset.field, target.value);
    }
  };

  const applyTemplate = () => {
    const typeSelect = document.getElementById("costProjectType");
    const selected = typeSelect?.value || "";
    if (!selected) {
      alert("Selecione o tipo de projeto antes de aplicar o modelo.");
      return;
    }
    const confirmReplace = confirm("Substituir sua lista atual?");
    if (!confirmReplace) return;

    const template = TEMPLATES[selected];
    const recurringItems = (template?.recurring || []).map((item) => ({
      id: nextId(),
      name: item.name,
      category: item.category || CATEGORY_LIST[0],
      valueMonthly: 0,
    }));
    const oneTimeItems = (template?.oneTime || []).map((item) => ({
      id: nextId(),
      name: item.name,
      valueOneTime: 0,
    }));

    state = {
      ...state,
      projectType: selected,
      serverMonthly: 0,
      domainValue: 0,
      domainFrequency: "mensal",
      recurringItems,
      oneTimeItems,
    };
    renderAll();
    scheduleSave();
  };

  const handleAddRecurring = () => {
    const category = document.getElementById("costRecurringCategory")?.value || CATEGORY_LIST[0];
    const nameInput = document.getElementById("costRecurringName");
    const valueInput = document.getElementById("costRecurringValue");
    const name = nameInput?.value?.trim();
    if (!name) {
      alert("Informe o nome do custo recorrente.");
      return;
    }
    const valueMonthly = parseValue(valueInput?.value);
    state.recurringItems = [
      ...state.recurringItems,
      { id: nextId(), name, category, valueMonthly },
    ];
    if (nameInput) nameInput.value = "";
    if (valueInput) valueInput.value = "";
    renderAll();
    scheduleSave();
  };

  const handleAddOneTime = () => {
    const nameInput = document.getElementById("costOneTimeName");
    const valueInput = document.getElementById("costOneTimeValue");
    const name = nameInput?.value?.trim();
    if (!name) {
      alert("Informe o nome do custo único.");
      return;
    }
    const valueOneTime = parseValue(valueInput?.value);
    state.oneTimeItems = [
      ...state.oneTimeItems,
      { id: nextId(), name, valueOneTime },
    ];
    if (nameInput) nameInput.value = "";
    if (valueInput) valueInput.value = "";
    renderAll();
    scheduleSave();
  };

  const handleClear = () => {
    state = { ...DEFAULT_STATE };
    renderAll();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("Erro ao limpar storage de custos", e);
    }
  };

  const buildSummaryText = () => {
    const summary = totals();
    const categories = categoryTotals();
    const recurringByCategory = CATEGORY_LIST.map((category) => {
      const items = state.recurringItems.filter((item) => item.category === category);
      const lines = items.length
        ? items.map((item) => `- ${item.name}: ${formatCurrency(parseValue(item.valueMonthly))}`)
        : ["- (sem itens)"];
      return [`${category}:`, ...lines, `Subtotal: ${formatCurrency(categories[category] || 0)}`].join("\n");
    }).join("\n");

    const oneTimeLines = state.oneTimeItems.length
      ? state.oneTimeItems.map((item) => `- ${item.name}: ${formatCurrency(parseValue(item.valueOneTime))}`).join("\n")
      : "- (sem itens)";

    const typeLabelMap = {
      site: "Site (Landing/Institucional)",
      sistema: "Sistema Web (Painel/CRM/ERP)",
      saas: "SaaS (multi-tenant/assinaturas)",
      app: "App (Android/iOS)",
    };

    const typeLabel = typeLabelMap[state.projectType] || "Não definido";

    return [
      "Resumo - Calculadora de Custos do Projeto",
      `Tipo de projeto: ${typeLabel}`,
      `Período do contrato: ${state.contractMonths} meses`,
      `Contingência: ${summary.contingencyPct}%`,
      "",
      `Servidor: ${formatCurrency(summary.serverMonthly)} (R$/mês)`,
      `Domínio: ${formatCurrency(parseValue(state.domainValue))} (${state.domainFrequency})`,
      `Domínio (equiv. mensal): ${formatCurrency(summary.domainMonthly)}`,
      "",
      "Custos recorrentes por categoria:",
      recurringByCategory,
      "",
      "Custos únicos:",
      oneTimeLines,
      "",
      `Total recorrente mensal: ${formatCurrency(summary.totalRecurringMonthly)}`,
      `Total único: ${formatCurrency(summary.totalUnico)}`,
      `Total no período: ${formatCurrency(summary.basePeriod)}`,
      `Contingência: ${formatCurrency(summary.contingencyValue)}`,
      `Total no período + contingência: ${formatCurrency(summary.totalWithContingency)}`,
    ].join("\n");
  };

  const handleCopy = async () => {
    const text = buildSummaryText();
    try {
      await navigator.clipboard.writeText(text);
      alert("Resumo copiado para a área de transferência.");
    } catch (e) {
      console.warn("Clipboard indisponível", e);
      alert("Não foi possível copiar automaticamente. Tente em um navegador compatível.");
    }
  };

  const bindInput = (id, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", handler);
  };

  const initCosts = () => {
    if (!document.getElementById("projectCostsCard")) return;
    renderCategoryOptions();
    loadState();
    renderAll();

    bindInput("costContractMonths", (event) => {
      const value = parseValue(event.target.value);
      setState({ contractMonths: value || 0 }, "totals");
    });
    bindInput("costContingency", (event) => {
      const value = clampNumber(parseValue(event.target.value), 0, 30);
      setState({ contingencyPct: value }, "totals");
    });
    bindInput("costServerMonthly", (event) => {
      setState({ serverMonthly: parseValue(event.target.value) }, "totals");
    });
    bindInput("costDomainValue", (event) => {
      setState({ domainValue: parseValue(event.target.value) }, "totals");
    });
    bindInput("costDomainFrequency", (event) => {
      setState({ domainFrequency: event.target.value }, "totals");
    });

    const typeSelect = document.getElementById("costProjectType");
    if (typeSelect) {
      typeSelect.addEventListener("change", (event) => {
        setState({ projectType: event.target.value }, "none");
      });
    }

    const monthsSelect = document.getElementById("costContractMonths");
    if (monthsSelect) {
      monthsSelect.addEventListener("change", (event) => {
        const value = parseValue(event.target.value);
        setState({ contractMonths: value || 0 }, "totals");
      });
    }

    const domainSelect = document.getElementById("costDomainFrequency");
    if (domainSelect) {
      domainSelect.addEventListener("change", (event) => {
        setState({ domainFrequency: event.target.value }, "totals");
      });
    }

    const recurringContainer = document.getElementById("costRecurringCategories");
    if (recurringContainer) {
      recurringContainer.addEventListener("input", handleRecurringList);
      recurringContainer.addEventListener("change", handleRecurringList);
      recurringContainer.addEventListener("click", handleRecurringList);
    }

    const oneTimeContainer = document.getElementById("costOneTimeList");
    if (oneTimeContainer) {
      oneTimeContainer.addEventListener("input", handleOneTimeList);
      oneTimeContainer.addEventListener("change", handleOneTimeList);
      oneTimeContainer.addEventListener("click", handleOneTimeList);
    }

    const addRecurringBtn = document.getElementById("addRecurringBtn");
    if (addRecurringBtn) addRecurringBtn.addEventListener("click", handleAddRecurring);
    const addOneTimeBtn = document.getElementById("addOneTimeBtn");
    if (addOneTimeBtn) addOneTimeBtn.addEventListener("click", handleAddOneTime);
    const applyBtn = document.getElementById("applyCostTemplate");
    if (applyBtn) applyBtn.addEventListener("click", applyTemplate);

    const clearBtn = document.getElementById("costsClearBtn");
    if (clearBtn) clearBtn.addEventListener("click", handleClear);
    const copyBtn = document.getElementById("costsCopyBtn");
    if (copyBtn) copyBtn.addEventListener("click", handleCopy);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCosts);
  } else {
    initCosts();
  }
})();
