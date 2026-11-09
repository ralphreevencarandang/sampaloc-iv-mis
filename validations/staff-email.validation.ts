import { z } from 'zod';

export const EMAIL_SUBJECT_MAX = 200;
export const EMAIL_MESSAGE_MAX = 5000;
const headerSafe = (value: string) => !/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(value);

export const staffEmailFormSchema = z.object({
  recipient: z.string().max(254, 'Email must be 254 characters or less.')
    .refine(headerSafe, 'Enter one valid recipient email address.')
    .transform(value => value.trim().toLowerCase())
    .pipe(z.email('Enter one valid recipient email address.')),
  subject: z.string().max(EMAIL_SUBJECT_MAX, 'Subject must be 200 characters or less.')
    .refine(headerSafe, 'Subject must be a single line without control characters.')
    .trim().min(1, 'Subject is required.'),
  message: z.string().max(EMAIL_MESSAGE_MAX, 'Message must be 5,000 characters or less.')
    .refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value), 'Message contains unsupported control characters.')
    .trim().min(1, 'Message is required.'),
});

export const staffEmailSendSchema = staffEmailFormSchema.extend({ submissionId: z.uuid('Invalid email submission. Please reload the page.') }).strict();
export type StaffEmailFormInput = z.input<typeof staffEmailFormSchema>;
export type StaffEmailContent = z.output<typeof staffEmailFormSchema>;
