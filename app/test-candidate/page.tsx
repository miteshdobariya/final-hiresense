"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestCandidatePage() {
  const [testData, setTestData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkCandidate = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/test-candidate-companion")
      if (response.ok) {
        const data = await response.json()
        setTestData(data)
        console.log("Test data:", data)
      } else {
        console.error("Failed to get test data")
      }
    } catch (error) {
      console.error("Error getting test data:", error)
    } finally {
      setLoading(false)
    }
  }

  const forceAssignCompanion = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/force-assign-companion", {
        method: "POST"
      })
      if (response.ok) {
        const data = await response.json()
        setTestData(data)
        console.log("Force assign result:", data)
        alert("Companion assigned successfully!")
      } else {
        const errorData = await response.json()
        console.error("Failed to force assign companion:", errorData)
        alert(`Error: ${errorData.error}`)
      }
    } catch (error) {
      console.error("Error force assigning companion:", error)
      alert("Error force assigning companion")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Test Candidate Companion</h1>

      <div className="space-x-4">
        <Button onClick={checkCandidate} disabled={loading}>
          {loading ? "Checking..." : "Check Candidate Companion"}
        </Button>
        
        <Button onClick={forceAssignCompanion} disabled={loading} variant="outline">
          {loading ? "Assigning..." : "Force Assign Companion"}
        </Button>
      </div>

      {testData && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Candidate Companion Status</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(testData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 