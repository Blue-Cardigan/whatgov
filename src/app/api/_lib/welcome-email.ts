import sgMail from '@sendgrid/mail';

// Initialize SendGrid with your API key
if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY is not set');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Add email configuration
const EMAIL_CONFIG = {
  from: {
    email: process.env.SENDGRID_WELCOME_EMAIL_SENDER!,
    name: 'WhatGov'  // Add a friendly sender name
  },
  replyTo: {
    email: 'hi@whatgov.co.uk',  // Add a reply-to address
    name: 'WhatGov Support'
  }
};

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


export async function sendWelcomeEmail(email: string, name: string) {
  if (!process.env.SENDGRID_WELCOME_EMAIL_SENDER) {
    throw new Error('SENDGRID_WELCOME_EMAIL_SENDER is not set');
  }

  const msg = {
    to: email,
    from: {
      email: process.env.SENDGRID_WELCOME_EMAIL_SENDER,
      name: 'WhatGov'
    },
    subject: 'Welcome to WhatGov!',
    text: `Welcome to WhatGov, ${name}! We're excited to have you join the conversation about UK politics.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h1 style="color: hsl(240, 5.9%, 10%); margin-bottom: 24px;">Welcome to WhatGov!</h1>
        
        <p style="color: hsl(240, 3.8%, 46.1%); font-size: 16px; line-height: 1.6;">
          Hi ${name},
        </p>
        
        <p style="color: hsl(240, 3.8%, 46.1%); font-size: 16px; line-height: 1.6;">
          Thank you for joining WhatGov! We're excited to have you as part of our community 
          dedicated to making UK politics more accessible and engaging.
        </p>

        <div style="margin: 32px 0;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/feed" 
             style="background-color: hsl(213, 76%, 56%); 
                    color: white; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 6px;
                    display: inline-block;">
            Start Exploring
          </a>
        </div>

        <p style="color: hsl(240, 3.8%, 46.1%); font-size: 14px; margin-top: 32px;">
          If you have any questions, just reply to this email - we're here to help!
        </p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('SendGrid error:', error);
    return { success: false, error };
  }
}