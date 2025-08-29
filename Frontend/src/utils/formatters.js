// Converts a duration string (hh:mm:ss.ms) to seconds
export const convertToSeconds = (duration) => {
    if (!duration) return 0; // If duration is undefined or empty, return 0 seconds
  
    const [hours, minutes, seconds] = duration.split(':');
    const [secs, ms] = (seconds || '0').split('.'); // Default to '0' if seconds is undefined
  
    return (
      parseInt(hours) * 3600 + 
      parseInt(minutes) * 60 + 
      parseInt(secs) + 
      (ms ? parseInt(ms) / 1000000 : 0)
    );
};

// Converts total seconds to "X hr Y min" or "X min Y sec" format
export const convertToHrMinFormat = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    let result = '';
    if (hours > 0) result += `${hours} hr `;
    if (minutes > 0) result += `${minutes} min `;
    if (remainingSeconds > 0 || hours === 0) result += `${remainingSeconds} sec`;
  
    return result.trim();
};

// Combine multiple durations and return the total duration in "X hr Y min" or "X min Y sec" format
export const combineDurations = (durations) => {
    const totalSeconds = durations.reduce((acc, duration) => acc + convertToSeconds(duration), 0);
    return convertToHrMinFormat(totalSeconds);
};




export const formatDuration = (duration) => {
    if (!duration) return '00:00';

    // Split the duration into hours, minutes, seconds, and milliseconds
    const [time, milliseconds] = duration.split('.');
    const [hours, minutes, seconds] = time.split(':').map(Number);

    // Format the time with leading zeros removed for hours and minutes
    const formattedTime = [hours, minutes, seconds]
      .map((num, index) => {
        if (index < 2 && num < 10) return num; // Remove leading zero for hours and minutes
        return num < 10 ? `0${num}` : num; // Keep leading zero for seconds
      })
      .join(':');

    // Remove hour if it is 00 and also remove trailing ":00" or ":"
    return formattedTime.replace(/^00:/, '').replace(/^0:/, '').replace(/:00$/, '').replace(/:$/, '');
};