
/**
 * Utility functions for camera connectivity and debugging
 */

export const testCameraConnection = async (url: string): Promise<{ success: boolean; message: string }> => {
  if (!url) {
    return { success: false, message: "No camera URL provided" };
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, { 
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    return { 
      success: true, 
      message: "Camera connection successful" 
    };
  } catch (error) {
    console.error("Camera connection test failed:", error);
    
    // Check if the error is a CORS issue
    if (error instanceof DOMException && error.name === "AbortError") {
      return { 
        success: false, 
        message: "Connection timed out. Check if camera is powered on and connected to network." 
      };
    }
    
    return { 
      success: false, 
      message: "Failed to connect to camera. This may be due to network issues, incorrect URL, or CORS restrictions." 
    };
  }
};

export const formatCameraUrl = (url: string): string => {
  if (!url) return '';
  
  // Add http:// if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `http://${url}`;
  }
  
  return url;
};

export const getCommonCameraUrls = (baseIp: string): { name: string; url: string }[] => {
  if (!baseIp) return [];
  
  // Extract base IP if a full URL was provided
  const ipMatch = baseIp.match(/\d+\.\d+\.\d+\.\d+/);
  const ip = ipMatch ? ipMatch[0] : baseIp;
  
  return [
    { name: "IP Webcam Android App (MJPEG)", url: `http://${ip}:8080/video` },
    { name: "IP Webcam Android App (JPG)", url: `http://${ip}:8080/photo.jpg` },
    { name: "IP Webcam Browser View", url: `http://${ip}:8080/browser.html` },
    { name: "Generic MJPEG Stream", url: `http://${ip}/mjpeg` },
    { name: "IP Camera HTTP Stream", url: `http://${ip}/videostream.cgi` },
    { name: "ESP32-CAM Default", url: `http://${ip}:81/stream` },
    { name: "ESP32-CAM Still Image", url: `http://${ip}/capture` },
  ];
};

/**
 * Get specific URL formats for the IP Webcam Android app
 */
export const getIpWebcamUrls = (baseIp: string): { name: string; url: string }[] => {
  if (!baseIp) return [];
  
  // Extract base IP if a full URL was provided
  const ipMatch = baseIp.match(/\d+\.\d+\.\d+\.\d+/);
  const ip = ipMatch ? ipMatch[0] : baseIp;
  
  return [
    { name: "MJPEG Stream", url: `http://${ip}:8080/video` },
    { name: "JPG Snapshot", url: `http://${ip}:8080/photo.jpg` },
    { name: "Browser Interface", url: `http://${ip}:8080/browser.html` },
    { name: "Audio Only", url: `http://${ip}:8080/audio.wav` },
    { name: "Low Resolution", url: `http://${ip}:8080/videofeed` }
  ];
};

/**
 * Detect camera type based on URL pattern and return appropriate stream URL
 */
export const detectCameraType = (url: string): string => {
  const formattedUrl = formatCameraUrl(url);
  
  // IP Webcam Android app patterns
  if (formattedUrl.includes(':8080')) {
    if (!formattedUrl.includes('/video')) {
      // Extract the base URL and append the correct path
      const baseUrlMatch = formattedUrl.match(/(https?:\/\/[^:/]+(?::\d+)?)/);
      if (baseUrlMatch && baseUrlMatch[1]) {
        return `${baseUrlMatch[1]}/video`;
      }
    }
  }
  
  return formattedUrl;
};

