import type { NextPage } from 'next'
import Head from 'next/head'
import React from 'react'

interface Props {
  title?: string
  thumnailUrl?: string
  description?: string
}

const MyHead = ({ title, thumnailUrl, description }: Props) => {
  const siteName = 'Xpolrer'
  if (title === undefined) {
    title = siteName
  } else {
    title = title
  }

  return (
    <Head>
      <title>{`${title} - ${siteName}`}</title>
      <meta property='og:title' content={title} key='title' />
    </Head>
  )
}

export default MyHead
