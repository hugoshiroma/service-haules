import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Heading, Text, Input, Switch, toast, Skeleton } from "@medusajs/ui"
import { useState, useEffect, useMemo } from "react"

type FeatureFlag = {
  id: string
  key: string
  title: string
  description: string
  enabled: boolean
  updated_at: string
}

const FeatureFlagsPage = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [toggling, setToggling] = useState<string | null>(null)

  const fetchFlags = async () => {
    setLoading(true)
    try {
      const response = await fetch("/admin/feature-flags")
      const data = await response.json()
      setFlags(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error("Erro ao carregar funcionalidades.")
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchFlags()
  }, [])

  const handleToggle = async (flag: FeatureFlag) => {
    setToggling(flag.key)
    try {
      const response = await fetch("/admin/feature-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: flag.key, enabled: !flag.enabled }),
      })
      if (!response.ok) throw new Error("Falha ao atualizar.")
      setFlags((prev) =>
        prev.map((f) => (f.key === flag.key ? { ...f, enabled: !f.enabled } : f))
      )
      toast.success(`"${flag.title}" ${!flag.enabled ? "ativado" : "desativado"} com sucesso.`)
    } catch {
      toast.error("Erro ao atualizar a funcionalidade.")
    }
    setToggling(null)
  }

  const filteredFlags = useMemo(() => {
    const q = search.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")
    return flags.filter((f) => {
      const title = f.title.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")
      const desc = f.description.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")
      return title.includes(q) || desc.includes(q)
    })
  }, [flags, search])

  if (loading) return (
    <div className="flex flex-col gap-4 p-4">
      <div className="bg-ui-bg-base border border-ui-border-base rounded-xl p-6">
        <div className="grid gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-ui-bg-base border border-ui-border-base rounded-xl px-4 py-4 flex items-center justify-between gap-4">
            <div className="grid gap-2 flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-6 w-10 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="bg-ui-bg-base border border-ui-border-base rounded-xl p-6">
        <Heading level="h1">Funcionalidades</Heading>
        <Text className="text-ui-fg-subtle">Ative ou desative recursos do site sem precisar de deploy.</Text>
      </div>

      <Input
        placeholder="Buscar por nome ou descrição..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filteredFlags.length === 0 && !loading && (
        <div className="bg-ui-bg-base border border-ui-border-base rounded-xl px-4 py-6 text-center">
          <Text className="text-ui-fg-subtle">
            {search ? "Nenhuma funcionalidade encontrada." : "Nenhuma funcionalidade cadastrada ainda."}
          </Text>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {filteredFlags.map((flag) => (
          <div
            key={flag.key}
            className="bg-ui-bg-base border border-ui-border-base rounded-xl px-4 py-4 flex items-center justify-between gap-4 hover:border-ui-border-strong transition-colors"
          >
            <div className="flex-1 min-w-0">
              <Heading level="h3" className="truncate">{flag.title}</Heading>
              <Text className="text-ui-fg-subtle text-sm mt-0.5">{flag.description}</Text>
            </div>
            <Switch
              checked={flag.enabled}
              disabled={toggling === flag.key}
              onCheckedChange={() => handleToggle(flag)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Funcionalidades",
})

export default FeatureFlagsPage
