import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ThreatPanel({ threats, onThreatClick }) {
  const getThreatColor = (level) => {
    switch(level) {
      case 'critical': return 'bg-red-500/20 border-red-500 text-red-400';
      case 'high': return 'bg-orange-500/20 border-orange-500 text-orange-400';
      case 'medium': return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      default: return 'bg-blue-500/20 border-blue-500 text-blue-400';
    }
  };

  return (
    <Card className="bg-[#0a0e27]/90 border-[#6366f1]/30 backdrop-blur-xl">
      <CardHeader className="border-b border-[#6366f1]/20 pb-3">
        <CardTitle className="flex items-center gap-2 text-[#e0e7ff] font-light tracking-wide text-sm">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          THREAT ANALYSIS
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="space-y-2">
          {threats.length === 0 ? (
            <div className="text-center py-4 text-gray-400 text-sm">
              No immediate threats detected
            </div>
          ) : (
            threats.map((threat, index) => (
              <div
                key={threat.id}
                onClick={() => onThreatClick(threat)}
                className={`p-2 rounded-lg border cursor-pointer transition-all hover:scale-[1.01] ${getThreatColor(threat.threat_level)}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">#{index + 1}</span>
                    <span className="font-semibold text-sm">{threat.name}</span>
                  </div>
                  <Badge variant="outline" className="border-current text-xs py-0">
                    {threat.threat_level?.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 opacity-70" />
                    <span className="font-mono">
                      {threat.time_to_impact?.toFixed(1)}h
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Gauge className="w-3 h-3 opacity-70" />
                    <span className="font-mono">
                      {threat.velocity?.toFixed(1)} km/s
                    </span>
                  </div>
                </div>

                <div className="mt-1.5 pt-1.5 border-t border-current/20">
                  <div className="flex items-center justify-between text-xs">
                    <span className="opacity-70">Probability</span>
                    <span className="font-mono font-semibold">
                      {(threat.collision_probability * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1 h-1 bg-black/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-current transition-all"
                      style={{ width: `${threat.collision_probability * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}