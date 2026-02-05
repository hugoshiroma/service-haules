import { AbstractNotificationProviderService, MedusaError } from '@medusajs/framework/utils'
import {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from '@medusajs/framework/types'

type InjectedDependencies = {
  logger: Logger
}

class EmailNotificationService extends AbstractNotificationProviderService {
  static identifier = 'email-notification'
  protected logger_: Logger
  protected supabaseUrl_: string
  protected supabaseAnonKey_: string

  constructor({ logger }: InjectedDependencies) {
    super()
    this.logger_ = logger
    this.supabaseUrl_ = process.env.SUPABASE_URL || ''
    this.supabaseAnonKey_ = process.env.SUPABASE_ANON_KEY || ''

    if (!this.supabaseUrl_ || !this.supabaseAnonKey_) {
      this.logger_.warn(
        '[EmailNotificationService] SUPABASE_URL ou SUPABASE_ANON_KEY não configurados',
      )
    }
  }

  async send(
    notification: ProviderSendNotificationDTO,
  ): Promise<ProviderSendNotificationResultsDTO> {
    if (!notification || !notification.to) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'Invalid notification data')
    }

    try {
      this.logger_.info(`[EmailNotificationService] Enviando email para: ${notification.to}`)

      // Extrai subject e message do data ou usa valores padrão
      const subject = (notification.data as any)?.subject || 'Notificação'
      const message = (notification.data as any)?.message || notification.data?.toString() || ''

      const response = await fetch(`${this.supabaseUrl_}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.supabaseAnonKey_}`,
        },
        body: JSON.stringify({
          to: notification.to,
          subject,
          message,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        this.logger_.error(`[EmailNotificationService] Erro ao enviar email: ${errorText}`)
        throw new MedusaError(MedusaError.Types.INVALID_DATA, `Failed to send email: ${errorText}`)
      }

      const result = await response.json()
      this.logger_.info(
        `[EmailNotificationService] Email enviado com sucesso para: ${notification.to}`,
      )

      return {
        id: notification.to,
      }
    } catch (error) {
      this.logger_.error(`[EmailNotificationService] Erro ao enviar email:`, error)
      throw error
    }
  }
}

export default EmailNotificationService
