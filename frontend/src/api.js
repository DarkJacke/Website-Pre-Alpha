const API = process.env.REACT_APP_BACKEND_URL;

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error' }));
    throw new Error(err.detail || 'Request failed');
  }
  if (res.headers.get('content-type')?.includes('application/json')) {
    return res.json();
  }
  return res;
}

export const api = {
  // Auth
  register: (data) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/api/auth/me'),
  changePassword: (data) => request('/api/auth/change-password', { method: 'PUT', body: JSON.stringify(data) }),
  forgotPassword: (email) => request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token, newPassword) => request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, new_password: newPassword }) }),
  googleAuth: (sessionId) => request('/api/auth/google', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) }),
  githubAuthUrl: (redirectUri) => request(`/api/auth/github/url?redirect_uri=${encodeURIComponent(redirectUri)}`),
  githubAuth: (code) => request('/api/auth/github', { method: 'POST', body: JSON.stringify({ code }) }),

  // Users
  getUser: (id) => request(`/api/users/${id}`),
  updateProfile: (data) => request('/api/users/profile', { method: 'PUT', body: JSON.stringify(data) }),
  updateTheme: (data) => request('/api/users/theme', { method: 'PUT', body: JSON.stringify(data) }),
  uploadAvatar: (formData) => request('/api/users/avatar', { method: 'POST', body: formData }),

  // Files
  uploadFile: (formData) => request('/api/files/upload', { method: 'POST', body: formData }),
  getMyFiles: () => request('/api/files'),
  getUserFiles: (userId) => request(`/api/files/public/${userId}`),
  deleteFile: (id) => request(`/api/files/${id}`, { method: 'DELETE' }),
  getPreviewUrl: (id) => `${API}/api/files/preview/${id}`,
  getDownloadUrl: (id) => `${API}/api/files/download/${id}`,
  moveFile: (fileId, folderId) => request(`/api/files/${fileId}/move`, { method: 'PUT', body: JSON.stringify({ folder_id: folderId }) }),
  bulkDelete: (fileIds) => request('/api/files/bulk-delete', { method: 'POST', body: JSON.stringify({ file_ids: fileIds }) }),

  // Folders
  getFolders: () => request('/api/folders'),
  createFolder: (name) => request('/api/folders', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteFolder: (id) => request(`/api/folders/${id}`, { method: 'DELETE' }),

  // Comments
  getComments: (fileId) => request(`/api/files/${fileId}/comments`),
  addComment: (fileId, content) => request(`/api/files/${fileId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  deleteComment: (id) => request(`/api/comments/${id}`, { method: 'DELETE' }),

  // Share links
  createShareLink: (fileId, hours) => request('/api/share', { method: 'POST', body: JSON.stringify({ file_id: fileId, expires_hours: hours }) }),
  getShareInfo: (linkId) => request(`/api/share/${linkId}`),
  getSharePreviewUrl: (linkId) => `${API}/api/share/${linkId}/preview`,
  getShareDownloadUrl: (linkId) => `${API}/api/share/${linkId}/download`,
  getMyShares: () => request('/api/my-shares'),
  deleteShare: (linkId) => request(`/api/share/${linkId}`, { method: 'DELETE' }),

  // Vault
  vaultStatus: () => request('/api/vault/status'),
  vaultSetup: (password) => request('/api/vault/setup', { method: 'POST', body: JSON.stringify({ vault_password: password }) }),
  vaultUnlock: (password) => request('/api/vault/unlock', { method: 'POST', body: JSON.stringify({ vault_password: password }) }),
  vaultUpload: (formData) => request('/api/vault/upload', { method: 'POST', body: formData }),
  vaultFiles: (vaultToken) => request(`/api/vault/files?vault_token=${vaultToken}`),
  vaultDeleteFile: (fileId, vaultToken) => request(`/api/vault/files/${fileId}?vault_token=${vaultToken}`, { method: 'DELETE' }),

  // Storage
  getStorage: () => request('/api/storage'),

  // Notifications
  getNotificationSettings: () => request('/api/notifications/settings'),
  updateNotificationSettings: (data) => request('/api/notifications/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Chat
  getChats: () => request('/api/chats'),
  createChat: (participantId) => request('/api/chats', { method: 'POST', body: JSON.stringify({ participant_id: participantId }) }),
  getMessages: (chatId) => request(`/api/chats/${chatId}/messages`),
  sendMessage: (chatId, content) => request(`/api/chats/${chatId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
  markAsRead: (chatId) => request(`/api/chats/${chatId}/read`, { method: 'POST' }),

  // Search
  search: (q, type = 'all') => request(`/api/search?q=${encodeURIComponent(q)}&type=${type}`),

  getWsUrl: (chatId) => {
    const token = localStorage.getItem('token');
    const wsBase = API.replace('https://', 'wss://').replace('http://', 'ws://');
    return `${wsBase}/api/ws/chat/${chatId}?token=${token}`;
  },
  getBaseUrl: () => API,
  getGoogleAuthUrl: () => `https://demobackend.emergentagent.com/auth/v1/env/oauth`,
};
