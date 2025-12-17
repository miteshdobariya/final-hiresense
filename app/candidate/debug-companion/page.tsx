"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugCompanionPage() {
  const [companionData, setCompanionData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkCompanion = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/candidate/check-companion")
      if (response.ok) {
        const data = await response.json()
        setCompanionData(data)
      } else {
        console.error("Failed to check companion")
      }
    } catch (error) {
      console.error("Error checking companion:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDomains = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/domains/by-companion")
      if (response.ok) {
        const domains = await response.json()
        console.log("Domains for candidate:", domains)
        alert(`Found ${domains.length} domains for your companion`)
      } else {
        console.error("Failed to fetch domains")
      }
    } catch (error) {
      console.error("Error fetching domains:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Debug Companion Assignment</h1>
      
      <div className="space-y-4">
        <Button onClick={checkCompanion} disabled={loading}>
          {loading ? "Checking..." : "Check Companion Assignment"}
        </Button>
        
        <Button onClick={fetchDomains} disabled={loading}>
          {loading ? "Fetching..." : "Fetch Domains for Companion"}
        </Button>
        
        {companionData && (
          <Card>
            <CardHeader>
              <CardTitle>Companion Assignment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
                {JSON.stringify(companionData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 