import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework'

export default async function passwordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<{
  entity_id: string
  actor_type: string
  token: string
}>) {
  const logger = container.resolve('logger')

  const { entity_id: email, token } = data

  if (!email || !token) {
    logger.warn('[passwordResetHandler] Payload incompleto: email ou token ausente')
    return
  }

  const resendApiKey = process.env.RESEND_API_KEY
  const emailFrom = process.env.EMAIL_FROM || 'Haules <noreply@haulesbar.com.br>'
  const frontendUrl = process.env.FRONTEND_URL || 'https://haules.com.br'

  if (!resendApiKey) {
    logger.warn('[passwordResetHandler] RESEND_API_KEY não configurada')
    return
  }

  const resetLink = `${frontendUrl}/nova-senha?token=${encodeURIComponent(token)}`

  logger.info(`[passwordResetHandler] Enviando e-mail de reset para: ${email}`)

  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #1a1a1a;">Redefinição de senha</h2>
      <p style="color: #444; line-height: 1.6;">
        Recebemos uma solicitação para redefinir a senha da sua conta no Haules Bar.
        Clique no botão abaixo para criar uma nova senha:
      </p>
      <a href="${resetLink}"
        style="display: inline-block; margin: 24px 0; padding: 14px 28px;
               background-color: #1a1a1a; color: #fff; text-decoration: none;
               border-radius: 6px; font-weight: bold;">
        Redefinir minha senha
      </a>
      <p style="color: #888; font-size: 13px; line-height: 1.5;">
        Este link é válido por 15 minutos e pode ser usado apenas uma vez.<br>
        Se você não solicitou a redefinição, pode ignorar este e-mail.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #bbb; font-size: 12px;">Haules Bar</p>
    </div>
  `

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [email],
        subject: 'Redefinição de senha — Haules Bar',
        html: emailHtml,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      logger.error(`[passwordResetHandler] Resend API error: ${errorBody}`)
      return
    }

    const result = await response.json()
    logger.info(`[passwordResetHandler] E-mail enviado com sucesso. ID: ${result.id}`)
  } catch (error) {
    logger.error('[passwordResetHandler] Erro ao enviar e-mail:', error)
  }
}

export const config: SubscriberConfig = {
  event: 'auth.password_reset',
}
