// CEO guard
// ceo.guard.js
(() => {
  const K = window.STORAGE_KEYS || {};
  const auth = localStorage.getItem(K.AUTH || "auth");
  const role = localStorage.getItem(K.ROLE || "role");

  if (!auth) {
    window.location.href = "../index.html";
    return;
  }

  // Se quiser permitir variações (ex: "CEO"), normalize:
  if (String(role).toLowerCase() !== "ceo") {
    // Redireciona para a área correta do usuário
    window.location.href = `../${String(role).toLowerCase()}/index.html`;
    return;
  }
})();
