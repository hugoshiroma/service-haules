import { type SubscriberArgs, type SubscriberConfig } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'

// Subscriber que escuta quando um usuário (admin) é criado
// e cria automaticamente um customer com os mesmos dados
export default async function handleUserCreated({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve('logger')
  const customerModuleService = container.resolve(Modules.CUSTOMER)
  const userModuleService = container.resolve(Modules.USER)

  try {
    // Buscar os dados completos do usuário
    const user = await userModuleService.retrieveUser(data.id)

    if (!user) {
      logger.warn(`[user-created] Usuário ${data.id} não encontrado`)
      return
    }

    logger.info(`[user-created] Criando customer para usuário: ${user.email}`)

    // Verifica se já existe um customer com este email
    const existingCustomers = await customerModuleService.listCustomers({
      email: user.email,
    })

    if (existingCustomers && existingCustomers.length > 0) {
      logger.info(`[user-created] Customer já existe para: ${user.email}`)

      // Atualiza o metadata para linkar ao usuário
      await customerModuleService.updateCustomers(existingCustomers[0].id, {
        metadata: {
          ...existingCustomers[0].metadata,
          user_id: user.id,
          is_employee: true,
        },
      })

      logger.info(`[user-created] Metadata atualizado para customer: ${existingCustomers[0].id}`)
      return
    }

    // Cria o customer
    const customer = await customerModuleService.createCustomers({
      email: user.email,
      first_name: user.first_name || user.email.split('@')[0],
      last_name: user.last_name || '',
      metadata: {
        user_id: user.id,
        is_employee: true,
      },
    })

    logger.info(`[user-created] Customer ${customer.id} criado para usuário ${user.email}`)
  } catch (error) {
    logger.error('[user-created] Erro ao criar customer:', error)
  }
}

export const config: SubscriberConfig = {
  event: 'user.created',
}
