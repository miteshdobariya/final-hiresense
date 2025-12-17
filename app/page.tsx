"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      const role = session?.user?.role

      if (role === "admin" || role === "hr") {
        router.replace("/admin")
      } else if (role === "interviewer") {
        router.replace("/interviewer")
      } else {
        router.replace("/candidate")
      }
    } else if (status === "unauthenticated") {
      router.replace("/login")
    }
  }, [status, session, router])

  return null // or a loader/spinner
}
