"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingUp, TrendingDown, Users, Award, Clock, Target, Download } from "lucide-react"

export default function PerformancePage() {
  const [selectedDomain, setSelectedDomain] = useState("all")
  const [selectedPeriod, setSelectedPeriod] = useState("last-30-days")
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  // Top performers domain filter state (must be before any return)
  const [topPerformerDomain, setTopPerformerDomain] = useState('all');
  const [roundDomain, setRoundDomain] = useState('all');
  const [domains, setDomains] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true)
    fetch("/api/admin/performance-stats")
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/domains')
      .then(res => res.json())
      .then(data => setDomains(data.domains || []));
  }, []);

  // Fallbacks for UI
  const overallStats = stats?.overallStats || {}
  const domainPerformance = stats?.domainPerformance || []
  const roundPerformance = stats?.roundPerformance || []
  const topPerformers = stats?.topPerformers || []
  // Unique domains for top performers filter
  const uniquePerformerDomains = Array.from(new Set(topPerformers.map((c: any) => c.domain).filter(Boolean)));
  const uniqueRoundDomains = domains.map((d: any) => d.domainname);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-800"
      case "Medium":
        return "bg-yellow-100 text-yellow-800"
      case "Hard":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Selected":
        return "default"
      case "In Progress":
        return "secondary"
      case "Rejected":
        return "destructive"
      default:
        return "outline"
    }
  }

  const exportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      averageScore: domainAvgScore,
      domainPerformance,
      roundPerformance,
      topPerformers,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance_report_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
  };

  if (loading) {
    return <div className="text-center py-8">Loading performance data...</div>
  }

  // Sort and filter top performers by selected domain
  const sortedTopPerformers = [...topPerformers]
    .filter(c => topPerformerDomain === 'all' || c.domain === topPerformerDomain)
    .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));

  // Filter rounds by selected domain
  const filteredRoundPerformance = roundDomain === 'all'
    ? roundPerformance
    : roundPerformance.filter((round: any) => {
        const selectedDomain = domains.find((d: any) => d.domainname === roundDomain);
        if (!selectedDomain) return false;
        return selectedDomain.rounds.some((r: any) => r.roundId?.toString() === round._id?.toString() || r.roundId === round._id);
      });

  // Calculate the average of all domains' average scores
  const domainAvgScore = domainPerformance.length > 0 ? (domainPerformance.reduce((sum, d) => sum + (d.averageScore || 0), 0) / domainPerformance.length) : 0;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Performance Analytics</h2>
          <p className="text-muted-foreground">Track candidate performance and interview insights</p>
        </div>
        {/* Export Report button removed */}
      </div>

      {/* Filters */}
      {/* Remove the period and domain filter dropdowns above the cards */}

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalCandidates}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1 text-green-600" />+{overallStats.improvement}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{domainAvgScore.toFixed(2)}%</div>
            <Progress value={domainAvgScore} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="domains" className="space-y-4">
        <TabsList>
          <TabsTrigger value="domains">Domain Performance</TabsTrigger>
          <TabsTrigger value="rounds">Round Performance</TabsTrigger>
          <TabsTrigger value="top-performers">Top Performers</TabsTrigger>
        </TabsList>

        <TabsContent value="domains" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Domain</CardTitle>
              <CardDescription>Compare candidate performance across different technology domains</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {domainPerformance.map((domain) => (
                  <div key={domain.domain} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">{domain.domain}</h4>
                        <Badge variant="outline">{domain.candidates} candidates</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Average Score</div>
                        <div className="text-lg font-semibold">{domain.averageScore !== undefined ? `${domain.averageScore.toFixed(2)}%` : 'N/A'}</div>
                        <Progress value={domain.averageScore} className="mt-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rounds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Round</CardTitle>
              <CardDescription>Analyze candidate performance across different interview rounds</CardDescription>
              {/* Domain filter for rounds */}
              <div className="mt-4 flex gap-2 items-center">
                <span className="text-sm">Filter by Domain:</span>
                <Select value={roundDomain} onValueChange={setRoundDomain}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Domains" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Domains</SelectItem>
                    {uniqueRoundDomains.map(domain => (
                      <SelectItem key={domain} value={domain}>{domain}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Round Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Question Bank</TableHead>
                    <TableHead>Avg. Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoundPerformance.map((round) => (
                    <TableRow key={round.round}>
                      <TableCell className="font-medium">{round.round}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{round.type}</Badge>
                      </TableCell>
                      <TableCell>{typeof round.questions === 'number' ? round.questions : 0}</TableCell>
                      <TableCell>{typeof round.questionBank === 'number' ? round.questionBank : 0}</TableCell>
                      <TableCell>{round.averageScore !== undefined ? `${round.averageScore.toFixed(2)}%` : 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-performers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Candidates</CardTitle>
              <CardDescription>Candidates with highest overall scores and performance</CardDescription>
              {/* Domain filter for top performers */}
              <div className="mt-4 flex gap-2 items-center">
                <span className="text-sm">Filter by Domain:</span>
                <Select value={topPerformerDomain} onValueChange={setTopPerformerDomain}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Domains" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Domains</SelectItem>
                    {uniquePerformerDomains.map(domain => (
                      <SelectItem key={domain} value={domain}>{domain}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Average Score</TableHead>
                    <TableHead>Rounds</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTopPerformers.map((candidate, index) => (
                    <TableRow key={candidate._id || candidate.email || (candidate.name + index)}>
                      <TableCell className="font-medium">#{index + 1}</TableCell>
                      <TableCell>{candidate.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{candidate.domain}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{candidate.averageScore !== undefined ? `${candidate.averageScore.toFixed(2)}%` : 'N/A'}</TableCell>
                      <TableCell>{candidate.roundsCompleted}/{candidate.totalRounds || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(candidate.status)}>{candidate.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
