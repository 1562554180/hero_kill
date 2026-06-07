import { create } from 'zustand'

interface GameState {
  userId: string | null
  save: any | null
  currentBattle: any | null
  isLoading: boolean

  setUserId: (id: string) => void
  setSave: (save: any) => void
  setCurrentBattle: (battle: any) => void
  setLoading: (loading: boolean) => void
}

export const useGameStore = create<GameState>((set) => ({
  userId: localStorage.getItem('hero-legend-userId'),
  save: null,
  currentBattle: null,
  isLoading: false,

  setUserId: (id) => {
    localStorage.setItem('hero-legend-userId', id)
    set({ userId: id })
  },
  setSave: (save) => set({ save }),
  setCurrentBattle: (battle) => set({ currentBattle: battle }),
  setLoading: (isLoading) => set({ isLoading }),
}))
