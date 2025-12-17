import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { connect } from "@/dbConfig/dbConfig"
import Companion from "@/models/companions"
import Domain from "@/models/domains"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connect()
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params;
    const companion = await Companion.findById(id)
      .populate("domains", "domainname description")
      .populate("createdBy", "username email")

    if (!companion) {
      return NextResponse.json({ error: "Companion not found" }, { status: 404 })
    }

    return NextResponse.json(companion)
  } catch (error) {
    console.error("Error fetching companion:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connect()
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params;
    const body = await request.json()
    const { collegeName, emailDomain, description, domains, isActive, settings } = body

    const companion = await Companion.findById(id)
    if (!companion) {
      return NextResponse.json({ error: "Companion not found" }, { status: 404 })
    }

    // Check if email domain already exists (excluding current companion)
    if (emailDomain && emailDomain !== companion.emailDomain) {
      const existingCompanion = await Companion.findOne({ emailDomain, _id: { $ne: id } })
      if (existingCompanion) {
        return NextResponse.json({ error: "Email domain already exists" }, { status: 400 })
      }
    }

    // Check if college name already exists (excluding current companion)
    if (collegeName && collegeName !== companion.collegeName) {
      const existingCollege = await Companion.findOne({ collegeName, _id: { $ne: id } })
      if (existingCollege) {
        return NextResponse.json({ error: "College name already exists" }, { status: 400 })
      }
    }

    // Validate domains exist if provided
    if (domains && domains.length > 0) {
      const domainIds = await Domain.find({ _id: { $in: domains } })
      if (domainIds.length !== domains.length) {
        return NextResponse.json({ error: "Some domains do not exist" }, { status: 400 })
      }
    }

    const updateData: any = {}
    if (collegeName !== undefined) updateData.collegeName = collegeName
    if (emailDomain !== undefined) updateData.emailDomain = emailDomain
    if (description !== undefined) updateData.description = description
    if (domains !== undefined) updateData.domains = domains
    if (isActive !== undefined) updateData.isActive = isActive
    if (settings !== undefined) updateData.settings = settings

    const updatedCompanion = await Companion.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
      .populate("domains", "domainname description")
      .populate("createdBy", "username email")

    return NextResponse.json(updatedCompanion)
  } catch (error) {
    console.error("Error updating companion:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connect()
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params;
    const companion = await Companion.findById(id)
    if (!companion) {
      return NextResponse.json({ error: "Companion not found" }, { status: 404 })
    }

    await Companion.findByIdAndDelete(id)

    return NextResponse.json({ message: "Companion deleted successfully" })
  } catch (error) {
    console.error("Error deleting companion:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 