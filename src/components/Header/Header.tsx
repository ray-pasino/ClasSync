'use client';

import React from 'react';
import './Header.css';
import { assets } from '../../assets/assets';
import Link from 'next/link';

const Header = () => {
  return (

       <div className="head flex text-b-blue md:mt-0  w-full md:w-full border-b bg-white md:pb-4 fixed">
        <Link href='/'>
        <img className='logo md:ms-6' src={assets.logo} alt="gctulogo"/>
        </Link>
        <Link href='/' className='mt-4 md:text-b-blue'>
            <h2 className='h1 font-bold'>GCTU ClasSync</h2>
            <h2 className='h2'>Class Timetable Platform</h2>
        </Link>
      </div>
  );
};

export default Header;
