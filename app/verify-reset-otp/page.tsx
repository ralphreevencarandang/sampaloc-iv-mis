import { VerifyResetOtpForm, ResetFrame } from '@/components/auth/password-reset-forms';
import { resetScopeSchema } from '@/validations/password-reset.validation';

export const metadata = { title: 'Verify your code | Sampaloc IV MIS', robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ portal?: string }> }) {
  const parsed = resetScopeSchema.safeParse((await searchParams).portal ?? 'resident');
  const scope = parsed.success ? parsed.data : 'resident';
  return <ResetFrame title="Verify your code" scope={scope}><VerifyResetOtpForm scope={scope} /></ResetFrame>;
}
