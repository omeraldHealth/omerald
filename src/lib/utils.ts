import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts image extensions to .webp for blog.omerald.com URLs
 */
function convertToWebp(filename: string): string {
  // Replace common image extensions with .webp
  return filename.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
}

/**
 * Normalizes image URLs by converting http to https when possible
 * This helps with Next.js Image component compatibility
 */
export function normalizeImageUrl(url: string | undefined | null): string {
  if (!url) return '/pictures/blog1.webp'; // fallback image
  
  // Trim whitespace
  url = url.trim();
  
  // If it's already a relative path or data URL, return as is
  if (url.startsWith('/') || url.startsWith('data:')) {
    return url;
  }
  
  // If it's an absolute URL (http/https), convert http to https
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url.replace('http://', 'https://');
  }
  
  // If it's just a filename (no path separators, no protocol), 
  // it's stored on blog.omerald.com
  // Convert extension to .webp: "16527189338055.jpg" -> "16527189338055.webp"
  if (!url.includes('/') && !url.includes('\\')) {
    const webpFilename = convertToWebp(url);
    return `https://blog.omerald.com/public/uploads/articles/${webpFilename}`;
  }
  
  // If it has path separators but no protocol, assume it's a relative path
  if (url.includes('/') && !url.startsWith('http')) {
    // If it's already a path like "uploads/articles/filename.jpg", construct full URL
    if (url.startsWith('uploads/') || url.startsWith('/uploads/') || url.startsWith('public/') || url.startsWith('/public/')) {
      const cleanPath = url.startsWith('/') ? url.substring(1) : url;
      // Convert extension to .webp in the path
      const webpPath = cleanPath.replace(/\.(jpg|jpeg|png|gif)(?=\/|$)/gi, '.webp');
      return `https://blog.omerald.com/${webpPath}`;
    }
    // If it's just a filename with path, assume it's in the articles directory
    const cleanPath = url.startsWith('/') ? url.substring(1) : url;
    // Convert extension to .webp
    const webpPath = cleanPath.replace(/\.(jpg|jpeg|png|gif)(?=\/|$)/gi, '.webp');
    return `https://blog.omerald.com/public/uploads/articles/${webpPath}`;
  }
  
  // For any other case, add leading slash to make it relative
  return `/${url}`;
}
