export const API_ENDPOINTS = {
  USERS: {
    LOGIN: '/users/login',
    REGISTER: '/users/register',
    REGISTER_CHESS: (id: number) => `/users/${id}/register-chess`,
    GET: (id: number) => `/users/${id}`,
    UPDATE: (id: number) => `/users/${id}`,
    ACTIVITY_LOG: '/users/activity/log',
  },

  COMPETITIONS: {
    CREATE: '/competitions',
    LIST: '/competitions',
    GET: (id: number) => `/competitions/${id}`,
    UPDATE: (id: number) => `/competitions/${id}`,
    START: (id: number) => `/competitions/${id}/start`,
    ADVANCE_ROUND: (id: number) => `/competitions/${id}/advance-round`,
    STANDINGS: (id: number) => `/competitions/${id}/standings`,
  },

  PARTICIPANTS: {
    JOIN: (id: number) => `/competitions/${id}/join`,
    WITHDRAW: (id: number, userId: number) =>
      `/competitions/${id}/participants/${userId}/withdraw`,
    ELIMINATE: (id: number, userId: number) =>
      `/competitions/${id}/participants/${userId}/eliminate`,
  },
} as const
