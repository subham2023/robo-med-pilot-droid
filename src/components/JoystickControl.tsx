
import React, { useState, useRef, useEffect } from 'react';
import { cn } from "@/lib/utils";

interface JoystickControlProps {
  onMove: (direction: string) => void;
  size?: number;
}

const JoystickControl: React.FC<JoystickControlProps> = ({ 
  onMove,
  size = 150
}) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [lastDirection, setLastDirection] = useState<string>("stop");
  
  // Dimensions and positions
  const knobSize = size / 3;
  const maxDistance = (size - knobSize) / 2;
  
  // Handle interactions
  const handleStart = (clientX: number, clientY: number) => {
    if (!joystickRef.current || !knobRef.current) return;
    
    setActive(true);
    
    const rect = joystickRef.current.getBoundingClientRect();
    moveKnob(clientX - rect.left, clientY - rect.top);
  };
  
  const handleMove = (clientX: number, clientY: number) => {
    if (!active || !joystickRef.current || !knobRef.current) return;
    
    const rect = joystickRef.current.getBoundingClientRect();
    moveKnob(clientX - rect.left, clientY - rect.top);
  };
  
  const handleEnd = () => {
    if (!active) return;
    
    setActive(false);
    resetKnob();
    onMove("stop");
    setLastDirection("stop");
  };
  
  // Calculate knob position and send direction
  const moveKnob = (x: number, y: number) => {
    if (!knobRef.current || !joystickRef.current) return;
    
    const centerX = size / 2;
    const centerY = size / 2;
    
    // Calculate distance from center
    let deltaX = x - centerX;
    let deltaY = y - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Normalize if distance exceeds max
    if (distance > maxDistance) {
      deltaX = (deltaX / distance) * maxDistance;
      deltaY = (deltaY / distance) * maxDistance;
    }
    
    // Position the knob
    knobRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    
    // Determine direction based on angle
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    let direction = "stop";
    
    // Use 45-degree sectors for cardinal directions
    if (distance > maxDistance * 0.3) {
      if (angle > -45 && angle <= 45) direction = "right";
      else if (angle > 45 && angle <= 135) direction = "down";
      else if (angle > 135 || angle <= -135) direction = "left";
      else if (angle > -135 && angle <= -45) direction = "up";
    }
    
    // Only send command if direction changes
    if (direction !== lastDirection) {
      onMove(direction);
      setLastDirection(direction);
    }
  };
  
  // Reset knob position
  const resetKnob = () => {
    if (knobRef.current) {
      knobRef.current.style.transform = "translate(0px, 0px)";
    }
  };
  
  // Event handlers for different inputs
  useEffect(() => {
    const touchStartHandler = (e: TouchEvent) => {
      e.preventDefault();
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    };
    
    const touchMoveHandler = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    
    const touchEndHandler = () => handleEnd();
    
    const mouseDownHandler = (e: MouseEvent) => {
      e.preventDefault();
      handleStart(e.clientX, e.clientY);
    };
    
    const mouseMoveHandler = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };
    
    const mouseUpHandler = () => handleEnd();
    
    const joystick = joystickRef.current;
    if (joystick) {
      // Touch events
      joystick.addEventListener("touchstart", touchStartHandler);
      window.addEventListener("touchmove", touchMoveHandler);
      window.addEventListener("touchend", touchEndHandler);
      
      // Mouse events
      joystick.addEventListener("mousedown", mouseDownHandler);
      window.addEventListener("mousemove", mouseMoveHandler);
      window.addEventListener("mouseup", mouseUpHandler);
    }
    
    return () => {
      if (joystick) {
        // Clean up touch events
        joystick.removeEventListener("touchstart", touchStartHandler);
        window.removeEventListener("touchmove", touchMoveHandler);
        window.removeEventListener("touchend", touchEndHandler);
        
        // Clean up mouse events
        joystick.removeEventListener("mousedown", mouseDownHandler);
        window.removeEventListener("mousemove", mouseMoveHandler);
        window.removeEventListener("mouseup", mouseUpHandler);
      }
    };
  }, [active]);
  
  return (
    <div 
      ref={joystickRef}
      className={cn(
        "relative rounded-full bg-gray-200 border-4 border-gray-300 cursor-pointer touch-none",
        active && "border-cyan-500"
      )}
      style={{ width: size, height: size }}
    >
      {/* Direction indicators */}
      <div className="absolute inset-2 pointer-events-none">
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 text-gray-400">↑</div>
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-gray-400">↓</div>
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 text-gray-400">←</div>
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 text-gray-400">→</div>
      </div>
      
      {/* Joystick knob */}
      <div 
        ref={knobRef}
        className={cn(
          "absolute rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md transition-colors",
          active && "from-cyan-600 to-blue-700"
        )}
        style={{
          width: knobSize,
          height: knobSize,
          top: `calc(50% - ${knobSize / 2}px)`,
          left: `calc(50% - ${knobSize / 2}px)`,
        }}
      />
    </div>
  );
};

export default JoystickControl;
