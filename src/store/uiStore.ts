import { create } from 'zustand';
import { uid } from '@/utils/id';
import { readJSON, writeJSON } from '@/utils/storage';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  /** Milliseconds before auto-dismiss; errors stay longer. */
  duration: number;
}

export type Theme = 'light' | 'dark';

interface UiState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id' | 'duration'> & { duration?: number }) => string;
  dismiss: (id: string) => void;

  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;

  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const THEME_KEY = 'theme';

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export const useUiStore = create<UiState>()((set, get) => ({
  toasts: [],

  push: ({ tone, title, description, duration }) => {
    const id = uid('toast');
    // Errors linger — people need time to read what went wrong.
    const ms = duration ?? (tone === 'error' ? 7000 : 4000);
    set({ toasts: [...get().toasts, { id, tone, title, description, duration: ms }] });
    window.setTimeout(() => get().dismiss(id), ms);
    return id;
  },

  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  sidebarCollapsed: readJSON<boolean>('sidebar-collapsed', false),
  toggleSidebarCollapsed: () => {
    const next = !get().sidebarCollapsed;
    writeJSON('sidebar-collapsed', next);
    set({ sidebarCollapsed: next });
  },

  theme: readJSON<Theme>(THEME_KEY, 'light'),
  setTheme: (theme) => {
    writeJSON(THEME_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === 'light' ? 'dark' : 'light'),
}));

/** Called once at start-up so the saved theme is on the page before first paint. */
export function initTheme(): void {
  applyTheme(useUiStore.getState().theme);
}

/**
 * Toast helpers for use outside components (services, event handlers).
 * Inside components, prefer the `useToast` hook.
 */
export const toast = {
  success: (title: string, description?: string) =>
    useUiStore.getState().push({ tone: 'success', title, description }),
  error: (title: string, description?: string) =>
    useUiStore.getState().push({ tone: 'error', title, description }),
  warning: (title: string, description?: string) =>
    useUiStore.getState().push({ tone: 'warning', title, description }),
  info: (title: string, description?: string) =>
    useUiStore.getState().push({ tone: 'info', title, description }),
};
