"use client"

import { useState, useEffect } from "react"
import {
  Calendar,
  Users,
  FileText,
  BarChart3,
  ClipboardList,
  LogOut,
  MessageSquare,
  Code,
  Menu,
  X,
  Building2,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useSession, signOut } from "next-auth/react"

const adminItems = [
  { title: "Dashboard", url: "/admin", icon: BarChart3 },
  { title: "Candidates", url: "/admin/candidates", icon: Users },
  // { title: "Companions", url: "/admin/companions", icon: Building2 },
  // { title: "Assign Companion", url: "/admin/assign-companion", icon: Users },
  { title: "Domains", url: "/admin/domains", icon: Code },
  { title: "Rounds", url: "/admin/rounds", icon: Calendar },
  { title: "Questions", url: "/admin/questions", icon: FileText },
  { title: "Interviewers", url: "/admin/interviewers", icon: Users },
  { title: "Reviews", url: "/admin/reviews", icon: MessageSquare },
  { title: "Performance", url: "/admin/performance", icon: ClipboardList },
]

const candidateItems = [
  { title: "My Dashboard", url: "/candidate", icon: BarChart3 },
  { title: "My Profile", url: "/candidate/profile", icon: Users },
  { title: "Interviews", url: "/candidate/interviews", icon: Calendar },
]

const interviewerItems = [
  { title: "Dashboard", url: "/interviewer", icon: BarChart3 },
  { title: "Profile", url: "/interviewer/profile", icon: Users },
  { title: "My Candidates", url: "/interviewer/candidates", icon: Users },
  
]

const hrItems = [
  { title: "Dashboard", url: "/admin", icon: BarChart3 },
  { title: "Candidates", url: "/admin/candidates", icon: Users },
  { title: "Interviewers", url: "/admin/interviewers", icon: Users },
  { title: "Reviews", url: "/admin/reviews", icon: MessageSquare },
  { title: "Performance", url: "/admin/performance", icon: ClipboardList },
]

function SidebarContent({ user, menuItems, pathname, onLogout, onItemClick }: any) {
  const roleLabel =
    user?.role === "admin"
      ? "Admin Panel"
      : user?.role === "interviewer"
      ? "Interviewer Portal"
      : user?.role === "hr"
      ? "HR Panel"
      : "Candidate Portal"

  // Super admin check
  const isSuperAdmin = () => {
    if (!user?.email) return false;
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(",") || [];
    return adminEmails.includes(user.email);
  };

  const router = useRouter();

  // Prevent navigation if already on the same route
  const handleNavClick = (e: React.MouseEvent, url: string) => {
    if (pathname === url) {
      e.preventDefault();
      return;
    }
    if (onItemClick) onItemClick();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 lg:p-6 border-b border-gray-200">
        <h1 className="text-lg lg:text-xl font-semibold text-gray-900">Interview System</h1>
        <p className={`text-xs lg:text-sm mt-1 ${user?.role === 'hr' ? 'font-bold text-blue-700' : 'text-gray-600'}`}>{roleLabel}</p>
      </div>

      <div className="flex-1 py-4 lg:py-6 overflow-y-auto">
        <div className="px-3">
          {/* Remove the section header <p> for all roles */}
          {/* <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            {user?.role.charAt(0).toUpperCase() + user?.role.slice(1)}
          </p> */}
          <nav className="space-y-1">
            {menuItems.map((item: any) => {
              const isActive = pathname === item.url
              return (
                <Link
                  key={item.title}
                  href={item.url}
                  onClick={e => handleNavClick(e, item.url)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon className="mr-3 h-4 w-4 lg:h-5 lg:w-5" />
                  <span className="truncate">{item.title}</span>
                </Link>
              )
            })}
            {/* Conditionally render Admins tab for super admins */}
            {user.role === "admin" && isSuperAdmin() && (
              <Link
                key="Admins & HR"
                href="/admin/admins"
                onClick={e => handleNavClick(e, "/admin/admins")}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  pathname === "/admin/admins"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Users className="mr-3 h-4 w-4 lg:h-5 lg:w-5" />
                <span className="truncate">Admins & HR</span>
              </Link>
            )}
          </nav>
        </div>
      </div>

      <div className="border-t border-gray-200 p-3 lg:p-4">
        <div className="flex items-center">
          <Avatar className="h-8 w-8 lg:h-10 lg:w-10">
            <AvatarImage src={user?.image || "/placeholder.svg"} alt={user?.name || "User"} />
            <AvatarFallback className="bg-gray-200 text-gray-700 text-xs lg:text-sm">
              {user?.name?.split(" ").map((n: string) => n[0]).join("") || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-xs lg:text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout} className="ml-2 p-1 lg:p-2" title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const user = session?.user

  const logout = async () => {
    try {
      await signOut({ callbackUrl: "/login" })
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileOpen(false)
    }
    if (isMobileOpen) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [isMobileOpen])

  if (status === "loading" || !user) return null

  const menuItems =
    user.role === "admin"
      ? adminItems
      : user.role === "interviewer"
      ? interviewerItems
      : user.role === "hr"
      ? hrItems
      : candidateItems

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        className="lg:hidden fixed top-4 left-4 z-50 bg-white shadow-lg border-gray-200 hover:bg-gray-50"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Overlay for mobile menu */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:border-gray-200 lg:bg-white lg:shadow-sm z-40">
        <SidebarContent user={user} menuItems={menuItems} pathname={pathname} onLogout={logout} />
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full border-r border-gray-200 bg-white shadow-lg">
          <SidebarContent
            user={user}
            menuItems={menuItems}
            pathname={pathname}
            onLogout={logout}
            onItemClick={() => setIsMobileOpen(false)}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:pl-64">
        <div className="h-full overflow-auto pt-16 lg:pt-0">
          <div className="min-h-full">{children}</div>
        </div>
      </div>
    </div>
  )
}