(function () {
	const role = (localStorage.getItem("role") || "").toLowerCase();
	if (role !== "cmo") {
		window.location.href = "../index.html";
	}
})();
