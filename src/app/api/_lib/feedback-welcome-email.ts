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

// Define the three color schemes with web-safe colors and RGB values
const colorSchemes = [
  {
    // Blue theme
    border: '#bfd9ff',
    background: '#f0f7ff',
    badge: {
      text: '#1a6dff',
      border: '#bfd9ff',
      background: '#f5faff'
    },
    primary: '#0066ff'
  },
  {
    // Emerald theme
    border: '#b7f4d8',
    background: '#ecfdf5',
    badge: {
      text: '#059669',
      border: '#b7f4d8',
      background: '#f0fdf9'
    },
    primary: '#059669'
  },
  {
    // Amber theme
    border: '#fde68a',
    background: '#fefce8',
    badge: {
      text: '#d97706',
      border: '#fde68a',
      background: '#fffbeb'
    },
    primary: '#d97706'
  }
];


export async function sendFeedbackEmail(email: string, name: string) {
  if (!process.env.SENDGRID_WELCOME_EMAIL_SENDER) {
    throw new Error('SENDGRID_WELCOME_EMAIL_SENDER is not set');
  }

  // Use the blue theme for feedback emails
  const colors = colorSchemes[0];

  const msg = {
    to: email,
    from: EMAIL_CONFIG.from,
    replyTo: EMAIL_CONFIG.replyTo,
    subject: 'Your feedback matters - Help shape WhatGov',
    text: `Hi ${name}, I'm Jethro - thanks for trying out WhatGov. Your feedback is crucial to making political monitoring accessible to everyone.`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; margin-top: 20px;">
            <!-- Personal Intro -->
            <div style="margin-bottom: 32px;">
              <h1 style="color: #18181b; margin-bottom: 24px; font-size: 28px;">
                Hi ${name},
              </h1>
              <p style="color: #71717a; font-size: 16px; line-height: 1.6;">
                I'm Jethro - you put your email in my site whatgov.co.uk (Previously, whatsard.co.uk) because you were interested in more readable Hansard. Now it's time for me to say thank you... and welcome to accessible political monitoring!
              </p>
            </div>

            <!-- What's New Section -->
            <div style="background-color: ${colors.background}; border: 1px solid ${colors.border}; padding: 24px; border-radius: 8px; margin: 32px 0;">
              <h2 style="color: ${colors.badge.text}; font-size: 18px; margin: 0 0 16px 0;">
                What's New?
              </h2>
              <p style="color: #71717a; font-size: 16px; line-height: 1.6;">
                The site may look very different to those who visited a while ago. Instead of Whatsapp, the app now resembles Instagram, putting all of Hansard in a feed with a summary and key points.
              </p>
              <p style="color: #71717a; font-size: 16px; line-height: 1.6;">
                The app is smoother, debates are easier to search, and you've got a bunch of extra features to let you track your MP (Or whichever one you add in your profile 😉).
              </p>
            </div>

            <!-- Feedback Request -->
            <div style="margin: 32px 0;">
              <h2 style="color: ${colors.badge.text}; font-size: 18px; margin-bottom: 16px;">
                Your Feedback Matters
              </h2>
              <p style="color: #71717a; font-size: 16px; line-height: 1.6;">
                WhatGov is about making Political Monitoring available to everybody. But to do that, I need to know what that 'everybody' needs. This makes feedback from you - yes YOU - absolutely critical.
              </p>
              <ul style="color: #71717a; font-size: 16px; line-height: 1.6; margin-top: 16px;">
                <li style="margin-bottom: 12px;">Remember that time you had to find a really niche piece of information on Hansard, and it took ages? What do you wish was easier?</li>
                <li style="margin-bottom: 12px;">What should the public see that always gets missed in the news coverage?</li>
                <li>What's unclear about the features? What would need to be there for you to want to come back?</li>
              </ul>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL}/feedback" 
                 style="background-color: ${colors.primary}; 
                        color: #ffffff; 
                        padding: 16px 32px; 
                        text-decoration: none; 
                        border-radius: 6px;
                        font-weight: 500;
                        display: inline-block;">
                Share Your Feedback
              </a>
            </div>

            <!-- Thank You Note -->
            <div style="background-color: ${colors.background}; border: 1px solid ${colors.border}; padding: 24px; border-radius: 8px; text-align: center; margin: 32px 0;">
              <p style="color: #71717a; font-size: 14px; font-style: italic; margin: 0;">
                Special thanks to the Campaign Lab, Democracy Club, and Newspeak House communities for their support up to this stage.
              </p>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e4e4e7;">
              <p style="color: #71717a; font-size: 14px;">
                Questions? Just reply to this email - we're here to help!
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    trackingSettings: {
      clickTracking: { enable: true },
      openTracking: { enable: true }
    }
  };

  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('SendGrid error:', error);
    return { success: false, error };
  }
}