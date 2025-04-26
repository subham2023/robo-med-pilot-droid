
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Clock, Pill } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Medicine {
  name: string;
  drawer: 'drawer1' | 'drawer2';
  time: string;
}

const MedicineScheduler = ({ onSchedule }: { onSchedule: (medicine: Medicine) => void }) => {
  const [medicine, setMedicine] = useState<Medicine>({
    name: '',
    drawer: 'drawer1',
    time: '',
  });

  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicine.name || !medicine.time) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    onSchedule(medicine);
    toast({
      title: "Medicine Scheduled",
      description: `${medicine.name} scheduled for ${medicine.time} in ${medicine.drawer === 'drawer1' ? 'Left Drawer' : 'Right Drawer'}`,
    });
    
    // Reset form after successful scheduling
    setMedicine({
      name: '',
      drawer: 'drawer1',
      time: '',
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Clock className="h-4 w-4" />
          Schedule Medicine
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Schedule Medicine
          </SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="medicine-name" className="text-sm font-medium mb-1">Medicine Name</Label>
            <Input
              id="medicine-name"
              value={medicine.name}
              onChange={(e) => setMedicine({ ...medicine, name: e.target.value })}
              placeholder="Enter medicine name"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Drawer</Label>
            <RadioGroup 
              value={medicine.drawer} 
              onValueChange={(value) => setMedicine({ ...medicine, drawer: value as 'drawer1' | 'drawer2' })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="drawer1" id="drawer1" />
                <Label htmlFor="drawer1" className="cursor-pointer">Left Drawer</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="drawer2" id="drawer2" />
                <Label htmlFor="drawer2" className="cursor-pointer">Right Drawer</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div>
            <Label htmlFor="medicine-time" className="text-sm font-medium mb-1">Time</Label>
            <Input
              id="medicine-time"
              type="time"
              value={medicine.time}
              onChange={(e) => setMedicine({ ...medicine, time: e.target.value })}
            />
          </div>
          <Button type="submit" className="w-full">Schedule</Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default MedicineScheduler;
