import SliderCrankPage from '@/component/Slider'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: "Slider-Crank Linkage Simulator",
  description:
    "Interactive four-bar and slider-crank mechanism simulator with displacement, velocity, and acceleration analysis.",
};

const page = () => {
  return (
    <SliderCrankPage/>
  )
}

export default page
