import { request, setToken } from './apiClient';

export interface BackendUser {
  id: string;
  name: string;
  role: 'FARMER' | 'CENTER_OFFICER' | 'ADMIN';
  language: string;
  mobile: string;
  email: string | null;
  profileId?: string;
  centerId?: string;
}

export interface LoginResult {
  token: string;
  user: BackendUser;
}

export const authApi = {
  async login(identifier: string, password: string): Promise<LoginResult> {
    const result = await request<LoginResult>('/auth/login', {
      method: 'POST',
      auth: false,
      body: { identifier, password },
    });
    setToken(result.token);
    return result;
  },

  async register(input: {
    name: string;
    mobile: string;
    email?: string;
    password: string;
    language?: string;
    village: string;
    location: string;
    primaryCropId?: string;
    approxQuantity?: number;
  }): Promise<LoginResult> {
    const result = await request<LoginResult>('/auth/register', {
      method: 'POST',
      auth: false,
      body: input,
    });
    setToken(result.token);
    return result;
  },

  me() {
    return request('/auth/me');
  },

  logout() {
    setToken(null);
  },
};
