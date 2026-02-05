import { createPromotionsWorkflow, updatePromotionsWorkflow } from '@medusajs/core-flows'
import { deletePromotionsWorkflow } from '@medusajs/medusa/core-flows'
import { generateCouponsWorkflow } from './generate-coupons-workflow'
import { removeCouponsWorkflow } from './remove-coupons-workflow'

// Hook para quando promoções são CRIADAS
createPromotionsWorkflow.hooks.promotionsCreated(async ({ promotions }, { container }) => {
  for (const promotion of promotions) {
    await generateCouponsWorkflow.run({
      input: { promotionId: promotion.id },
      container,
    })
  }
})

// Hook para quando promoções são ATUALIZADAS
updatePromotionsWorkflow.hooks.promotionsUpdated(async ({ promotions }, { container }) => {
  const activePromotions = promotions.filter((p) => p.status === 'active')

  if (activePromotions.length === 0) {
    return
  }

  console.log(
    `[PromotionHooks] ${activePromotions.length} promoção(ões) tornaram-se ativas. Verificando necessidade de geração de cupons...`,
  )

  for (const promotion of activePromotions) {
    await generateCouponsWorkflow.run({
      input: { promotionId: promotion.id },
      container,
    })
  }
})

// Hook para quando promoções são DELETADAS
deletePromotionsWorkflow.hooks.promotionsDeleted(async ({ ids }, { container }) => {
  for (const promotionId of ids) {
    console.log(
      `[PromotionHooks] Promoção ${promotionId} foi deletada. Disparando workflow de remoção.`,
    )
    await removeCouponsWorkflow.run({
      input: { promotionId: promotionId },
      container,
    })
  }
})
