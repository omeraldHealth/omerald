'use client';

import React from 'react';
import Image from 'next/image';

interface CardDesignProps {
  cardNo: number;
  imageSrc: string;
  title: string;
  desc: string;
}

const CardDesign: React.FC<CardDesignProps> = ({ cardNo, imageSrc, title, desc }) => {
  return (
    <div className="p-8 sm:p-12 bg-white shadow-lg rounded-lg hover:shadow-xl transition-shadow">
      <div className="flex w-12 h-12 sm:w-16 sm:h-16 mx-auto items-center justify-center text-white font-bold bg-orange-400 rounded-full mb-4">
        {cardNo}
      </div>
      <div className="flex justify-center my-4">
        <Image 
          className="h-32 sm:h-36 w-auto" 
          src={imageSrc} 
          alt={title}
          width={200}
          height={200}
        />
      </div>
      <h3 className="mb-2 font-bold text-xl text-center">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed text-center">{desc}</p>
    </div>
  );
};

export default CardDesign;

