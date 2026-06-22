'use client';

import React from 'react';
import './BannerInfo.css';
import { assets } from '../../assets/assets';
import Link from 'next/link';

const BannerInfo = () => {
  return (
    <div className="cover">

    <div className='banner-info text-white'>
      <div className="head flex md:mt-0">
        <Link href='/'>
        <img className='logo md:ms-6 mt-2' src={assets.logo} alt="gctulogo"/>
        </Link>
         <Link href='/' className='mt-4 md:text-b-blue'>
            <h2 className='h1 font-bold'>GCTU ClasSync</h2>
            <h2 className='h2'>Class Timetable Platform</h2>
        </Link>
      </div>
      <div className="paragraph mt-16 ms-2">
        <p className='p1 font-bold'>Welcome!</p>
        <p className='p2'>Access and manage class schedules effortlessly with GCTU ClasSync.</p>
      </div>
    </div>
    </div>
  );
};

export default BannerInfo;
