import KinematicsHome from '@/component/Home'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: "Kinematics of Machine Simulator",
  description:
    "Interactive four-bar and slider-crank mechanism simulator with displacement, velocity, and acceleration analysis.",
};

const page = () => {
  return (
   <KinematicsHome/>
  )
}

export default page
