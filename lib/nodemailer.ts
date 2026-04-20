import nodemailer from 'nodemailer'
import * as dotenv from 'dotenv'
import { render } from '@react-email/render';
import { EmailTemplate } from '@/components/templates/email-template';
import * as React from 'react';

dotenv.config()
export const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: false,//process.env.SMTP_PORT === "465", // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

/**
 * Reusable email service function for sending approval notifications
 * Asynchronous execution allows for non-blocking email updates
 */
export async function sendResidentApprovalEmail(email: string, firstName: string) {
    try {
        const html = await render(React.createElement(EmailTemplate, { firstName }));

        const mailOptions = {
            from: process.env.SMTP_FROM || '"Sampaloc IV MIS" <no-reply@sampalocivmis.com>',
            to: email,
            subject: 'Resident Registration Approved',
            html: html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Approval email sent successfully via Nodemailer:", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Exception sending approval email via Nodemailer:", error);
        // We do not throw the error to gracefully handle failures without breaking the main flow
        return { success: false, error };
    }
}