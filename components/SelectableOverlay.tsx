'use client'

import { CheckSquare, Square } from 'lucide-react'
import { useMultiSelect } from './MultiSelectProvider'
import type { TmdbSearchResult } from '@/types'
import { ReactNode } from 'react'

export default function SelectableOverlay({ item, children }: { item: TmdbSearchResult, children: ReactNode }) {
  const { selectedItems, toggleSelection, isSelectMode } = useMultiSelect()
  const key = `${item.type}-${item.tmdb_id}`
  const isSelected = selectedItems.has(key)

  return (
    <div 
      className="relative group h-full w-full"
      onClickCapture={(e) => {
        if (isSelectMode) {
          e.preventDefault()
          e.stopPropagation()
          toggleSelection(item)
        }
      }}
    >
      {/* Checkbox overlay visible on hover or when selected */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          toggleSelection(item)
        }}
        className={`absolute top-2 left-2 z-20 p-1.5 backdrop-blur-md rounded-lg transition-all duration-200 ${
          isSelected 
            ? 'bg-violet-600 shadow-lg shadow-violet-500/20 opacity-100 scale-100' 
            : 'bg-black/40 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 hover:bg-black/60'
        }`}
      >
        {isSelected ? (
          <CheckSquare className="w-4 h-4 text-white" />
        ) : (
          <Square className="w-4 h-4 text-white/70" />
        )}
      </button>

      {/* Dim unselected items in select mode */}
      <div className={`h-full w-full transition-all duration-300 ${isSelectMode && !isSelected ? 'opacity-50 scale-[0.98]' : 'opacity-100 scale-100'}`}>
        {children}
      </div>
    </div>
  )
}
