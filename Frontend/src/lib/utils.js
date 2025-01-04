// src/lib/utils.js
function cn(...classes) {
    return classes.filter(Boolean).join(' ');
  }
  
  export { cn };