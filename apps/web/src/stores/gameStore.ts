import { create } from 'zustand'

interface Account {
  userId: string
  username: string
}

interface GameState {
  account: Account | null
  save: any | null
  currentBattle: any | null
  isLoading: boolean

  setAccount: (a: Account | null) => void
  clearAccount: () => void
  setSave: (save: any) => void
  setCurrentBattle: (battle: any) => void
  setLoading: (loading: boolean) => void
}

export const useGameStore = create<GameState>((set) => ({
  account: null,
  save: null,
  currentBattle: null,
  isLoading: false,

  setAccount: (a) => set({ account: a }),
  clearAccount: () => set({ account: null }),
  setSave: (save) => set({ save }),
  setCurrentBattle: (battle) => set({ currentBattle: battle }),
  setLoading: (isLoading) => set({ isLoading }),
}))
