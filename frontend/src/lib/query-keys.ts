export const queryKeys = {
  users: {
    detail: (id: number) => ['users', id] as const,
    activityLog: ['users', 'activity-log'] as const,
  },
  competitions: {
    all: ['competitions'] as const,
    list: (params?: object) => ['competitions', 'list', params] as const,
    detail: (id: number) => ['competitions', id] as const,
    standings: (id: number) => ['competitions', id, 'standings'] as const,
  },
} as const
