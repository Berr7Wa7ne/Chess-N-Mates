import { PlayerLayout } from "@/components/layout"

export default function PlayerGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <PlayerLayout>{children}</PlayerLayout>
}
