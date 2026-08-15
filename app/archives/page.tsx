import { redirect } from 'next/navigation';

export default function ArchivesRedirectPage() {
  redirect('/admin/archived');
}
