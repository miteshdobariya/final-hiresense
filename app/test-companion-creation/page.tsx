"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestCompanionCreationPage() {
  const [testData, setTestData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runTest = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/test-companion-creation")
      if (response.ok) {
        const data = await response.json()
        setTestData(data)
        console.log("Test data:", data)
      } else {
        console.error("Failed to run test")
      }
    } catch (error) {
      console.error("Error running test:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Test Companion Creation</h1>
      
      <Button onClick={runTest} disabled={loading}>
        {loading ? "Running Test..." : "Run Companion Test"}
      </Button>
      
      {testData && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
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