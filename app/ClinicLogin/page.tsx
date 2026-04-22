import { redirect } from 'next/navigation'
import { getCurrentHealthWorkerFromSession } from '@/lib/health-worker-session'
import { ClinicLoginForm } from './ClinicLoginForm'

export default async function ClinicLoginPage() {
  const healthWorker = await getCurrentHealthWorkerFromSession()

  if (healthWorker) {
    redirect('/clinic')
  }

  return <ClinicLoginForm />
}
