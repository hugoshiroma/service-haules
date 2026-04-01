import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Heading, Text, Input, Switch, toast, Skeleton, Button, Label, Textarea, FocusModal } from "@medusajs/ui"
import { useState, useEffect, useMemo } from "react"

type FeatureFlag = {
  id: string
  key: string
  title: string
  description: string
  enabled: boolean
  updated_at: string
}

const EMPTY_FORM = { key: "", title: "", description: "", enabled: false }

const FeatureFlagsPage = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [toggling, setToggling] = useState<string | null>(null)
  const [isModalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchFlags = async () => {
    setLoading(true)
    try {
      const response = await fetch("/admin/feature-flags")
      const data = await response.json()
      setFlags(Array.isArray(data) ? data : [])
    } catch {
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
      if (!response.ok) throw new Error()
      setFlags((prev) =>
        prev.map((f) => (f.key === flag.key ? { ...f, enabled: !f.enabled } : f))
      )
      toast.success(`"${flag.title}" ${!flag.enabled ? "ativado" : "desativado"}.`)
    } catch {
      toast.error("Erro ao atualizar.")
    }
    setToggling(null)
  }

  const handleCreate = async () => {
    if (!form.key.trim() || !form.title.trim() || !form.description.trim()) {
      toast.error("Preencha todos os campos.")
      return
    }
    setSaving(true)
    try {
      const response = await fetch("/admin/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error ?? "Erro ao criar.")
      }
      toast.success(`"${form.title}" criada com sucesso.`)
      setModalOpen(false)
      setForm(EMPTY_FORM)
      fetchFlags()
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar funcionalidade.")
    }
    setSaving(false)
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
      <div className="bg-ui-bg-base border border-ui-border-base rounded-xl p-6 flex items-start justify-between gap-4">
        <div>
          <Heading level="h1">Funcionalidades</Heading>
          <Text className="text-ui-fg-subtle">Ative ou desative recursos do site sem precisar de deploy.</Text>
        </div>
        <Button size="small" onClick={() => setModalOpen(true)}>Adicionar</Button>
      </div>

      <Input
        placeholder="Buscar por nome ou descrição..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filteredFlags.length === 0 && (
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

      <FocusModal open={isModalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setForm(EMPTY_FORM) }}>
        <FocusModal.Content>
          <FocusModal.Header />
          <FocusModal.Body className="p-8">
            <div className="grid gap-6 max-w-lg mx-auto">
              <Heading level="h2">Nova Funcionalidade</Heading>

              <div className="grid gap-2">
                <Label weight="plus">Nome</Label>
                <Input
                  placeholder="Ex: Playlist do Bar"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label weight="plus">Chave (key)</Label>
                <Input
                  placeholder="Ex: playlist (gerado automaticamente)"
                  value={form.key}
                  onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                />
                <Text className="text-ui-fg-subtle text-xs">Identificador único. Letras minúsculas e underscores. Não pode ser alterado depois.</Text>
              </div>

              <div className="grid gap-2">
                <Label weight="plus">Descrição</Label>
                <Textarea
                  placeholder="Explique o que esse switch faz, de forma que qualquer pessoa entenda."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between border rounded-xl px-4 py-3">
                <div>
                  <Text weight="plus">Ativar ao criar</Text>
                  <Text className="text-ui-fg-subtle text-sm">Deixe desativado se quiser ligar depois.</Text>
                </div>
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, enabled: checked }))}
                />
              </div>
            </div>
          </FocusModal.Body>
          <FocusModal.Footer>
            <Button variant="secondary" onClick={() => { setModalOpen(false); setForm(EMPTY_FORM) }}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Salvando..." : "Criar Funcionalidade"}
            </Button>
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Funcionalidades",
})

export default FeatureFlagsPage
