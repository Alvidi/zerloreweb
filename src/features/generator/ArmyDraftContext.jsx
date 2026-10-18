import { createContext, useContext, useRef, useState } from 'react'

const ArmyDraftContext = createContext(null)

// El borrador vive con la app para poder consultar el Reglamento y volver
// al mismo ejército. Las imágenes no se serializan en almacenamiento limitado.
export function ArmyDraftProvider({ children }) {
  const [armySelections, setArmySelections] = useState([])
  const [selectedItems, setSelectedItems] = useState({})
  const [activeGeneratorSection, setActiveGeneratorSection] = useState('templates')
  const selectionCounterRef = useRef(0)
  return (
    <ArmyDraftContext.Provider value={{ armySelections, setArmySelections, selectedItems, setSelectedItems, activeGeneratorSection, setActiveGeneratorSection, selectionCounterRef }}>
      {children}
    </ArmyDraftContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useArmyDraft() {
  const draft = useContext(ArmyDraftContext)
  if (!draft) throw new Error('useArmyDraft necesita ArmyDraftProvider')
  return draft
}
