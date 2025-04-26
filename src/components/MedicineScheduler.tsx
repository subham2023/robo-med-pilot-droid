
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
import { Clock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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
      description: `${medicine.name} scheduled for ${medicine.time}`,
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
          <SheetTitle>Schedule Medicine</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Medicine Name</label>
            <Input
              value={medicine.name}
              onChange={(e) => setMedicine({ ...medicine, name: e.target.value })}
              placeholder="Enter medicine name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Select Drawer</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={medicine.drawer}
              onChange={(e) => setMedicine({ ...medicine, drawer: e.target.value as 'drawer1' | 'drawer2' })}
            >
              <option value="drawer1">Left Drawer</option>
              <option value="drawer2">Right Drawer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Time</label>
            <Input
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
