import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseHeaders = {
  "Content-Type": "application/json",
  apikey: supabaseServiceKey,
  Authorization: `Bearer ${supabaseServiceKey}`,
};

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/feature_flags?select=id,key,title,description,enabled,updated_at&order=title.asc`,
      { headers: supabaseHeaders }
    );

    if (!response.ok) {
      const error = await response.text();
      return res.status(502).json({ error });
    }

    const data = await response.json();
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { key, title, description, enabled } = req.body as {
    key: string;
    title: string;
    description: string;
    enabled?: boolean;
  };

  if (!key || !title || !description) {
    return res.status(400).json({ error: "Campos 'key', 'title' e 'description' são obrigatórios." });
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/feature_flags`,
      {
        method: "POST",
        headers: {
          ...supabaseHeaders,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          key: key.trim().toLowerCase().replace(/\s+/g, "_"),
          title: title.trim(),
          description: description.trim(),
          enabled: enabled ?? false,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return res.status(502).json({ error });
    }

    const data = await response.json();
    res.status(201).json(data[0] ?? { success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const { key, enabled } = req.body as { key: string; enabled: boolean };

  if (!key || typeof enabled !== "boolean") {
    return res.status(400).json({ error: "Campos 'key' e 'enabled' são obrigatórios." });
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/feature_flags?key=eq.${encodeURIComponent(key)}`,
      {
        method: "PATCH",
        headers: {
          ...supabaseHeaders,
          Prefer: "return=representation",
        },
        body: JSON.stringify({ enabled, updated_at: new Date().toISOString() }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return res.status(502).json({ error });
    }

    const data = await response.json();
    res.json(data[0] ?? { success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};
