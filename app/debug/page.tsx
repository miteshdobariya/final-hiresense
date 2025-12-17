"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugPage() {
  const [debugData, setDebugData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkDebug = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug-candidate")
      if (response.ok) {
        const data = await response.json()
        setDebugData(data)
        console.log("Debug data:", data)
      } else {
        console.error("Failed to get debug data")
      }
    } catch (error) {
      console.error("Error getting debug data:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Debug Candidate & Companion</h1>
      
      <Button onClick={checkDebug} disabled={loading}>
        {loading ? "Checking..." : "Check Debug Info"}
      </Button>
      
      {debugData && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(debugData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 