'use client'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

//components
import Navbar from '../components/navbar'

interface dict {
  [key: string]: any
}

const RealtimePage = () => {
  const searchParams = useSearchParams()

  return (
    <>
      <Navbar />
    </>
  )
}
export default RealtimePage
