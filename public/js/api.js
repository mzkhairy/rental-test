const apiFetch = async (url, options = {}) => {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const finalOptions = { ...defaultOptions, ...options };
  
  try {
    const response = await fetch(url, finalOptions);
    
    if (response.status === 401 && !url.includes('/login')) {
      window.location.href = '/login.html';
      return null;
    }
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};

const checkAuth = async () => {
  try {
    const data = await apiFetch('/api/auth/me');
    if (data && data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      return data.user;
    }
  } catch (err) {
    window.location.href = '/login.html';
  }
  return null;
};

const logout = async () => {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('user');
    window.location.href = '/login.html';
  } catch (err) {
    console.error(err);
  }
};

const initTopbar = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    const usernameEl = document.getElementById('topbar-username');
    if (usernameEl) {
      usernameEl.textContent = user.fullName;
    }
    const avatarEl = document.getElementById('topbar-avatar');
    if (avatarEl) {
      avatarEl.textContent = user.fullName.charAt(0).toUpperCase();
    }
  }
  
  fetch('/api/health').then(r => r.json()).then(data => {
    const branchInfo = document.getElementById('topbar-branch');
    if (branchInfo) {
      branchInfo.textContent = `${data.branchName} (${data.branchCode})`;
    }
  }).catch(e => console.error(e));
};
