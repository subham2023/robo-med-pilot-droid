
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Square } from "lucide-react";
import JoystickControl from "@/components/JoystickControl";
import { useToast } from "@/components/ui/use-toast";

const Index = () => {
  // Configuration state
  const [settings, setSettings] = useState({
    motorControlUrl: "http://192.168.1.100:80/motor",
    servoControlUrl: "http://192.168.1.100:80/servo",
    cameraUrl: "http://192.168.1.100:81/stream"
  });

  // State for tab selection
  const [activeTab, setActiveTab] = useState("control");
  
  const { toast } = useToast();
  const webViewRef = useRef<HTMLIFrameElement>(null);

  // Load saved settings on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('robotSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Save settings to local storage
  const saveSettings = () => {
    localStorage.setItem('robotSettings', JSON.stringify(settings));
    toast({
      title: "Settings saved",
      description: "Your configuration has been saved successfully.",
    });
    setActiveTab("control");
  };

  // Functions to send commands to ESP32s
  const sendMotorCommand = async (command: string) => {
    try {
      const url = `${settings.motorControlUrl}?action=${command}`;
      console.log(`Sending motor command: ${url}`);
      
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`Failed to send motor command: ${response.status}`);
      }
      
    } catch (error) {
      console.error("Motor control error:", error);
      toast({
        title: "Connection Failed",
        description: "Unable to send motor command. Check ESP32 connection.",
        variant: "destructive",
      });
    }
  };

  const sendServoCommand = async (servo: string, position: string) => {
    try {
      const url = `${settings.servoControlUrl}?servo=${servo}&position=${position}`;
      console.log(`Sending servo command: ${url}`);
      
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`Failed to send servo command: ${response.status}`);
      }
      
      toast({
        title: "Command Sent",
        description: `${servo.charAt(0).toUpperCase() + servo.slice(1)} moved to ${position} position`,
      });
    } catch (error) {
      console.error("Servo control error:", error);
      toast({
        title: "Connection Failed",
        description: "Unable to send servo command. Check ESP32 connection.",
        variant: "destructive",
      });
    }
  };

  // Handle settings input changes
  const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  // Reload the camera stream
  const reloadCamera = () => {
    if (webViewRef.current) {
      webViewRef.current.src = settings.cameraUrl;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-cyan-700">MedPilot Control</h1>
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab(activeTab === "control" ? "settings" : "control")}
          >
            <Settings className="h-5 w-5" />
            <span className="ml-2">{activeTab === "control" ? "Settings" : "Back to Control"}</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="control">Control Panel</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Control Panel Tab */}
          <TabsContent value="control" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Left Controls - Drawer Servos */}
              <div className="md:col-span-2 flex flex-col space-y-4 justify-center">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-lg font-medium mb-2 text-center">Left Drawer</h3>
                    <div className="space-y-2">
                      <Button 
                        className="w-full bg-cyan-600 hover:bg-cyan-700" 
                        onClick={() => sendServoCommand('drawer1', 'open')}
                      >
                        Open
                      </Button>
                      <Button 
                        className="w-full bg-cyan-600 hover:bg-cyan-700" 
                        onClick={() => sendServoCommand('drawer1', 'close')}
                      >
                        Close
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-lg font-medium mb-2 text-center">Right Drawer</h3>
                    <div className="space-y-2">
                      <Button 
                        className="w-full bg-cyan-600 hover:bg-cyan-700" 
                        onClick={() => sendServoCommand('drawer2', 'open')}
                      >
                        Open
                      </Button>
                      <Button 
                        className="w-full bg-cyan-600 hover:bg-cyan-700" 
                        onClick={() => sendServoCommand('drawer2', 'close')}
                      >
                        Close
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Center - Camera Feed */}
              <div className="md:col-span-8">
                <Card className="h-full">
                  <CardContent className="p-4 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-medium">Camera Feed</h3>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={reloadCamera}
                      >
                        Reload
                      </Button>
                    </div>
                    <div className="relative bg-black rounded-md flex-grow min-h-[300px] overflow-hidden">
                      {/* Camera Stream */}
                      <iframe 
                        ref={webViewRef}
                        src={settings.cameraUrl} 
                        className="absolute inset-0 w-full h-full"
                        title="IP Camera Stream"
                      />
                      
                      {/* Fallback message when stream is not available */}
                      <div className="absolute inset-0 flex items-center justify-center text-white opacity-50 pointer-events-none">
                        {!settings.cameraUrl && "Configure camera URL in settings"}
                      </div>
                    </div>
                    
                    {/* Joystick Control */}
                    <div className="mt-4 flex justify-center">
                      <JoystickControl onMove={sendMotorCommand} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Controls - Head Servos */}
              <div className="md:col-span-2 flex flex-col space-y-4 justify-center">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-lg font-medium mb-2 text-center">Head Controls</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <div></div>
                      <Button 
                        className="bg-cyan-600 hover:bg-cyan-700" 
                        onClick={() => sendServoCommand('head', 'up')}
                      >
                        <ArrowUp size={18} />
                      </Button>
                      <div></div>
                      
                      <Button 
                        className="bg-cyan-600 hover:bg-cyan-700" 
                        onClick={() => sendServoCommand('head', 'left')}
                      >
                        <ArrowLeft size={18} />
                      </Button>
                      <Button 
                        className="bg-cyan-600 hover:bg-cyan-700" 
                        onClick={() => sendServoCommand('head', 'center')}
                      >
                        <Square size={18} />
                      </Button>
                      <Button 
                        className="bg-cyan-600 hover:bg-cyan-700" 
                        onClick={() => sendServoCommand('head', 'right')}
                      >
                        <ArrowRight size={18} />
                      </Button>
                      
                      <div></div>
                      <Button 
                        className="bg-cyan-600 hover:bg-cyan-700" 
                        onClick={() => sendServoCommand('head', 'down')}
                      >
                        <ArrowDown size={18} />
                      </Button>
                      <div></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-cyan-700 mb-4">Connection Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Motor Control URL
                    </label>
                    <Input 
                      name="motorControlUrl"
                      value={settings.motorControlUrl}
                      onChange={handleSettingChange}
                      placeholder="http://192.168.1.100:80/motor"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Example: http://192.168.1.100:80/motor
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Servo Control URL
                    </label>
                    <Input 
                      name="servoControlUrl"
                      value={settings.servoControlUrl}
                      onChange={handleSettingChange}
                      placeholder="http://192.168.1.100:80/servo"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Example: http://192.168.1.100:80/servo
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IP Camera URL
                    </label>
                    <Input 
                      name="cameraUrl"
                      value={settings.cameraUrl}
                      onChange={handleSettingChange}
                      placeholder="http://192.168.1.100:81/stream"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Example: http://192.168.1.100:81/stream
                    </p>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      className="w-full bg-cyan-600 hover:bg-cyan-700" 
                      onClick={saveSettings}
                    >
                      Save Settings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 py-4 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          MedPilot Control Interface | v1.0
        </div>
      </footer>
    </div>
  );
};

export default Index;
