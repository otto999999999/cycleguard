import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default function NutritionPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-foreground">
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5">
        <Link href="/" className="mb-6 text-sm text-muted-foreground">
          <ChevronLeft className="inline h-4 w-4" /> Zurück
        </Link>

        <h1 className="text-4xl font-black">Ernährung</h1>
        <p className="mt-3 text-muted-foreground">Coming soon.</p>
      </main>
    </div>
  )
}