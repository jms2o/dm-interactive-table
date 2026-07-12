import { useEffect } from 'react'
import type { DmMapTool, DmSection } from '../types/dm-ui.types'

type KeyboardShortcutOptions = {
  enabled: boolean
  setSection: (section: DmSection) => void
  setMapTool: (tool: DmMapTool) => void
  toggleFog: () => void
  undo: () => void
  redo: () => void
  createSnapshot: () => void
  clearSelection: () => void
  showHelp: () => void
}

export function useKeyboardShortcuts({
  enabled,
  setSection,
  setMapTool,
  toggleFog,
  undo,
  redo,
  createSnapshot,
  clearSelection,
  showHelp,
}: KeyboardShortcutOptions) {
  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }

      const command = event.ctrlKey || event.metaKey
      if (command && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (command && event.key.toLowerCase() === 's') {
        event.preventDefault()
        createSnapshot()
        return
      }

      if (event.key === 'Escape') {
        clearSelection()
        return
      }
      if (event.key === '?') {
        showHelp()
        return
      }

      switch (event.key.toLowerCase()) {
        case 'v':
          setSection('map')
          setMapTool('select')
          break
        case 'h':
          setSection('map')
          setMapTool('pan')
          break
        case 'f':
          toggleFog()
          break
        case 'c':
          setSection('combat')
          break
        case 'n':
          setSection('notes')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    clearSelection,
    createSnapshot,
    enabled,
    redo,
    setMapTool,
    setSection,
    showHelp,
    toggleFog,
    undo,
  ])
}
