import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  isAuthenticated: !!localStorage.getItem('authToken'),
  user: null,

  login: (token, user) => {
    localStorage.setItem('authToken', token);
    set({ isAuthenticated: true, user });
  },

  logout: () => {
    localStorage.removeItem('authToken');
    set({ isAuthenticated: false, user: null });
  },

  setUser: (user) => {
    set({ user });
  },
}));

export const useMemberStore = create((set) => ({
  members: [],
  currentMember: null,
  isLoading: false,

  setMembers: (members) => set({ members }),
  setCurrentMember: (member) => set({ currentMember: member }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  addMember: (member) =>
    set((state) => ({
      members: [member, ...state.members],
    })),

  updateMember: (id, updatedMember) =>
    set((state) => ({
      members: state.members.map((m) => (m.id === id ? updatedMember : m)),
    })),

  removeMember: (id) =>
    set((state) => ({
      members: state.members.filter((m) => m.id !== id),
    })),
}));

export const useServiceStore = create((set) => ({
  services: [],
  currentService: null,
  isLoading: false,

  setServices: (services) => set({ services }),
  setCurrentService: (service) => set({ currentService: service }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  addService: (service) =>
    set((state) => ({
      services: [service, ...state.services],
    })),

  updateService: (id, updatedService) =>
    set((state) => ({
      services: state.services.map((s) => (s.id === id ? updatedService : s)),
    })),

  removeService: (id) =>
    set((state) => ({
      services: state.services.filter((s) => s.id !== id),
    })),
}));

export const useAttendanceStore = create((set) => ({
  attendances: [],
  currentAttendance: null,
  isLoading: false,

  setAttendances: (attendances) => set({ attendances }),
  setCurrentAttendance: (attendance) => set({ currentAttendance: attendance }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  addAttendance: (attendance) =>
    set((state) => ({
      attendances: [attendance, ...state.attendances],
    })),

  updateAttendance: (id, updatedAttendance) =>
    set((state) => ({
      attendances: state.attendances.map((a) =>
        a.id === id ? updatedAttendance : a
      ),
    })),

  removeAttendance: (id) =>
    set((state) => ({
      attendances: state.attendances.filter((a) => a.id !== id),
    })),
}));

export const useNotificationStore = create((set) => ({
  notifications: [],

  showNotification: (message, type = 'info') => {
    const id = Date.now();
    set((state) => ({
      notifications: [...state.notifications, { id, message, type }],
    }));
    // Auto-remove after 3 seconds
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 3000);
  },

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));

// Default export for convenience
export default {
  showNotification: (message, type = 'info') => {
    useNotificationStore.getState().showNotification(message, type);
  },
};
