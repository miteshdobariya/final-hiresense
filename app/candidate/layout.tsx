"use client"
import React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { useSession } from "next-auth/react"
import axios from "axios"
import toast from "react-hot-toast"

function useCandidateProfileCompletion() {
  const { data: session, status } = useSession()
  const [isComplete, setIsComplete] = React.useState<boolean | null>(null)

  const checkCompletion = React.useCallback(async () => {
    if (status !== "authenticated" || !session?.user?._id) {
      setIsComplete(null)
      return
    }
    try {
      const response = await axios.get(`/api/candidate/getdetail?userId=${session.user._id}`)
      const result = response.data
      if (result.success && result.candidate) {
        // Use the same fields as in profile page
        const personal = result.candidate
        const required = [
          personal.username,
          personal.email,
          personal.phonenumber,
          personal.address,
          personal.city,
          personal.workDomain,
        ]
        // Add more fields as needed
        const isComplete = required.every(Boolean)
        setIsComplete(isComplete)
      } else {
        setIsComplete(false)
      }
    } catch {
      setIsComplete(false)
    }
  }, [session, status])

  useEffect(() => {
    checkCompletion()
  }, [checkCompletion])

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = () => {
      checkCompletion()
    }

    window.addEventListener('profile-updated', handleProfileUpdate)
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate)
    }
  }, [checkCompletion])

  return isComplete
}

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const isComplete = useCandidateProfileCompletion()

  useEffect(() => {
    // Only run on candidate pages except /candidate/profile
    if (
      pathname.startsWith("/candidate") &&
      pathname !== "/candidate/profile" &&
      isComplete === false
    ) {
      toast.custom(
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 my-4 text-base font-medium shadow">
          <strong>Notice:</strong> Please complete your profile before accessing other features.
        </div>,
        { duration: 4000 }
      );
      router.replace("/candidate/profile")
    }
  }, [pathname, isComplete, router])

  return <AppSidebar>{children}</AppSidebar>
}
