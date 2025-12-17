"use client"

import type React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import axios from "axios"
import toast from "react-hot-toast"

function useInterviewerProfileCompletion() {
  const { data: session, status } = useSession()
  const [isComplete, setIsComplete] = useState<boolean | null>(null)

  // Refactor checkCompletion so it can be called from event listener
  const checkCompletion = async () => {
    if (status !== "authenticated" || !session?.user?._id) {
      setIsComplete(null)
      return
    }
    try {
      const response = await axios.get(`/api/interviewer/getdetail`)
      const result = response.data
      setIsComplete(!!result.profileCompleted)
    } catch {
      setIsComplete(false)
    }
  }

  useEffect(() => {
    checkCompletion()
  }, [session, status])

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = () => {
      checkCompletion()
    }
    window.addEventListener('profile-updated', handleProfileUpdate)
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate)
    }
  }, [status, session])

  return isComplete
}

export default function InterviewerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const isComplete = useInterviewerProfileCompletion()
  const { data: session } = useSession()

  useEffect(() => {
    // Only run on interviewer pages except /interviewer/profile
    const isHR = session?.user?.role === 'hr'
    if (
      pathname.startsWith("/interviewer") &&
      pathname !== "/interviewer/profile" &&
      isComplete === false &&
      !isHR
    ) {
      toast.custom(
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 my-4 text-base font-medium shadow">
          <strong>Notice:</strong> Please complete your profile before accessing other features.
        </div>,
        { duration: 4000 }
      );
      router.replace("/interviewer/profile")
    }
  }, [pathname, isComplete, router, session?.user?.role])

  return <AppSidebar>{children}</AppSidebar>
}
