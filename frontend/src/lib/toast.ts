import { create } from "zustand";

export type ToastSeverity = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: number;
  message: string;
  severity: ToastSeverity;
}

interface ToastState {
  queue: ToastMessage[];
  push: (message: string, severity: ToastSeverity) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  queue: [],
  push: (message, severity) =>
    set((state) => ({ queue: [...state.queue, { id: nextId++, message, severity }] })),
  dismiss: (id) => set((state) => ({ queue: state.queue.filter((toast) => toast.id !== id) })),
}));

/** General messages (success, and errors that belong to no field) go to a toast. */
export const toast = {
  success: (message: string) => useToastStore.getState().push(message, "success"),
  error: (message: string) => useToastStore.getState().push(message, "error"),
  info: (message: string) => useToastStore.getState().push(message, "info"),
  warning: (message: string) => useToastStore.getState().push(message, "warning"),
};
