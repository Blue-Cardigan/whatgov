import sgMail from '@sendgrid/mail';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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


export async function sendWelcomeEmail(email: string, name: string, newsletter: boolean = false) {
  if (!process.env.SENDGRID_WELCOME_EMAIL_SENDER) {
    throw new Error('SENDGRID_WELCOME_EMAIL_SENDER is not set');
  }

  // Randomly select a color scheme
  const colors = colorSchemes[Math.floor(Math.random() * colorSchemes.length)];

  // Generate unsubscribe token if newsletter is true
  let unsubscribeUrl = '';
  if (newsletter) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.rpc('create_unsubscribe_token', {
        user_email: email
      });
      
      if (error) throw error;
      if (data) {
        unsubscribeUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/unsubscribe?token=${data}`;
      }
    } catch (error) {
      console.error('Error generating unsubscribe token:', error);
      // Continue without unsubscribe link if there's an error
    }
  }

  const msg = {
    to: email,
    from: EMAIL_CONFIG.from,
    replyTo: EMAIL_CONFIG.replyTo,
    subject: 'Welcome to WhatGov',
    text: `Hey, ${name}. Democracy is built on understanding, and we're here to help you understand Parliament better, one debate at a time.`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; margin-top: 20px;">
            <h1 style="color: #18181b; margin-bottom: 24px; font-size: 28px; text-align: center;">
              Welcome to WhatGov, ${name}!
            </h1>
            
            <p style="color: #71717a; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              What happens in Parliament matters. Understanding it shouldn't be hard.
            </p>

            <!-- Next Steps Section -->
            <div style="background-color: ${colors.background}; border: 1px solid ${colors.border}; padding: 24px; border-radius: 8px; margin: 32px 0;">
              <h2 style="color: ${colors.badge.text}; font-size: 18px; margin: 0 0 16px 0; font-weight: 600;">
                Ready to get started?
              </h2>
              <ul style="color: #71717a; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li style="margin-bottom: 8px;">
                  Visit your <a href="${process.env.NEXT_PUBLIC_SITE_URL}/myparliament" style="color: ${colors.primary}; font-weight: 500;">MP's profile</a> to see their recent activity
                </li>
                <li style="margin-bottom: 8px;">
                  Explore how your MP voted on key issues in Parliament using the "Divisions" filter at the top of your feed
                </li>
                <li>
                  See how your votes stack up against the rest of your constituency in <a href="${process.env.NEXT_PUBLIC_SITE_URL}/myparliament" style="color: ${colors.primary}; font-weight: 500;">My Parliament</a>
                </li>
              </ul>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL}" 
                 style="background-color: #0066ff; 
                        color: #ffffff; 
                        padding: 16px 32px; 
                        text-decoration: none; 
                        border-radius: 6px;
                        font-weight: 500;
                        display: inline-block;
                        mso-padding-alt: 0;
                        text-underline-color: #0066ff;">
                <!--[if mso]>
                <i style="letter-spacing: 25px; mso-font-width: -100%; mso-text-raise: 30pt;">&nbsp;</i>
                <![endif]-->
                <span style="mso-text-raise: 15pt;">Go to Your Feed</span>
                <!--[if mso]>
                <i style="letter-spacing: 25px; mso-font-width: -100%;">&nbsp;</i>
                <![endif]-->
              </a>
            </div>

            <!-- Trust Badge -->
            <div style="background-color: ${colors.background}; border: 1px solid ${colors.border}; padding: 24px; border-radius: 8px; text-align: center; margin: 32px 0;">
              <p style="color: #71717a; font-size: 14px; font-style: italic; margin: 0;">
                "Democracy is built on understanding. WhatGov helps build that understanding, one debate at a time."
              </p>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e4e4e7;">
              <p style="color: #71717a; font-size: 14px; margin-bottom: 16px;">
                We use official Parliamentary data from Hansard and AI technology to make parliamentary proceedings accessible.
              </p>
              <p style="color: #71717a; font-size: 14px;">
                Questions? Just reply to this email - we're here to help!
              </p>
              <div style="color: #71717a; font-size: 12px; margin-top: 24px;">
                WhatGov - Making UK Politics More Accessible<br>
                ${newsletter && unsubscribeUrl ? `
                  You're subscribed to our newsletter to stay updated with the latest from Parliament.<br>
                  You can update your preferences or <a href="${unsubscribeUrl}" style="color: #71717a; text-decoration: underline;">unsubscribe</a> at any time.
                ` : ''}
              </div>
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