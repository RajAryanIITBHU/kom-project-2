import FourBarPage from '@/component/Bar'
import { Metadata } from 'next';
import React from 'react'


export const metadata: Metadata = {
  title: "Four-Bar Linkage Simulator",
  description:
    "Interactive four-bar and slider-crank mechanism simulator with displacement, velocity, and acceleration analysis.",
};

const page = () => {
  return (
    <FourBarPage/>
  )
}

export default page
