import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework'
import { createClient } from '@supabase/supabase-js'

export default async function inviteCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{
  id: string
}>) {
  const logger = container.resolve('logger')
  const query = container.resolve('query')
  const config = container.resolve('configModule')

  try {
    // Buscar dados do convite
    const {
      data: [invite],
    } = await query.graph({
      entity: 'invite',
      fields: ['email', 'token'],
      filters: {
        id: data.id,
      },
    })

    if (!invite) {
      logger.warn(`[inviteCreatedHandler] Convite ${data.id} não encontrado`)
      return
    }

    // Construir URL do convite
    const backend_url =
      config.admin.backendUrl !== '/'
        ? config.admin.backendUrl
        : process.env.MEDUSA_URL || 'http://localhost:9000'
    const adminPath = config.admin.path || '/app'
    const inviteUrl = `${backend_url}${adminPath}/invite?token=${invite.token}`

    logger.info(`[inviteCreatedHandler] Enviando convite para: ${invite.email}`)
    logger.info(`[inviteCreatedHandler] URL do convite: ${inviteUrl}`)

    // Enviar email via Supabase Edge Function (send-email)
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.warn(
        '[inviteCreatedHandler] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados',
      )
      return
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    const { data: emailData, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: invite.email,
        subject: 'Você foi convidado para o Haules Admin',
        message: `
Olá!

Você foi convidado para se juntar ao time do Haules.

Para aceitar o convite e configurar sua conta, acesse o link abaixo:

${inviteUrl}

Este link expira em alguns dias. Se você não estava esperando este convite, pode ignorar este email.

Atenciosamente,
Equipe Haules
        `.trim(),
      },
    })

    if (error) {
      logger.error('[inviteCreatedHandler] Erro ao enviar email:', error)
      return
    }

    logger.info(`[inviteCreatedHandler] Email enviado com sucesso para: ${invite.email}`)
  } catch (error) {
    logger.error('[inviteCreatedHandler] Erro ao processar convite:', error)
  }
}

export const config: SubscriberConfig = {
  event: ['invite.created', 'invite.resent'],
}
