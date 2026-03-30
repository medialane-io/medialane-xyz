import Link from "next/link"
import { Button } from "@/src/components/ui/button"

export default function OnboardingPage() {
  return (
    <div className="container mx-auto px-4 pt-32 pb-16 max-w-lg text-center space-y-6">
      <h1 className="text-3xl font-bold text-white">Coming Soon</h1>
      <p className="text-muted-foreground">Account features are temporarily unavailable.</p>
      <Button asChild variant="outline">
        <Link href="/">Go Home</Link>
      </Button>
    </div>
  )
}
