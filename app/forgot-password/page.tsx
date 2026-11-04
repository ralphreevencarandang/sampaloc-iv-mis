import { ForgotPasswordForm, ResetFrame } from '@/components/auth/password-reset-forms';
import { resetScopeSchema } from '@/validations/password-reset.validation';

export const metadata = { title: 'Forgot password | Sampaloc IV MIS', robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ portal?: string }> }) {
  const parsed = resetScopeSchema.safeParse((await searchParams).portal ?? 'resident');
  const scope = parsed.success ? parsed.data : 'resident';
  return <ResetFrame title="Forgot password" scope={scope}><ForgotPasswordForm scope={scope} /></ResetFrame>;
}
