// src/hooks/useCollection.ts
import { useState, useCallback } from 'react'
import type { ColorCard } from '../types'
import { loadCards, saveCards, isStorageNearLimit } from '../lib/storage'

export function useCollection() {
  const [cards, setCards] = useState<ColorCard[]>(() => loadCards())
  const [storageWarning, setStorageWarning] = useState(false)

  const persist = useCallback((updated: ColorCard[]) => {
    saveCards(updated)
    setCards(updated)
    setStorageWarning(isStorageNearLimit())
  }, [])

  const addCard = useCallback((card: ColorCard) => {
    persist([card, ...cards])
  }, [cards, persist])

  const deleteCard = useCallback((id: string) => {
    persist(cards.filter(c => c.id !== id))
  }, [cards, persist])

  const toggleFavorite = useCallback((id: string) => {
    persist(cards.map(c => c.id === id ? { ...c, favorited: !c.favorited } : c))
  }, [cards, persist])

  const renameCard = useCallback((id: string, name: string) => {
    persist(cards.map(c => c.id === id ? { ...c, name } : c))
  }, [cards, persist])

  const importCards = useCallback((incoming: ColorCard[]) => {
    const existingIds = new Set(cards.map(c => c.id))
    const newCards = incoming.filter(c => !existingIds.has(c.id))
    persist([...cards, ...newCards])
    return newCards.length
  }, [cards, persist])

  return {
    cards,
    storageWarning,
    addCard,
    deleteCard,
    toggleFavorite,
    renameCard,
    importCards,
  }
}
