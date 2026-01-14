interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  /** Freelancer name for the "from" display name */
  fromName?: string;
  /** Freelancer email for reply-to */
  replyTo?: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType: string;
  }[];
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email via Resend
 *
 * FROM: documents@verifolio.pro (or configured EMAIL_FROM)
 * Display name: "{freelancer_name} via Verifolio" (if fromName provided)
 * Reply-To: freelancer's email (if replyTo provided)
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  // Build the "from" address
  const baseEmail = process.env.EMAIL_FROM || 'documents@verifolio.pro';
  const fromAddress = options.fromName
    ? `${options.fromName} via Verifolio <${baseEmail}>`
    : `Verifolio <${baseEmail}>`;

  // Mode mock si pas de clé API
  if (!apiKey) {
    console.log('=== EMAIL MOCK ===');
    console.log('From:', fromAddress);
    console.log('Reply-To:', options.replyTo || '(none)');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('HTML length:', options.html.length);
    if (options.attachments) {
      console.log('Attachments:', options.attachments.map(a => a.filename).join(', '));
    }
    console.log('==================');

    return {
      success: true,
      messageId: `mock-${Date.now()}`,
    };
  }

  // Envoi réel via Resend
  try {
    // Préparer le body JSON pour Resend
    const emailBody: Record<string, unknown> = {
      from: fromAddress,
      to: options.to.split(',').map(e => e.trim()),
      subject: options.subject,
      html: options.html,
    };

    // Add reply-to if provided (replies go to freelancer)
    if (options.replyTo) {
      emailBody.reply_to = options.replyTo;
    }

    // Ajouter les pièces jointes si présentes (en base64)
    if (options.attachments && options.attachments.length > 0) {
      emailBody.attachments = options.attachments.map(att => ({
        filename: att.filename,
        content: att.content.toString('base64'),
      }));
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailBody),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Resend] Error response:', error);
      throw new Error(error.message || 'Erreur envoi email');
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

export function generateEmailHTML(type: 'quote' | 'invoice', numero: string, companyName: string): string {
  const isInvoice = type === 'invoice';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f3f4f6; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

      <p style="margin: 0 0 20px 0; font-size: 16px;">
        Bonjour,
      </p>

      <p style="margin: 0 0 20px 0; font-size: 15px; color: #4b5563;">
        Veuillez trouver ci-joint ${isInvoice ? 'votre facture' : 'notre devis'} <strong>${numero}</strong>.
      </p>

      <p style="margin: 0 0 20px 0; font-size: 15px; color: #4b5563;">
        ${isInvoice
          ? 'Merci de procéder au règlement dans les délais indiqués sur la facture.'
          : 'N\'hésitez pas à nous contacter pour toute question concernant ce devis.'
        }
      </p>

      <p style="margin: 32px 0 0 0; font-size: 13px; color: #6b7280; font-style: italic;">
        Vous pouvez répondre directement à cet email.
      </p>

      <!-- Signature -->
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 15px; color: #374151;">
          ${companyName}
        </p>
        <p style="margin: 8px 0 0 0; font-size: 13px; color: #9ca3af;">
          Envoyé via Verifolio<br>
          <a href="https://verifolio.pro" style="color: #9ca3af; text-decoration: none;">https://verifolio.pro</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
