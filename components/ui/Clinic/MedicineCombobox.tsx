'use client'

import { useState } from 'react'
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox'
import { medicineAvailability, type ClinicMedicine } from '@/lib/medicine-inventory'
import { medicineSelectionOptions } from '@/lib/medicine-selection'

export default function MedicineCombobox({ id, medicines, selectedIds, disabled, onSelect }: {
  id: string; medicines: ClinicMedicine[]; selectedIds: string[]; disabled: boolean; onSelect: (medicine: ClinicMedicine) => void
}) {
  const [search, setSearch] = useState('')
  const options = medicineSelectionOptions(medicines, selectedIds)
  return <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-medium">Search and add medicines</label>
    <Combobox items={options} value={null} inputValue={search} onInputValueChange={setSearch}
      itemToStringLabel={(item: ClinicMedicine) => item.name} isItemEqualToValue={(a, b) => a.id === b.id}
      onValueChange={item => { if (item && !disabled && !medicineAvailability(item).unavailableReason) { onSelect(item); setSearch('') } }} disabled={disabled}>
      <ComboboxInput id={id} placeholder="Search by medicine name" disabled={disabled} aria-describedby={`${id}-help`} />
      <ComboboxContent>
        <ComboboxEmpty className="p-4 text-sm text-content-muted">No matching unselected medicines.</ComboboxEmpty>
        <ComboboxList className="max-h-[min(20rem,var(--available-height))] overflow-y-auto overscroll-contain p-1">
          {(item: ClinicMedicine) => {
            const { unavailableReason } = medicineAvailability(item)
            return <ComboboxItem key={item.id} value={item} disabled={Boolean(unavailableReason)}
              className="flex cursor-default flex-col gap-1 rounded-lg px-3 py-3 text-sm outline-none select-none data-[highlighted]:bg-primary-50 data-[highlighted]:text-primary-700 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50">
              <span className="font-semibold">{item.name}</span>
              <span className="text-xs">{item.quantity} {item.unit} available{unavailableReason ? ` · ${unavailableReason}` : ''}</span>
            </ComboboxItem>
          }}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
    <p id={`${id}-help`} className="text-xs text-content-muted">Add different medicines, then set each quantity below. Expired medicines are excluded.</p>
  </div>
}
