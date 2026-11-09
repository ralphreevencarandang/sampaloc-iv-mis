'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import AppointmentDialog from '@/components/ui/Clinic/AppointmentDialog'

type ResidentId = { idType: string | null; idNumber: string | null; imageUrl: string | null }

export default function ResidentIdPreview({ residentId }: { residentId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const query = useQuery<ResidentId>({
    queryKey: ['resident-valid-id', residentId],
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/residents/' + encodeURIComponent(residentId) + '/valid-id', { cache: 'no-store', signal })
      if (!response.ok) throw new Error('Unable to load the resident ID.')
      return response.json()
    },
    gcTime: 0,
    staleTime: 0,
    retry: false,
  })
  return <section aria-labelledby="resident-id-heading" className="space-y-3 rounded-lg border border-outline bg-surface-muted p-4 text-content">
    <h3 id="resident-id-heading" className="text-lg font-semibold">Uploaded valid ID</h3>
    {query.isPending ? <p role="status" className="text-sm text-content-muted">Loading valid ID…</p>
      : query.isError ? <div role="alert" className="text-sm text-stock-empty-text">Unable to load the resident ID. <button type="button" onClick={() => { setImageFailed(false); void query.refetch() }} className="text-primary-700 underline">Try again</button></div>
      : query.data && <>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-content-muted">ID type</dt><dd>{query.data.idType || 'Not provided'}</dd></div>
          <div><dt className="text-content-muted">ID number</dt><dd className="break-all">{query.data.idNumber || 'Not provided'}</dd></div>
        </dl>
        {query.data.imageUrl && !imageFailed ? <>
          <button type="button" onClick={() => setExpanded(true)} aria-label="View larger valid ID" className="block w-full rounded-lg border border-outline bg-surface p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
            <Image unoptimized src={query.data.imageUrl} alt="Resident uploaded valid ID" width={800} height={500} onError={() => setImageFailed(true)} className="max-h-48 w-full object-contain" />
          </button>
          <p className="text-xs text-content-muted">Select the image to enlarge it. This ID cannot be changed here.</p>
          {expanded && <AppointmentDialog titleId="expanded-resident-id" onClose={() => setExpanded(false)}>
            <div className="space-y-4 p-6"><h3 id="expanded-resident-id" className="text-lg font-semibold">Valid ID preview</h3>
              <Image unoptimized src={query.data.imageUrl} alt="Enlarged resident valid ID" width={1200} height={900} className="h-auto w-full object-contain" />
              <button type="button" onClick={() => setExpanded(false)} className="rounded-lg border border-outline px-4 py-2 text-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500">Close preview</button>
            </div>
          </AppointmentDialog>}
        </> : <p role="status" className="text-sm text-content-muted">{imageFailed ? 'The uploaded ID image could not be loaded.' : 'No valid ID image uploaded.'}</p>}
      </>}
  </section>
}
