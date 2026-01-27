(() => {
  const API_BASE = (window.App?.getApiBase ? window.App.getApiBase() : (window.API_BASE || ((window.location.port === '5500' || window.location.port === '5501') ? 'http://localhost:3000/api' : '/api')));
  const K = window.STORAGE_KEYS || {};

  const form = document.getElementById('profileForm');
  const avatarForm = document.getElementById('avatarForm');
  const nameInput = document.getElementById('profileName');
  const emailInput = document.getElementById('profileEmail');
  const passwordInput = document.getElementById('profilePassword');
  const passwordConfirmInput = document.getElementById('profilePasswordConfirm');
  const avatarInput = document.getElementById('avatarInput');
  const avatarPreview = document.getElementById('avatarPreview');
  const alertBox = document.getElementById('profileAlert');
  const backBtn = document.getElementById('backBtn');

  const showAlert = (type, message) => {
    if (!alertBox) return;
    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;
    alertBox.classList.remove('hidden');
  };

  const clearAlert = () => {
    if (!alertBox) return;
    alertBox.classList.add('hidden');
  };

  const setAvatarPreview = (avatarUrl, displayName) => {
    if (!avatarPreview) return;
    if (avatarUrl) {
      avatarPreview.style.backgroundImage = `url('${avatarUrl}')`;
      avatarPreview.classList.add('has-image');
      avatarPreview.textContent = '';
    } else {
      avatarPreview.style.backgroundImage = '';
      avatarPreview.classList.remove('has-image');
      avatarPreview.textContent = (displayName || 'U').charAt(0).toUpperCase();
    }
  };

  const goBackToRoleHome = () => {
    const role = (localStorage.getItem(K.ROLE || 'role') || '').toLowerCase().trim();
    const allowed = ['ceo', 'coo', 'cto', 'cfo', 'cmo', 'comercial'];

    if (allowed.includes(role)) {
      window.location.href = `../../${role}/index.html`;
      return;
    }

    window.location.href = '../../index.html';
  };

  const loadProfile = async () => {
    try {
      const data = await window.App.apiFetch(`${API_BASE}/users/me`);
      if (nameInput) nameInput.value = data.name || '';
      if (emailInput) emailInput.value = data.email || '';

      const displayName = data.name || data.email || 'Usuário';
      setAvatarPreview(data.avatar, displayName);

      if (data.avatar) {
        localStorage.setItem(K.AVATAR || 'profile_avatar', data.avatar);
      }
      if (data.name) {
        localStorage.setItem(K.PROFILE_NAME || 'profile_name', data.name);
        localStorage.setItem(K.USER || 'user', data.name);
      }
    } catch (error) {
      const message = String(error?.message || '');
      if (message.includes('404')) {
        const cachedName = localStorage.getItem(K.PROFILE_NAME || 'profile_name') || '';
        const cachedUser = localStorage.getItem(K.USER || 'user') || '';
        const cachedAvatar = localStorage.getItem(K.AVATAR || 'profile_avatar') || '';
        const displayName = cachedName || cachedUser || 'Usuário';

        if (nameInput) nameInput.value = cachedName || (cachedUser.includes('@') ? '' : cachedUser);
        if (emailInput) emailInput.value = cachedUser.includes('@') ? cachedUser : '';
        setAvatarPreview(cachedAvatar, displayName);
        return;
      }

      showAlert('error', error.message || 'Erro ao carregar perfil.');
    }
  };

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearAlert();

      const name = nameInput?.value.trim() || '';
      const email = emailInput?.value.trim() || '';
      const password = passwordInput?.value.trim() || '';
      const passwordConfirm = passwordConfirmInput?.value.trim() || '';

      if (password && password !== passwordConfirm) {
        showAlert('error', 'As senhas não conferem.');
        return;
      }

      const payload = {};
      if (name) payload.name = name;
      if (email) payload.email = email;
      if (password) payload.password = password;

      if (!Object.keys(payload).length) {
        showAlert('warning', 'Nenhuma alteração para salvar.');
        return;
      }

      try {
        const updated = await window.App.apiFetch(`${API_BASE}/users/me`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const displayName = updated.name || updated.email || name || email;
        localStorage.setItem(K.USER || 'user', displayName || '');
        localStorage.setItem(K.PROFILE_NAME || 'profile_name', updated.name || '');
        if (updated.avatar) {
          localStorage.setItem(K.AVATAR || 'profile_avatar', updated.avatar);
        }

        window.App.updateUserUI?.();
        setAvatarPreview(updated.avatar, displayName);
        showAlert('success', 'Perfil atualizado com sucesso.');

        if (passwordInput) passwordInput.value = '';
        if (passwordConfirmInput) passwordConfirmInput.value = '';
      } catch (error) {
        showAlert('error', error.message || 'Erro ao atualizar perfil.');
      }
    });
  }

  if (avatarForm) {
    avatarForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearAlert();

      const file = avatarInput?.files?.[0];
      if (!file) {
        showAlert('warning', 'Selecione uma imagem para enviar.');
        return;
      }

      const formData = new FormData();
      formData.append('avatar', file);

      try {
        const result = await window.App.apiFetch(`${API_BASE}/users/me/avatar`, {
          method: 'POST',
          body: formData
        });

        const displayName =
          (nameInput?.value || '').trim() ||
          (emailInput?.value || '').trim() ||
          localStorage.getItem(K.USER || 'user') ||
          'Usuário';

        localStorage.setItem(K.AVATAR || 'profile_avatar', result.avatar);
        window.App.updateUserUI?.();
        setAvatarPreview(result.avatar, displayName);

        if (avatarInput) avatarInput.value = '';
        showAlert('success', 'Foto atualizada com sucesso.');
      } catch (error) {
        showAlert('error', error.message || 'Erro ao atualizar foto.');
      }
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', (event) => {
      event.preventDefault();
      goBackToRoleHome();
    });
  }

  document.addEventListener('DOMContentLoaded', loadProfile);
})();
