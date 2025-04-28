
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
    { name: "ESP32-CAM Default", url: `http://${ip}:81/stream` },
    { name: "IP Webcam Android App", url: `http://${ip}:8080/video` },
    { name: "ESP32-CAM Alternate", url: `http://${ip}/cam-lo.jpg` },
    { name: "ESP32-CAM Still Image", url: `http://${ip}/capture` },
    { name: "Generic MJPEG Stream", url: `http://${ip}:8081/video` }
  ];
};
