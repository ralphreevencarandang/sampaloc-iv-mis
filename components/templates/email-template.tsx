import * as React from 'react';

interface EmailTemplateProps {
  firstName: string;
  heading?: string;
  intro?: string;
  paragraphs?: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  footer?: string;
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  firstName,
  heading = 'Registration Approved!',
  intro = 'Your resident registration has been reviewed and APPROVED by the barangay administration.',
  paragraphs = [
    'You can now log in to the Sampaloc IV MIS portal using your registered email address to access services and view your records.',
  ],
  ctaLabel = 'Log In to Portal',
  ctaUrl = 'http://localhost:3000/login',
  footer = 'If you did not request this registration, please contact the barangay hall immediately.',
}) => (
  <div style={{ fontFamily: 'sans-serif', padding: '20px', color: '#333' }}>
    <h1 style={{ color: '#059669' }}>{heading}</h1>
    <p>Hi {firstName},</p>
    <p>{intro}</p>
    {paragraphs.map((paragraph) => (
      <p key={paragraph}>{paragraph}</p>
    ))}
    {ctaLabel && ctaUrl ? (
      <div style={{ marginTop: '30px', marginBottom: '30px' }}>
        <a 
          href={ctaUrl}
          style={{
            backgroundColor: '#059669',
            color: '#ffffff',
            padding: '12px 24px',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            display: 'inline-block'
          }}
        >
          {ctaLabel}
        </a>
      </div>
    ) : null}
    <p style={{ marginTop: '40px', fontSize: '12px', color: '#666' }}>
      {footer}
    </p>
  </div>
);
