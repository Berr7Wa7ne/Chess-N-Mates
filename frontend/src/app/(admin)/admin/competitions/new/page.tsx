import { CreateCompetitionForm } from "@/src/components/competitions/create-competition-form"
import { AdminPageHeader, AdminPageShell } from "@/components/layout"

export default function NewCompetitionPage() {
  return (
    <AdminPageShell>
      <AdminPageHeader
        title="New tournament"
        description="Name it, set start — everything else is ready by default"
      />
      <CreateCompetitionForm />
    </AdminPageShell>
  )
}
