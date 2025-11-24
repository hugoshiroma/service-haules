import { 
  createPromotionsWorkflow,
  deletePromotionsWorkflow
} from '@medusajs/medusa/core-flows'
import { generateCouponsWorkflow } from "./generate-coupons-workflow"
import { removeCouponsWorkflow } from "./remove-coupons-workflow"

// Hook para quando promoções são CRIADAS
createPromotionsWorkflow.hooks.promotionsCreated(
  async ({ promotions }, { container }) => {
    for (const promotion of promotions) {
      await generateCouponsWorkflow.run({ 
        input: { promotionId: promotion.id },
        container 
      })
    }
  },
)

// Hook para quando promoções são DELETADAS
deletePromotionsWorkflow.hooks.promotionsDeleted(
  async ({ ids }, { container }) => {
    for (const promotionId of ids) {
      console.log(`[PromotionHooks] Promoção ${promotionId} foi deletada. Disparando workflow de remoção.`)
      await removeCouponsWorkflow.run({
        input: { promotionId: promotionId },
        container
      })
    }
  }
)
