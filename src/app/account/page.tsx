import Link from "next/link"
import { Button } from "@/src/components/ui/button"

export default function AccountPage() {
  return (
    <div className="container mx-auto px-4 pt-32 pb-16 max-w-lg text-center space-y-6">
      <h1 className="text-3xl font-bold text-white">Account</h1>
      <p className="text-muted-foreground">Account dashboard is temporarily unavailable. Contact us to get API access.</p>
      <Button asChild>
        <Link href="/connect">Contact Us</Link>
      </Button>
    </div>
  )
}
