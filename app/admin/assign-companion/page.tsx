"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import toast from "react-hot-toast"

export default function AssignCompanionPage() {
  const [candidateEmail, setCandidateEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const assignCompanion = async () => {
    if (!candidateEmail) {
      toast.error("Please enter candidate email")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/admin/assign-companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateEmail })
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success("Companion assigned successfully!")
        setResult(data)
      } else {
        toast.error(data.error || "Failed to assign companion")
        setResult(data)
      }
    } catch (error) {
      console.error("Error assigning companion:", error)
      toast.error("Failed to assign companion")
    } finally {
      setLoading(false)
    }
  }

  const refreshAllCompanions = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/refresh-companions", {
        method: "POST"
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success(data.message)
        setResult(data)
      } else {
        toast.error(data.error || "Failed to refresh companions")
        setResult(data)
      }
    } catch (error) {
      console.error("Error refreshing companions:", error)
      toast.error("Failed to refresh companions")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Assign Companion</h2>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Manually Assign Companion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="candidateEmail">Candidate Email</Label>
            <Input
              id="candidateEmail"
              type="email"
              value={candidateEmail}
              onChange={(e) => setCandidateEmail(e.target.value)}
              placeholder="miteshdobariya.co22d1@scet.ac.in"
            />
          </div>
          
          <Button onClick={assignCompanion} disabled={loading || !candidateEmail}>
            {loading ? "Assigning..." : "Assign Companion"}
          </Button>
          
          <Button onClick={refreshAllCompanions} disabled={loading} variant="outline">
            {loading ? "Refreshing..." : "Refresh All Companions"}
          </Button>
          
          {result && (
            <div className="mt-4 p-4 border rounded">
              <h3 className="font-medium mb-2">Result:</h3>
              <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 