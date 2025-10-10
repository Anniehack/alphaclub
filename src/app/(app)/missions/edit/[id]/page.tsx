'use client'
import { useRouter, useParams } from 'next/navigation'
import { useEffect } from 'react'

export default function EditMissionPage() {
  const router = useRouter()
  const params = useParams()
  const missionId = params.id as string
  
  useEffect(() => {
    console.log('Mission ID:', missionId)
    router.push('/missions')
  }, [router, missionId])
  
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Edit Mission</h2>
        <p className="text-gray-600">Redirecting to missions...</p>
      </div>
    </div>
  )
}