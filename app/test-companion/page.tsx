"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestCompanionPage() {
  const [email, setEmail] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testCompanionLookup = async () => {
    if (!email) return
    
    setLoading(true)
    try {
      const response = await fetch("/api/test-companion-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      })
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("Error testing companion lookup:", error)
      setResult({ error: "Failed to test companion lookup" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Test Companion Lookup</h1>
      
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Test Email Domain</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@scet.ac.in"
            />
          </div>
          
          <Button onClick={testCompanionLookup} disabled={loading || !email}>
            {loading ? "Testing..." : "Test Companion Lookup"}
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