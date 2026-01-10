interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
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

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  // Mode mock si pas de clé API
  if (!apiKey) {
    console.log('=== EMAIL MOCK ===');
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
      from: process.env.EMAIL_FROM || 'Verifolio <onboarding@resend.dev>',
      to: options.to.split(',').map(e => e.trim()),
      subject: options.subject,
      html: options.html,
    };

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
  const documentType = isInvoice ? 'facture' : 'devis';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
    <h1 style="color: #1a1a1a; font-size: 20px; margin-bottom: 16px;">
      ${isInvoice ? 'Nouvelle facture' : 'Nouveau devis'}
    </h1>

    <p style="margin-bottom: 16px;">
      Bonjour,
    </p>

    <p style="margin-bottom: 16px;">
      Veuillez trouver ci-joint ${isInvoice ? 'votre facture' : 'notre devis'} <strong>${numero}</strong>
      de la part de <strong>${companyName}</strong>.
    </p>

    <p style="margin-bottom: 16px;">
      ${isInvoice
        ? 'Merci de procéder au règlement dans les délais indiqués sur la facture.'
        : 'N\'hésitez pas à nous contacter pour toute question concernant ce devis.'
      }
    </p>

    <p style="color: #666; font-size: 14px; margin-top: 24px;">
      Cordialement,<br>
      ${companyName}
    </p>
  </div>

  <p style="color: #999; font-size: 12px; margin-top: 24px; text-align: center;">
    Ce message a été envoyé automatiquement via Verifolio.
  </p>
</body>
</html>
  `.trim();
}
