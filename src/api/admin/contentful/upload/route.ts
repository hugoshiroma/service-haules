import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import ContentfulService from "../../../../modules/contentful/service"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { data, filename, mimeType } = req.body as {
    data?: string
    filename?: string
    mimeType?: string
  }

  if (!data || !filename || !mimeType) {
    return res.status(400).json({ error: "Dados incompletos: data, filename e mimeType são obrigatórios." })
  }

  const buffer = Buffer.from(data, "base64")

  try {
    const contentfulService: ContentfulService = req.scope.resolve("contentful")
    const result = await contentfulService.uploadAsset(buffer, filename, mimeType)
    res.json(result)
  } catch (error) {
    console.error("[POST /admin/contentful/upload] Error:", error.message)
    res.status(500).json({ error: error.message || "Erro ao fazer upload da imagem." })
  }
}
