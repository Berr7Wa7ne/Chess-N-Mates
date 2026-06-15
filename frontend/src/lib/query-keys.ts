export const queryKeys = {
  users: {
    detail: (id: string) => ['users', id] as const,
    activityLog: ['users', 'activity-log'] as const,
  },
  competitions: {
    all: ['competitions'] as const,
    list: (params?: object) => ['competitions', 'list', params] as const,
    detail: (id: string) => ['competitions', id] as const,
    standings: (id: string) => ['competitions', id, 'standings'] as const,
    matches: (id: string) => ['competitions', id, 'matches'] as const,
  },
  matches: {
    all: ['matches'] as const,
    detail: (id: string) => ['matches', id] as const,
  },
} as const
