import React from 'react';
import { clsx } from 'clsx';

interface TypographyProps {
  className?: string;
  style?: string;
  children?: React.ReactNode;
}

export const HeaderText: React.FC<TypographyProps> = ({ className, style, children }) => (
  <h1 className={clsx('mt-3 text-xl lg:text-2xl font-extrabold', className, style)}>{children}</h1>
);

export const SmallHeaderText: React.FC<TypographyProps> = ({ className, style, children }) => (
  <h1 className={clsx('text-md lg:text-lg', className, style)}>{children}</h1>
);

export const ParagraphText: React.FC<TypographyProps> = ({ className, style, children }) => (
  <p className={clsx('text-md', className, style)}>{children}</p>
);

