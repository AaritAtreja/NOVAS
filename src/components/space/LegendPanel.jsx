import React from 'react';
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function LegendPanel() {
  const items = [
    { color: 'bg-cyan-400', label: 'Satellite', type: 'satellite' },
    { color: 'bg-orange-400', label: 'Space Debris', type: 'debris' },
    { color: 'bg-purple-400', label: 'Rocket Body', type: 'rocket_body' },
    { color: 'bg-yellow-400', label: 'Asteroid', type: 'asteroid' },
    { color: 'bg-red-500', label: 'Critical Threat', type: 'threat' },
    { color: 'bg-green-400', label: 'User Satellite', type: 'user' },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="border-[#6366f1]/30">
          <Info className="w-4 h-4 mr-2" />
          Legend
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-[#0a0e27]/95 border-[#6366f1]/30">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-[#e0e7ff] mb-3">Object Classification</h4>
          {items.map((item) => (
            <div key={item.type} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${item.color}`} />
              <span className="text-xs text-gray-300">{item.label}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}