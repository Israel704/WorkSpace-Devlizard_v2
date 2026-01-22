// CEO guard
// ceo.guard.js
(() => {
  const auth = localStorage.getItem("auth");
  const role = localStorage.getItem("role");

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
