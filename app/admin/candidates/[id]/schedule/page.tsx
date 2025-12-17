"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Clock, ArrowLeft, UserCog } from "lucide-react";
import toast from "react-hot-toast";
import { RadioGroup } from "@/components/ui/radio-group";
import { RadioGroupItem } from "@/components/ui/radio-group";

type ScheduleErrors = {
  assignee?: string;
  date?: string;
  time?: string;
  duration?: string;
  type?: string;
};

export default function ScheduleInterviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [candidate, setCandidate] = useState<any>(null);
  const [interviewers, setInterviewers] = useState<any[]>([]);
  const [selectedInterviewer, setSelectedInterviewer] = useState<string>("none");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string>("none");
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [selectedRole, setSelectedRole] = useState<'interviewers' | 'admins'>('interviewers');
  const [totalRounds, setTotalRounds] = useState<number>(5);
  const [ampm, setAmpm] = useState('AM');
  const [errors, setErrors] = useState<ScheduleErrors>({});

  useEffect(() => {
    fetch(`/api/admin/candidates/${id}`)
      .then(res => res.json())
      .then(data => {
        setCandidate(data.candidate);
        // Set total rounds from domain if available
        if (data.candidate?.workDomain?.name) {
          fetch(`/api/domains?domainname=${encodeURIComponent(data.candidate.workDomain.name)}`)
            .then(res => res.json())
            .then(domainData => {
              if (domainData.rounds && domainData.rounds.length > 0) {
                setTotalRounds(domainData.rounds.length);
              }
            });
        }
        // Pre-fill from assignedRounds for the current round and role
        const assignedRounds = data.candidate?.assignedRounds || [];
        // Find the assignment for the current round, regardless of role
        const currentAssignment = assignedRounds.find((a: any) => a.roundNumber === selectedRound);
        if (currentAssignment) {
          setSelectedRole(currentAssignment.assignedToModel);
          if (currentAssignment.assignedToModel === 'interviewers') {
            setSelectedInterviewer(currentAssignment.assignedTo);
          } else if (currentAssignment.assignedToModel === 'admins') {
            setSelectedAdmin(currentAssignment.assignedTo);
          }
          setDate(currentAssignment.scheduledDate ? currentAssignment.scheduledDate.slice(0, 10) : "");
          setTime(currentAssignment.scheduledTime || "");
          setDuration(currentAssignment.durationMinutes?.toString() || "60");
          setType(currentAssignment.interviewFormat || "");
        } else {
          setSelectedInterviewer("none");
          setSelectedAdmin("none");
        }
      });
    fetch("/api/admin/interviewers")
      .then(res => res.json())
      .then(data => setInterviewers(data.interviewers || []));
    fetch("/api/admin/admins")
      .then(res => res.json())
      .then(data => setAdmins(data.admins || []));
  }, [id]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const newErrors: ScheduleErrors = {};
    const assigneeId = selectedRole === 'interviewers' ? selectedInterviewer : selectedAdmin;
    // If 'None' is selected, trigger unassign (do not require other fields)
    if (assigneeId === 'none') {
      setErrors({});
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/candidates/assign-interviewer`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateId: id,
            role: selectedRole,
            action: "unassign",
            roundNumber: selectedRound,
          }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          toast.success(data.message || "Unassigned successfully");
          router.push("/admin/candidates");
        } else {
          throw new Error(data.error || "Failed to unassign");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to unassign");
      } finally {
        setLoading(false);
      }
      return;
    }
    // Otherwise, require all fields for assignment
    if (!date) newErrors.date = "Date is required";
    if (!time) newErrors.time = "Time is required";
    if (!duration) newErrors.duration = "Duration is required";
    if (!type) newErrors.type = "Format is required";
    if (!assigneeId) newErrors.assignee = `Please select a ${selectedRole === 'interviewers' ? 'interviewer' : 'admin'}`;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill all required fields.");
      setLoading(false);
      return;
    }
    setErrors({});
    setLoading(true);
    // Determine assignee and role
    // const assigneeId = selectedRole === 'interviewers' ? selectedInterviewer : selectedAdmin; // This line is removed

    // If 'None' is selected, trigger unassign
    if (assigneeId === 'none') {
      try {
        const response = await fetch(`/api/admin/candidates/assign-interviewer`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateId: id,
            role: selectedRole,
            action: "unassign",
            roundNumber: selectedRound,
          }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          toast.success(data.message || "Unassigned successfully");
          router.push("/admin/candidates");
        } else {
          throw new Error(data.error || "Failed to unassign");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to unassign");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Otherwise, proceed with assign/reassign as before
    if (!id || !assigneeId || !selectedRole) {
      toast.error('Please select a valid assignee and role.');
      setLoading(false);
      return;
    }
    try {
      let formattedTime = time;
      if (time) {
        const [h, m] = time.split(":");
        let hour = parseInt(h, 10);
        if (ampm === "PM" && hour < 12) hour += 12;
        if (ampm === "AM" && hour === 12) hour = 0;
        formattedTime = `${hour.toString().padStart(2, "0")}:${m}`;
      }
      const response = await fetch(`/api/admin/candidates/assign-interviewer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: id,
          assigneeId: assigneeId,
          assigneeType: selectedRole,
          notes: "", // Add notes if needed
          date,
          time: formattedTime,
          duration: Number(duration),
          type,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.error === "Interviewer is not active. Please activate the interviewer first.") {
          toast.error("The selected interviewer is not active. Please activate them before assignment.");
        } else {
          toast.error(data.error || "Failed to update assignment");
        }
        setLoading(false);
        return;
      }
      if (response.ok && data.success) {
        toast.success(data.message || "Operation successful");
        router.push("/admin/candidates");
      } else {
        toast.error(data.error || "Failed to update assignment");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update assignment");
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine button text and color (match dialog box logic)
  const isCurrentlyAssigned = !!candidate?.assignedInterviewer?.interviewerId;
  // Determine if this is a new assignment or an update
  const isFirstAssignment = !(candidate?.assignedRounds && candidate.assignedRounds.length > 0);
  let buttonText = isFirstAssignment ? "Submit" : "Update";
  let buttonClass = "w-full md:w-auto bg-black text-white hover:bg-gray-900";
  if (selectedInterviewer === "none" && isCurrentlyAssigned) {
    buttonText = "Unassign Interviewer";
    buttonClass = "w-full md:w-auto bg-red-600 hover:bg-red-700 text-white";
  } else if (isCurrentlyAssigned && selectedInterviewer !== "none" && selectedInterviewer !== candidate?.assignedInterviewer?.interviewerId) {
    buttonText = "Change Interviewer";
    buttonClass = "w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white";
  } else if (!isCurrentlyAssigned && selectedInterviewer !== "none") {
    buttonText = "Assign Interviewer";
    buttonClass = "w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white";
  }

  // Filter to only the latest assignment per round
  const latestAssignments = Object.values(
    (candidate?.assignedRounds || [])
      .sort((a: any, b: any) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())
      .reduce((acc: any, round: any) => {
        if (!acc[round.roundNumber]) {
          acc[round.roundNumber] = round;
        }
        return acc;
      }, {})
  );

  // Get current assignment for selected round
  const currentAssignment = latestAssignments.find((a: any) => a.roundNumber === selectedRound);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/candidates")}
          title="Back to Candidates">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">Assign / Reassign Interviewer</h1>
      </div>
      <p className="text-muted-foreground mb-4">Assign, reassign, or unassign an interviewer for this candidate. You can also schedule the interview details below.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* First Row: Assign To and Select Interviewer/Admin in separate cards, same row */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Assign To Card */}
          <Card className="w-full md:w-1/2">
            <CardHeader>
              <CardTitle>Assign To</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedRole} onValueChange={v => setSelectedRole(v as any)} className="flex flex-row gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="interviewers" id="interviewers" />
                  <label htmlFor="interviewers">Interviewer</label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="admins" id="admins" />
                  <label htmlFor="admins">Admin</label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
          {/* Select Interviewer/Admin Card */}
          <Card className="w-full md:w-1/2">
            <CardHeader>
              <CardTitle>Select {selectedRole === 'interviewers' ? 'Interviewer' : 'Admin'}</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedRole === 'interviewers' ? selectedInterviewer : selectedAdmin}
                onValueChange={v => selectedRole === 'interviewers' ? setSelectedInterviewer(v) : setSelectedAdmin(v)}
              >
                <SelectTrigger className={errors.assignee ? "border-red-500 text-red-600" : "text-left"}>
                  <SelectValue placeholder={`Choose a ${selectedRole === 'interviewers' ? 'interviewer' : 'admin'}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(selectedRole === 'interviewers' ? interviewers : admins.filter((a: any) => a.role === 'admin')).map((person: any) => (
                    <SelectItem key={person.id || person._id} value={person.id || person._id}>
                      <div>
                        <div className="font-medium">{person.name || person.username || person.email}</div>
                        <div className="text-sm text-muted-foreground">{person.email}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.assignee && <div className="text-red-500 text-xs mt-1">{errors.assignee}</div>}
            </CardContent>
          </Card>
        </div>
        {/* Schedule Details Section */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:gap-6">
            <div className="flex-1">
              <label className="mb-1 block">Date</label>
              <Input
                type="date"
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setDate(e.target.value)}
                className={errors.date ? "border-red-500" : ""}
              />
              {errors.date && <div className="text-red-500 text-xs mt-1">{errors.date}</div>}
            </div>
            <div className="flex-1">
              <label className="mb-1 block">Time</label>
              <div className="flex gap-2 items-center">
                <Input
                  type="text"
                  pattern="^(0?[1-9]|1[0-2]):[0-5][0-9]$"
                  placeholder="hh:mm"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  maxLength={5}
                  className={errors.time ? "border-red-500" : ""}
                />
                <Select value={ampm} onValueChange={setAmpm}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {errors.time && <div className="text-red-500 text-xs mt-1">{errors.time}</div>}
            </div>
            <div className="flex-1">
              <label className="mb-1 block">Duration (minutes)</label>
              <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} min={1} className={errors.duration ? "border-red-500" : ""} />
              {errors.duration && <div className="text-red-500 text-xs mt-1">{errors.duration}</div>}
            </div>
          </CardContent>
        </Card>
        {/* Interview Format Section */}
        <Card>
          <CardHeader>
            <CardTitle>Interview Format</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="mb-1 block">Format</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && <div className="text-red-500 text-xs mt-1">{errors.type}</div>}
          </CardContent>
        </Card>
        <Button type="submit" className={buttonClass} disabled={loading}>
          {loading ? "Processing..." : buttonText}
        </Button>
      </form>
      {/* Assignment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Round</th>
                  <th className="border px-2 py-1">Assigned To</th>
                  <th className="border px-2 py-1">Role</th>
                  <th className="border px-2 py-1">Date</th>
                  <th className="border px-2 py-1">Time</th>
                  <th className="border px-2 py-1">Format</th>
                  <th className="border px-2 py-1">Action</th>
                </tr>
              </thead>
              <tbody>
                {latestAssignments.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-muted-foreground">No assignments yet.</td></tr>
                )}
                {latestAssignments.map((a: any, idx: number) => (
                  <tr key={a._id || idx}>
                    <td className="border px-2 py-1">{a.roundNumber}</td>
                    <td className="border px-2 py-1">{a.assignedToName || a.assignedTo || 'N/A'}</td>
                    <td className="border px-2 py-1">{a.assignedToModel}</td>
                    <td className="border px-2 py-1">{a.scheduledDate ? new Date(a.scheduledDate).toLocaleDateString() : 'N/A'}</td>
                    <td className="border px-2 py-1">{a.scheduledTime || 'N/A'}</td>
                    <td className="border px-2 py-1">{a.interviewFormat || 'N/A'}</td>
                    <td className="border px-2 py-1">
                      <Button size="sm" variant="outline" onClick={() => setSelectedRound(a.roundNumber)}>Reassign</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 