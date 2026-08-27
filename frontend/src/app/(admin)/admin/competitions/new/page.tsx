import { CreateCompetitionForm } from "@/src/components/competitions/create-competition-form"
import {
  AdminPageHeader,
  AdminPageShell,
} from "@/components/layout"

export default function NewCompetitionPage() {
  return (
    <AdminPageShell wide className="max-w-3xl">
      <AdminPageHeader
        title="New competition"
        description="Configure the tournament, then save"
      />
      <CreateCompetitionForm />
    </AdminPageShell>
  )
}
