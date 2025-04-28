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
      message: "Failed to connect to camera. This may be due to CORS restrictions, try enabling the CORS bypass option." 
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
    { name: "IP Webcam Android App (Browser)", url: `http://${ip}:8080/browser.html` },
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
    { name: "Low Resolution", url: `http://${ip}:8080/videofeed` },
    { name: "WebRTC Stream", url: `http://${ip}:8080/webrtc` },
    { name: "MJPEG with Auth", url: `http://${ip}:8080/video?username=&password=` },
    { name: "HTML Preview", url: `http://${ip}:8080` }
  ];
};

/**
 * Detect camera type based on URL pattern and return appropriate stream URL
 */
export const detectCameraType = (url: string): string => {
  const formattedUrl = formatCameraUrl(url);
  
  // IP Webcam Android app patterns
  if (formattedUrl.includes(':8080')) {
    // If URL doesn't end with a specific endpoint, try to determine the best one
    if (!formattedUrl.includes('/video') && !formattedUrl.includes('/photo.jpg') && !formattedUrl.includes('/videofeed')) {
      // Extract the base URL and append the video endpoint
      const baseUrlMatch = formattedUrl.match(/(https?:\/\/[^:/]+(?::\d+)?)/);
      if (baseUrlMatch && baseUrlMatch[1]) {
        console.log("Detected IP Webcam app, using video endpoint");
        return `${baseUrlMatch[1]}/video`;
      }
    }
  }
  
  // If URL ends with just the IP:port, append /video
  if (/^https?:\/\/\d+\.\d+\.\d+\.\d+:\d+$/.test(formattedUrl)) {
    return `${formattedUrl}/video`;
  }
  
  return formattedUrl;
};

/**
 * Get a direct image URL from stream URL for fallback purposes
 */
export const getImageUrlFromStreamUrl = (streamUrl: string): string => {
  const formattedUrl = formatCameraUrl(streamUrl);
  
  // IP Webcam app - convert video to snapshot
  if (formattedUrl.includes(':8080/video')) {
    return formattedUrl.replace('/video', '/photo.jpg');
  }
  
  // If URL is just the base IP:port, use photo.jpg
  if (/^https?:\/\/\d+\.\d+\.\d+\.\d+:\d+$/.test(formattedUrl)) {
    return `${formattedUrl}/photo.jpg`;
  }
  
  // ESP32-CAM - convert stream to snapshot
  if (formattedUrl.includes(':81/stream')) {
    return formattedUrl.replace(':81/stream', '/capture');
  }
  
  return formattedUrl;
};

/**
 * Debug camera connection and report info
 */
export const debugCameraConnection = async (url: string): Promise<{ status: string; info: Record<string, string> }> => {
  const formattedUrl = formatCameraUrl(url);
  console.log("Debugging camera connection for:", formattedUrl);
  
  const info: Record<string, string> = {
    originalUrl: url,
    formattedUrl: formattedUrl,
    isMJPEG: formattedUrl.includes('/video') || formattedUrl.includes('/stream') ? "Yes" : "No",
    isIPWebcam: formattedUrl.includes(':8080') ? "Yes" : "No",
    isESP32CAM: formattedUrl.includes(':81/stream') ? "Yes" : "No",
    corsIssue: "Possible - Try enabling CORS bypass"
  };
  
  try {
    const testResult = await testCameraConnection(formattedUrl);
    info.connectionTest = testResult.success ? "Success" : "Failed";
    info.testMessage = testResult.message;
    
    return {
      status: testResult.success ? "success" : "error",
      info: info
    };
  } catch (error) {
    info.error = String(error);
    
    return {
      status: "error",
      info: info
    };
  }
};
