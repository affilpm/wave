import React, { useState, useEffect, useRef } from 'react';
// import MIN_IMAGE_SIZE from './MusicUpload';
// import MIN_IMAGE_SIZE from './MusicUpload';
const MIN_IMAGE_SIZE = 500;




const ResizeImage = (file) => {
    return new Promise((resolve, reject) => {
      try {
        // Create a FileReader to read the file
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const img = new Image();
            
            img.onload = () => {
              try {
                // Calculate scaling factor to reach minimum size
                const scale = MIN_IMAGE_SIZE / Math.min(img.width, img.height);
                
                // Create canvas for resizing
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas size maintaining aspect ratio
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                
                // Draw scaled image
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Convert to blob
                canvas.toBlob(
                  (blob) => {
                    if (blob) {
                      // Create a new File object from the blob
                      const resizedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                      });
                      resolve({
                        file: resizedFile,
                        url: URL.createObjectURL(blob),
                        width: canvas.width,
                        height: canvas.height
                      });
                    } else {
                      reject(new Error('Failed to create blob from canvas'));
                    }
                  },
                  'image/jpeg',
                  0.95
                );
              } catch (err) {
                reject(new Error(`Canvas operation failed: ${err.message}`));
              }
            };
  
            img.onerror = () => {
              reject(new Error('Failed to load image'));
            };
  
            img.src = e.target.result;
          } catch (err) {
            reject(new Error(`Image creation failed: ${err.message}`));
          }
        };
  
        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };
  
        reader.readAsDataURL(file);
      } catch (err) {
        reject(new Error(`Initial setup failed: ${err.message}`));
      }
    });
  };
  
  
  export default ResizeImage;