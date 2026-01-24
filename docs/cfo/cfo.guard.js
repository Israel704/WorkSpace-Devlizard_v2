// CFO guard
(function() {
  const role = localStorage.getItem('role');
  if (role !== 'cfo') {
    window.location.href = '../index.html';
  }
})();
