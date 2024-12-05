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

  // Use the emerald theme for feedback emails
  const colors = colorSchemes[1];

  // Use 'stranger' if name is empty or null
  const greeting = name?.trim() ? name : 'stranger';

  const msg = {
    to: email,
    from: EMAIL_CONFIG.from,
    replyTo: EMAIL_CONFIG.replyTo,
    subject: 'Accessible Political Monitoring | Shape WhatGov',
    text: `Hi ${greeting}, I'm Jethro - thanks for trying out WhatGov. Your feedback is crucial to making political monitoring accessible to everyone.`,
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
                Hi ${greeting},
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
               <!-- Feed Scroll GIF -->
              <div style="margin: 24px 0;">
                <img src="${process.env.NEXT_PUBLIC_SITE_URL}/emails/feed_scroll.gif" 
                     alt="Demo of the feed scrolling interface" 
                     style="width: 100%; max-width: 500px; height: auto; border-radius: 8px; display: block; margin: 0 auto;">
              </div>

              <p style="color: #71717a; font-size: 16px; line-height: 1.6;">
                The app is smoother, debates are easier to search, and you've got a bunch of extra features to let you track your MP.
              </p>

              <!-- Features Image -->
              <div style="margin: 24px 0;">
                <img src="${process.env.NEXT_PUBLIC_SITE_URL}/emails/features.png" 
                     alt="Available features overview" 
                     style="width: 100%; max-width: 500px; height: auto; border-radius: 8px; display: block; margin: 0 auto;">
              </div>

              <!-- Subtext below features image -->
              <p style="color: #71717a; font-size: 14px; line-height: 1.6; text-align: center; margin-top: 8px;">
                Does your company or NGO need special features? Get in touch <a href="mailto:enterprise@whatgov.co.uk" style="color: ${colors.primary}; text-decoration: underline;">enterprise@whatgov.co.uk</a>
              </p>
            </div>

            <!-- Feedback Request -->
            <div style="margin: 32px 0;">
              <h2 style="color: ${colors.badge.text}; font-size: 18px; margin-bottom: 16px;">
                Your Feedback Matters
              </h2>
              <p style="color: #71717a; font-size: 16px; line-height: 1.6;">
                WhatGov is about making Political Monitoring available to everybody who needs it. To do that, I need to know what you need.
              </p>
              <ul style="color: #71717a; font-size: 16px; line-height: 1.6; margin-top: 16px;">
                <li style="margin-bottom: 12px;">What do you want in a weekly Hansard digest?</li>
                <li style="margin-bottom: 12px;">What do you track on Hansard? What do you wish was easier?</li>
                <li>What's unclear about the features? What would need to be there for you to want to come back?</li>
              </ul>

              If you want to get in touch, you can reply to this email or book a call with me using this big shiny button below.
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="https://calendly.com/jethro-reeve/whatgov-feedback-development" 
                 style="background-color: ${colors.primary}; 
                        color: #ffffff; 
                        padding: 16px 32px; 
                        text-decoration: none; 
                        border-radius: 6px;
                        font-weight: 500;
                        display: inline-block;">
                Book a call with me
              </a>
            </div>

            <!-- Thank You Note -->
            <div style="background-color: ${colors.background}; border: 1px solid ${colors.border}; padding: 24px; border-radius: 8px; text-align: center; margin: 32px 0;">
              <p style="color: #71717a; font-size: 14px; font-style: italic; margin: 0;">
                Special thanks to the <a href="https://www.campaignlab.uk/" style="color: ${colors.primary}; text-decoration: underline;">Campaign Lab</a>, <a href="https://democracyclub.org.uk/" style="color: ${colors.primary}; text-decoration: underline;">Democracy Club</a>, and <a href="https://newspeak.house/" style="color: ${colors.primary}; text-decoration: underline;">Newspeak House</a> communities for their support up to this stage.
              </p>
              <p style="color: #71717a; font-size: 14px; margin: 0;">
                All the best,
              </p>
              <p style="color: #71717a; font-size: 14px; margin: 0;">
                Jethro
              </p>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e4e4e7;">
              <p style="color: #71717a; font-size: 14px;">
                Questions? Want a chat? Just reply to this email - I'm here to help!
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