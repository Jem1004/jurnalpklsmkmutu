import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const tempatPklSchema = z.object({
  nama: z.string().min(1, "Nama tempat PKL harus diisi"),
  alamat: z.string().min(1, "Alamat harus diisi"),
  telepon: z.string().optional(),
  email: z.string().optional(),
  namaContact: z.string().optional()
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const tempatPkl = await prisma.tempatPkl.findMany({
      include: {
        _count: {
          select: {
            students: true
          }
        }
      },
      orderBy: {
        nama: 'asc'
      }
    })

    return NextResponse.json({ success: true, data: tempatPkl })
  } catch (error) {
    console.error('Error fetching tempat PKL:', error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { nama, alamat, telepon, email, namaContact } = tempatPklSchema.parse(body)

    const tempatPkl = await prisma.tempatPkl.create({
      data: {
        nama,
        alamat,
      },
      include: {
        _count: {
          select: {
            students: true
          }
        }
      }
    })

    return NextResponse.json({ success: true, data: tempatPkl }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: "Validation error", errors: error.errors }, { status: 400 })
    }
    console.error('Error creating tempat PKL:', error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id, nama, alamat, telepon, email, namaContact } = z.object({
      id: z.string(),
      ...tempatPklSchema.shape
    }).parse(body)

    const tempatPkl = await prisma.tempatPkl.update({
      where: { id },
      data: {
        nama,
        alamat,
      },
      include: {
        _count: {
          select: {
            students: true
          }
        }
      }
    })

    return NextResponse.json(tempatPkl)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error updating tempat PKL:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    // Check if there are students assigned to this location
    const studentsCount = await prisma.student.count({
      where: { tempatPklId: id }
    })

    if (studentsCount > 0) {
      return NextResponse.json({ 
        error: "Cannot delete location with assigned students" 
      }, { status: 400 })
    }

    await prisma.tempatPkl.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Tempat PKL deleted successfully" })
  } catch (error) {
    console.error('Error deleting tempat PKL:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}