import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Square, List, RefreshCw } from "lucide-react";
import JoystickControl from "@/components/JoystickControl";
import { useToast } from "@/components/ui/use-toast";
import MedicineScheduler from "@/components/MedicineScheduler";
import { LocalNotifications } from '@capacitor/local-notifications';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CameraFeed from "@/components/CameraFeed";

interface Medicine {
  name: string;
  drawer: 'drawer1' | 'drawer2';
  time: string;
}

const Index = () => {
  const [settings, setSettings] = useState({
    motorControlUrl: "http://192.168.1.100:80/motor",
    servoControlUrl: "http://192.168.1.100:80/servo",
    cameraUrl: "http://192.168.1.100:81/stream"
  });

  const [activeTab, setActiveTab] = useState("control");
  const [scheduledMedicines, setScheduledMedicines] = useState<Medicine[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        if ('Capacitor' in window) {
          await LocalNotifications.requestPermissions();
        }
      } catch (error) {
        console.log('Running in web environment, notifications will be shown as toasts');
      }
    };

    initializeNotifications();
  }, []);

  useEffect(() => {
    const savedSettings = localStorage.getItem('robotSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  useEffect(() => {
    const savedMedicines = localStorage.getItem('scheduledMedicines');
    if (savedMedicines) {
      setScheduledMedicines(JSON.parse(savedMedicines));
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      scheduledMedicines.forEach(medicine => {
        if (medicine.time === currentTime) {
          showNotification(medicine);
          sendServoCommand(medicine.drawer, 'open');
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [scheduledMedicines]);

  const showNotification = async (medicine: Medicine) => {
    const drawerName = medicine.drawer === 'drawer1' ? 'Drawer 1' : 'Drawer 2';
    const message = `Time to take ${medicine.name} from ${drawerName}`;
    
    try {
      if ('Capacitor' in window) {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: 'Medicine Time!',
              body: message,
              id: Date.now(),
              schedule: { at: new Date() },
              sound: 'beep.wav',
              actionTypeId: 'OPEN_DRAWER',
              extra: { medicineId: medicine.drawer }
            }
          ]
        });
      } else {
        toast({
          title: "Medicine Time!",
          description: message,
        });
      }
    } catch (error) {
      toast({
        title: "Medicine Time!",
        description: message,
      });
    }
  };

  const saveSettings = () => {
    localStorage.setItem('robotSettings', JSON.stringify(settings));
    toast({
      title: "Settings saved",
      description: "Your configuration has been saved successfully.",
    });
    setActiveTab("control");
    
    reloadCamera();
  };

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

  const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const reloadCamera = () => {
    if (!settings.cameraUrl) {
      toast({
        title: "Camera URL Missing",
        description: "Please set a camera URL in settings first.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Reloading Camera",
      description: "Attempting to connect to camera feed...",
    });
  };

  const handleCameraUrlChange = (newUrl: string) => {
    const updatedSettings = {
      ...settings,
      cameraUrl: newUrl
    };
    
    setSettings(updatedSettings);
    localStorage.setItem('robotSettings', JSON.stringify(updatedSettings));
    
    toast({
      title: "Camera URL Updated",
      description: "Using new camera stream format",
    });
  };

  const handleScheduleMedicine = (medicine: Medicine) => {
    const updatedMedicines = [...scheduledMedicines, medicine];
    setScheduledMedicines(updatedMedicines);
    localStorage.setItem('scheduledMedicines', JSON.stringify(updatedMedicines));
  };

  const handleDeleteMedicine = (index: number) => {
    const updatedMedicines = scheduledMedicines.filter((_, i) => i !== index);
    setScheduledMedicines(updatedMedicines);
    localStorage.setItem('scheduledMedicines', JSON.stringify(updatedMedicines));
    
    toast({
      title: "Medicine Removed",
      description: "The scheduled medicine has been removed",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
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

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="control">Control Panel</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="control" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-2 flex flex-col space-y-4 justify-center">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-lg font-medium mb-2 text-center">Drawer 1</h3>
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
                    <div className="mt-4">
                      <MedicineScheduler onSchedule={handleScheduleMedicine} />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-lg font-medium mb-2 text-center">Drawer 2</h3>
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

              <div className="md:col-span-8">
                <Card className="h-full">
                  <CardContent className="p-4 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-medium">Camera Feed</h3>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={reloadCamera}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reload
                      </Button>
                    </div>
                    <div className="relative bg-black rounded-md flex-grow min-h-[300px] overflow-hidden">
                      <CameraFeed
                        cameraUrl={settings.cameraUrl}
                        onError={() => setCameraLoading(false)}
                        onUrlChange={handleCameraUrlChange}
                      />
                    </div>
                    
                    <div className="mt-4 flex justify-center">
                      <JoystickControl onMove={sendMotorCommand} />
                    </div>
                  </CardContent>
                </Card>
              </div>

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
                
                <Card>
                  <CardContent className="p-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full flex items-center gap-2">
                          <List className="h-4 w-4" />
                          Scheduled Medicines
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Scheduled Medicines</DialogTitle>
                        </DialogHeader>
                        {scheduledMedicines.length === 0 ? (
                          <p className="text-center text-muted-foreground py-4">No medicines scheduled</p>
                        ) : (
                          <div className="space-y-2 max-h-[60vh] overflow-auto">
                            {scheduledMedicines.map((med, index) => (
                              <div key={index} className="flex justify-between items-center p-2 border rounded-md">
                                <div>
                                  <p className="font-medium">{med.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                   {med.time} | {med.drawer === 'drawer1' ? 'Drawer 1' : 'Drawer 2'}
                                  </p>
                                </div>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleDeleteMedicine(index)}
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

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
                      placeholder="http://192.168.1.100:8080"
                    />
                    <div className="mt-2 text-xs space-y-2">
                      <p className="text-amber-600 font-medium">IP Webcam Setup:</p>
                      <ol className="list-decimal pl-5 space-y-1 text-gray-600">
                        <li>Install "IP Webcam" app from Play Store</li>
                        <li>Open app and tap "Start server"</li>
                        <li>Look for IPv4 address (e.g., http://192.168.1.100:8080)</li>
                        <li>Enter ONLY the base URL (without /video or /browser.html)</li>
                        <li>Make sure phone and computer are on same WiFi</li>
                      </ol>
                      <div className="mt-2 p-2 bg-gray-100 rounded">
                        <p className="font-medium">Example URLs:</p>
                        <ul className="list-disc pl-5 mt-1">
                          <li>✅ http://192.168.1.100:8080</li>
                          <li>❌ http://192.168.1.100:8080/video</li>
                          <li>❌ http://192.168.1.100:8080/browser.html</li>
                        </ul>
                      </div>
                    </div>
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

      <footer className="bg-gray-50 py-4 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          MedPilot Control Interface | v1.0
        </div>
      </footer>
    </div>
  );
};

export default Index;
