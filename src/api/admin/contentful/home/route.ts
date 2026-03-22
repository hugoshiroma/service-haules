import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import ContentfulService from "../../../../modules/contentful/service";

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  console.log("[GET /admin/contentful/home] Attempting to resolve 'contentful' from container...");
  
  try {
    // In Medusa v2, when registered as an object key, the service can be resolved by that key
    const contentfulService: ContentfulService = req.scope.resolve("contentful");
    const data = await contentfulService.getHomeContent();
    res.json(data);
  } catch (error) {
    console.error("[GET /admin/contentful/home] Error:", error.message);
    res.status(500).json({ error: error.message || "An unknown error occurred." });
  }
};

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const { entryId, fields } = req.body as { entryId: string, fields: any };
  console.log(`[POST /admin/contentful/home] Attempting update for entry: ${entryId}`);

  try {
    const contentfulService: ContentfulService = req.scope.resolve("contentful");
    const updated = await contentfulService.updateEntry(entryId, fields);
    res.json({ success: true, entry: updated });
  } catch (error) {
    console.error("[POST /admin/contentful/home] Error:", error.message);
    res.status(500).json({ error: error.message || "An unknown error occurred." });
  }
};
