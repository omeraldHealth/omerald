import { jsPDF } from 'jspdf';

/**
 * Converts multiple images to a single PDF
 * @param images - Array of image files or data URLs
 * @returns Promise that resolves to a Blob containing the PDF
 */
export async function convertImagesToPdf(images: File[] | string[]): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    let imageDataUrl: string;

    // Convert File to data URL if needed (with optimization)
    if (typeof image === 'string') {
      imageDataUrl = image;
    } else {
      imageDataUrl = await fileToDataUrl(image);
    }

    // Get image dimensions
    const img = await loadImage(imageDataUrl);
    const imgWidth = img.width;
    const imgHeight = img.height;

    // Calculate dimensions to fit A4 page (210mm x 297mm)
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 10; // 10mm margin on all sides
    const maxWidth = pageWidth - (margin * 2);
    const maxHeight = pageHeight - (margin * 2);

    // Calculate scaling to fit image within page
    const widthRatio = maxWidth / (imgWidth * 0.264583); // Convert px to mm (1px = 0.264583mm at 96dpi)
    const heightRatio = maxHeight / (imgHeight * 0.264583);
    const ratio = Math.min(widthRatio, heightRatio, 1); // Don't upscale

    const scaledWidth = (imgWidth * 0.264583) * ratio;
    const scaledHeight = (imgHeight * 0.264583) * ratio;

    // Center image on page
    const x = (pageWidth - scaledWidth) / 2;
    const y = (pageHeight - scaledHeight) / 2;

    // Add new page for each image except the first
    if (i > 0) {
      pdf.addPage();
    }

    // Add image to PDF (jsPDF automatically compresses)
    pdf.addImage(imageDataUrl, 'JPEG', x, y, scaledWidth, scaledHeight);
  }

  // Convert to Blob
  const pdfBlob = pdf.output('blob');
  return pdfBlob;
}

/**
 * Converts a File to a data URL with optimization
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // For images, compress them before converting to reduce file size
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Calculate max dimensions (A4 at 1.2 scale = ~1000px width)
          const maxWidth = 1200;
          const maxHeight = 1600;
          
          let width = img.width;
          let height = img.height;
          
          // Resize if image is too large
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }
          
          // Create canvas with optimized dimensions
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw resized image
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to optimized JPEG (quality 0.75 for balance)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else {
      // For non-images, use direct conversion
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }
  });
}

/**
 * Loads an image and returns its dimensions
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Processes and aligns an image using canvas
 * This is a basic implementation - can be enhanced with more sophisticated alignment
 */
export async function processImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Set canvas dimensions to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw image to canvas (this allows for future processing like rotation, cropping, etc.)
        ctx.drawImage(img, 0, 0);

        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to process image'));
              return;
            }

            // Create a new File with the processed image
            const processedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            resolve(processedFile);
          },
          'image/jpeg',
          0.92 // Quality (0-1)
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Converts PDF pages to images
 * @param pdfFile - PDF file to convert
 * @returns Promise that resolves to array of image data URLs
 */
export async function pdfToImages(pdfFile: File): Promise<string[]> {
  // Dynamically import pdfjs-dist to avoid SSR issues
  const pdfjsLib = await import('pdfjs-dist');
  
  // Set worker source - use CDN for better compatibility
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }

  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    // Use lower scale (1.2) for smaller file size while maintaining readability
    const viewport = page.getViewport({ scale: 1.2 });

    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render PDF page to canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    };
    await page.render(renderContext).promise;

    // Convert canvas to optimized JPEG with lower quality for smaller file size
    // Quality 0.75 provides good balance between quality and file size
    images.push(canvas.toDataURL('image/jpeg', 0.75));
  }

  return images;
}

/**
 * Merges multiple files (images and PDFs) into a single PDF
 * @param files - Array of files (images and/or PDFs)
 * @returns Promise that resolves to a Blob containing the merged PDF
 */
export async function mergeFilesToPdf(files: File[]): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    let imageDataUrls: string[] = [];

    if (file.type === 'application/pdf') {
      // Convert PDF pages to images
      imageDataUrls = await pdfToImages(file);
    } else if (file.type.startsWith('image/')) {
      // Convert image file to data URL
      const dataUrl = await fileToDataUrl(file);
      imageDataUrls = [dataUrl];
    } else {
      console.warn(`Skipping unsupported file type: ${file.type}`);
      continue;
    }

    // Add each image to PDF
    for (let j = 0; j < imageDataUrls.length; j++) {
      const imageDataUrl = imageDataUrls[j];
      
      // Add new page for each image except the first
      if (i > 0 || j > 0) {
        pdf.addPage();
      }

      // Get image dimensions
      const img = await loadImage(imageDataUrl);
      const imgWidth = img.width;
      const imgHeight = img.height;

      // Calculate dimensions to fit A4 page
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 10; // 10mm margin
      const maxWidth = pageWidth - (margin * 2);
      const maxHeight = pageHeight - (margin * 2);

      // Calculate scaling
      const widthRatio = maxWidth / (imgWidth * 0.264583);
      const heightRatio = maxHeight / (imgHeight * 0.264583);
      const ratio = Math.min(widthRatio, heightRatio, 1);

      const scaledWidth = (imgWidth * 0.264583) * ratio;
      const scaledHeight = (imgHeight * 0.264583) * ratio;

      // Center image on page
      const x = (pageWidth - scaledWidth) / 2;
      const y = (pageHeight - scaledHeight) / 2;

      // Add image to PDF (jsPDF automatically compresses)
      pdf.addImage(imageDataUrl, 'JPEG', x, y, scaledWidth, scaledHeight);
    }
  }

  // Convert to Blob with compression
  const pdfBlob = pdf.output('blob');
  return pdfBlob;
}

/**
 * Checks if the device supports camera access
 */
export function isCameraSupported(): boolean {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );
}







