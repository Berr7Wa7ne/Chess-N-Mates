import { redirect } from "next/navigation"

/** Global matches list was mock-only; manage matches per competition. */
export default function MatchesPage() {
  redirect("/admin/competitions")
}
