import sgMail from '@sendgrid/mail';

// Initialize SendGrid with your API key
if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY is not set');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Define the three color schemes from DebateCard
const colorSchemes = [
  {
    // Blue theme
    border: 'hsl(213, 93%, 85%)',
    background: 'hsl(213, 100%, 96%)',
    badge: {
      text: 'hsl(213, 76%, 56%)',
      border: 'hsl(213, 70%, 80%)',
      background: 'hsl(213, 100%, 98%)'
    }
  },
  {
    // Emerald theme
    border: 'hsl(160, 93%, 85%)',
    background: 'hsl(160, 100%, 96%)',
    badge: {
      text: 'hsl(160, 76%, 56%)',
      border: 'hsl(160, 70%, 80%)',
      background: 'hsl(160, 100%, 98%)'
    }
  },
  {
    // Amber theme
    border: 'hsl(45, 93%, 85%)',
    background: 'hsl(45, 100%, 96%)',
    badge: {
      text: 'hsl(45, 76%, 56%)',
      border: 'hsl(45, 70%, 80%)',
      background: 'hsl(45, 100%, 98%)'
    }
  }
];

export async function sendConfirmationEmail(email: string, confirmationLink: string) {
  if (!process.env.SENDGRID_VERIFICATION_LINK_SENDER) {
    throw new Error('SENDGRID_VERIFICATION_LINK_SENDER is not set');
  }

  // Randomly select a color scheme
  const colors = colorSchemes[Math.floor(Math.random() * colorSchemes.length)];

  const msg = {
    to: email,
    from: process.env.SENDGRID_VERIFICATION_LINK_SENDER,
    subject: 'Verify your WhatGov account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: hsl(0, 0%, 100%); color: hsl(240, 10%, 3.9%); padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: hsl(240, 5.9%, 10%); margin: 0 0 16px 0; font-size: 24px;">Welcome to WhatGov!</h1>
          <p style="color: hsl(240, 3.8%, 46.1%); margin: 0; font-size: 16px;">Click below to verify your email address</p>
        </div>

        <!-- Clickable Question Box -->
        <a href="${confirmationLink}" 
           style="display: block;
                  text-decoration: none;
                  margin: 24px 0;
                  padding: 24px;
                  border-radius: 8px;
                  border: 2px solid ${colors.border};
                  background-color: ${colors.background};
                  transition: all 0.2s ease;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 12px;
                         font-weight: 600;
                         color: ${colors.badge.text};
                         border: 1px solid ${colors.badge.border};
                         background-color: ${colors.badge.background};
                         padding: 4px 8px;
                         border-radius: 4px;">
              Click to Verify Email
            </span>
            <span style="font-size: 12px; color: hsl(240, 3.8%, 46.1%);">
              Get Started
            </span>
          </div>
          <p style="margin: 0;
                    font-size: 14px;
                    font-weight: 500;
                    color: hsl(240, 5.9%, 10%);">
            Are you ready to join the conversation about UK politics?
          </p>
        </a>
        
        <div style="text-align: center; border-top: 1px solid hsl(240, 5.9%, 90%); padding-top: 24px;">
          <p style="color: hsl(240, 3.8%, 46.1%); font-size: 14px; margin: 0;">
            If the link doesn't work, you can copy and paste this URL into your browser:
          </p>
          <p style="color: hsl(240, 5.9%, 10%); font-size: 14px; margin: 8px 0 0 0; word-break: break-all;">
            ${confirmationLink}
          </p>
        </div>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('SendGrid error:', error);
    if (error) {
      console.error(error);
    }
    return { success: false, error };
  }
}