export const API_ENDPOINTS = {
  USERS: {
    LOGIN: '/users/login',
    REGISTER: '/users/register',
    REGISTER_CHESS: (id: string) => `/users/${id}/register-chess`,
    GET: (id: string) => `/users/${id}`,
    UPDATE: (id: string) => `/users/${id}`,
    ACTIVITY_LOG: '/users/activity/log',
  },

  COMPETITIONS: {
    CREATE: '/competitions',
    LIST: '/competitions',
    GET: (id: string) => `/competitions/${id}`,
    UPDATE: (id: string) => `/competitions/${id}`,
    DELETE: (id: string) => `/competitions/${id}`,
    START: (id: string) => `/competitions/${id}/start`,
    ADVANCE_ROUND: (id: string) => `/competitions/${id}/advance-round`,
    STANDINGS: (id: string) => `/competitions/${id}/standings`,
    FORMAT_ADVICE: '/competitions/format-advice',
    MATCHES: (id: string) => `/competitions/${id}/matches`,
  },

  PARTICIPANTS: {
    REGISTRATIONS: (userId: string) => `/competitions/registered/${userId}`,
    JOIN: (id: string) => `/competitions/${id}/join`,
    WITHDRAW: (id: string, userId: string) =>
      `/competitions/${id}/participants/${userId}/withdraw`,
    ELIMINATE: (id: string, userId: string) =>
      `/competitions/${id}/participants/${userId}/eliminate`,
  },

  MATCHES: {
    GET: (id: string) => `/matches/${id}`,
    SUBMIT_RESULT: (id: string) => `/matches/${id}/submit-result`,
    CONFIRM_RESULT: (id: string) => `/matches/${id}/confirm-result`,
    FORCE_RESULT: (id: string) => `/matches/${id}/force-result`,
    MARK_ABSENT: (id: string) => `/matches/${id}/mark-absent`,
    EXTEND_DEADLINE: (id: string) => `/matches/${id}/extend-deadline`,
    ADMIN_SCORE: (id: string) => `/matches/${id}/admin-score`,
  },
  DISPUTES: {
    LIST: '/disputes',
    GET: (id: string) => `/disputes/${id}`,
    CREATE: '/disputes',
    UPDATE_STATUS: (id: string) => `/disputes/${id}/status`,
    RESOLVE: (id: string) => `/disputes/${id}/resolve`,
    REJECT: (id: string) => `/disputes/${id}/reject`,
  },
} as const
