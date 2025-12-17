import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { connect } from "@/dbConfig/dbConfig"
import Domain from "@/models/domains"

export async function GET(req: NextRequest) {
  await connect()
  const domains = await Domain.find()
  return NextResponse.json({ domains })
}

export async function POST(req: NextRequest) {
  await connect()
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const { domainname, description, isCommon } = body
  if (!domainname) {
    return NextResponse.json({ error: "Domain name is required" }, { status: 400 })
  }
  const domain = await Domain.create({ domainname, description, isCommon })
  return NextResponse.json({ domain })
} 

export async function PATCH(req: NextRequest) {
  await connect()
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const { _id, addRoundId, removeRoundId, updateRoundSequence, ...updateData } = body
  if (!_id) {
    return NextResponse.json({ error: "Domain ID is required" }, { status: 400 })
  }
  
  let domain
  if (addRoundId) {
    // Get current domain to find next sequence number
    const currentDomain = await Domain.findById(_id)
    const nextSequence = currentDomain?.rounds?.length || 0
    
    domain = await Domain.findByIdAndUpdate(
      _id,
      { $push: { rounds: { roundId: addRoundId, sequence: nextSequence } } },
      { new: true }
    ).populate('rounds.roundId')
  } else if (removeRoundId) {
    domain = await Domain.findByIdAndUpdate(
      _id,
      { $pull: { rounds: { roundId: removeRoundId } } },
      { new: true }
    ).populate('rounds.roundId')
  } else if (updateRoundSequence) {
    // Update sequence for a specific round
    const { roundId, newSequence } = updateRoundSequence
    domain = await Domain.findByIdAndUpdate(
      _id,
      { $set: { "rounds.$[elem].sequence": newSequence } },
      { 
        new: true,
        arrayFilters: [{ "elem.roundId": roundId }]
      }
    ).populate('rounds.roundId')
  } else {
    domain = await Domain.findByIdAndUpdate(_id, updateData, { new: true }).populate('rounds.roundId')
  }
  
  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 })
  }
  return NextResponse.json({ domain })
}

export async function DELETE(req: NextRequest) {
  await connect()
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { _id } = await req.json()
  if (!_id) {
    return NextResponse.json({ error: "Domain ID is required" }, { status: 400 })
  }
  await Domain.findByIdAndDelete(_id)
  return NextResponse.json({ success: true })
} 