'use client';

import React from 'react';
import './Nfooter.css';
import { Camera, Globe, MessageCircle } from 'lucide-react';

const Nfooter = () => {
  return (
    <div className='Nfooter mx-10 text-sm text-center sticky'>

      <ul className="navlinks flex text-xs space-x-2 justify-center">
        <li className="whitespace-nowrap">GCTU ClasSync</li>
        <li className="whitespace-nowrap">Learning Platform</li>
        <li className="whitespace-nowrap">Library</li>
        <li className="whitespace-nowrap">News</li>
      </ul>

      <ul>
        <li className="whitespace-nowrap">Programmes</li>
      </ul>

      <ul className='social-media-icons flex justify-center space-x-2'>
        <li><Globe className="h-4 w-4" /></li>
        <li><MessageCircle className="h-4 w-4" /></li>
        <li><Camera className="h-4 w-4" /></li>
      </ul>


      <div className="copy-right-text">
        <p>Copyright © 2024 Software</p>
      </div>

    <div className="bottom-text">
      <p>Unit Msquare GCTU ClasSync. All Rights Reserved</p>
    </div>

    </div>
  );
};

export default Nfooter;
