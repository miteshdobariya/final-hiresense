




"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import toast from "react-hot-toast"
import { Chrome } from "lucide-react"
// Rebranded to HireSense AI

export default function LoginPage() {
  const handleGoogleSignIn = async () => {
    const res = await signIn("google", { redirect: true, callbackUrl: "/" })
    if (res?.error) {
      toast.error("Google login failed")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-white px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[url('/placeholder.svg?height=1080&width=1920&text=Minimal+Geometric+Pattern')] opacity-3"></div>

      <div className="relative w-full max-w-md space-y-8">
        {/* Brand Title Section */}
        <div className="text-center space-y-4">
          <div className="mx-auto flex items-center justify-center p-4">
            <h1 className="text-3xl font-bold tracking-tight text-black">HireSense AI</h1>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Intelligent hiring and interview automation</p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="w-full bg-white/80 backdrop-blur-sm border-gray-200 shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center text-black">Welcome</CardTitle>
            <CardDescription className="text-center text-gray-600">Sign in to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleGoogleSignIn}
              className="w-full bg-black text-white hover:bg-gray-800 transition-all duration-200 shadow-lg font-medium"
              variant="outline"
            >
              <Chrome className="mr-2 h-4 w-4" />
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Secure Login</span>
              </div>
            </div>

            <p className="text-xs text-center text-gray-500">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-gray-500 text-sm">
            Need help?{" "}
            <span className="text-black hover:text-gray-700 cursor-pointer underline transition-colors">
              Contact Support
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
