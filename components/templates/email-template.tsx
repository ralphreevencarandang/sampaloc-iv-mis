import * as React from 'react';

interface EmailTemplateProps {
  firstName: string;
  loginUrl?: string;
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  firstName,
  loginUrl = "http://localhost:3000/login", // Adjust based on your environment
}) => (
  <div style={{ fontFamily: 'sans-serif', padding: '20px', color: '#333' }}>
    <h1 style={{ color: '#059669' }}>Registration Approved!</h1>
    <p>Hi {firstName},</p>
    <p>Your resident registration has been reviewed and <strong>APPROVED</strong> by the barangay administration.</p>
    <p>You can now log in to the Sampaloc IV MIS portal using your registered email address to access services and view your records.</p>
    <div style={{ marginTop: '30px', marginBottom: '30px' }}>
      <a 
        href={loginUrl}
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
        Log In to Portal
      </a>
    </div>
    <p style={{ marginTop: '40px', fontSize: '12px', color: '#666' }}>
      If you did not request this registration, please contact the barangay hall immediately.
    </p>
  </div>
);
