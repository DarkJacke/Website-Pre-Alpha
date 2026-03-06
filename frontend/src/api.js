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
  register: (data) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/api/auth/me'),
  
  getUser: (id) => request(`/api/users/${id}`),
  updateProfile: (data) => request('/api/users/profile', { method: 'PUT', body: JSON.stringify(data) }),
  updateTheme: (data) => request('/api/users/theme', { method: 'PUT', body: JSON.stringify(data) }),
  
  uploadFile: (formData) => request('/api/files/upload', { method: 'POST', body: formData }),
  getMyFiles: () => request('/api/files'),
  getUserFiles: (userId) => request(`/api/files/public/${userId}`),
  deleteFile: (id) => request(`/api/files/${id}`, { method: 'DELETE' }),
  getPreviewUrl: (id) => `${API}/api/files/preview/${id}`,
  getDownloadUrl: (id) => `${API}/api/files/download/${id}`,
  
  search: (q, type = 'all') => request(`/api/search?q=${encodeURIComponent(q)}&type=${type}`),
  
  getChats: () => request('/api/chats'),
  createChat: (participantId) => request('/api/chats', { method: 'POST', body: JSON.stringify({ participant_id: participantId }) }),
  getMessages: (chatId) => request(`/api/chats/${chatId}/messages`),
  sendMessage: (chatId, content) => request(`/api/chats/${chatId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
  
  getWsUrl: (chatId) => {
    const token = localStorage.getItem('token');
    const wsBase = API.replace('https://', 'wss://').replace('http://', 'ws://');
    return `${wsBase}/api/ws/chat/${chatId}?token=${token}`;
  },
};
