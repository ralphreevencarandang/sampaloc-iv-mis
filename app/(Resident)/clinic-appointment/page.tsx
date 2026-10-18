import { redirect } from 'next/navigation'
import { appointmentResident } from '@/lib/appointment-authorization'
import ResidentAppointmentBooking from '@/components/ui/Clinic/ResidentAppointmentBooking'

export default async function ClinicAppointmentPage() {
  const resident = await appointmentResident()
  if (!resident) redirect('/Login')
  return <main className="max-container padding-x padding-y"><ResidentAppointmentBooking residentName={[resident.firstName, resident.middleName, resident.lastName].filter(Boolean).join(' ')} contactNumber={resident.contactNumber ?? null} /></main>
}
