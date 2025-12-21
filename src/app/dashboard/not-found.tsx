"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, ArrowLeft, Search } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center px-4">
  <div className="max-w-md w-full text-center">
    {/* 404 Illustration */}
    <div className="mb-8">
      <div className="text-8xl font-bold text-primary mb-4">404</div>
      <div className="w-32 h-1 bg-primary mx-auto rounded-full"></div>
    </div>

    {/* Error Message */}
    <h1 className="text-2xl font-bold text-foreground mb-4">Page Not Found</h1>
    <p className="text-muted-foreground mb-8">
      Sorry, we couldn't find the page you're looking for. The page might have been moved, deleted, or you entered
      the wrong URL.
    </p>

    {/* Action Buttons */}
    <div className="space-y-4">
      <Link href="/">
        <Button className="w-full" size="lg">
          <Home className="w-4 h-4 mr-2" />
          Go Home
        </Button>
      </Link>

      <div className="flex gap-3 mt-4">
        <Button variant="outline" className="flex-1" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>

        <Link href="/courses" className="flex-1">
          <Button variant="outline" className="w-full">
            <Search className="w-4 h-4 mr-2" />
            Browse Courses
          </Button>
        </Link>
      </div>
    </div>

    {/* Help Text */}
    <div className="mt-8 text-sm text-muted-foreground">
      Need help?{" "}
      <Link href="/contact" className="text-primary hover:underline">
        Contact Support
      </Link>
    </div>
  </div>
</div>

  )
}
