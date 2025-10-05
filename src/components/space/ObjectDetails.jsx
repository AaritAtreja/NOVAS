import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Satellite, Rocket, AlertCircle, Info, Target, Clock, Ruler, Orbit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ObjectDetails({ object, onClose, onDeploy }) {
  if (!object) return null;

  const getIcon = () => {
    switch(object.object_type) {
      case 'satellite': return <Satellite className="w-5 h-5" />;
      case 'rocket_body': return <Rocket className="w-5 h-5" />;
      case 'debris': return <AlertCircle className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getTypeColor = () => {
    switch(object.object_type) {
      case 'satellite': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500';
      case 'rocket_body': return 'bg-purple-500/20 text-purple-400 border-purple-500';
      case 'debris': return 'bg-orange-500/20 text-orange-400 border-orange-500';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500';
    }
  };

  // Estimate size based on object type
  const getEstimatedSize = () => {
    if (object.size) return object.size.toFixed(1);
    
    switch(object.object_type) {
      case 'satellite': return (5 + Math.random() * 10).toFixed(1);
      case 'rocket_body': return (3 + Math.random() * 8).toFixed(1);
      case 'debris': return (0.1 + Math.random() * 2).toFixed(1);
      default: return '1.0';
    }
  };

  return (
    <Card className="bg-[#0a0e27]/95 border-[#6366f1]/30 backdrop-blur-xl">
      <CardHeader className="border-b border-[#6366f1]/20">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[#e0e7ff] font-light tracking-wide">
            <Target className="w-5 h-5 text-[#6366f1]" />
            OBJECT INFORMATION
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-semibold text-white mb-2">{object.name}</h3>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className={`${getTypeColor()} border`}>
                {getIcon()}
                <span className="ml-2">{object.object_type?.toUpperCase().replace('_', ' ')}</span>
              </Badge>
              {object.norad_cat_id && (
                <Badge variant="outline" className="border-[#6366f1]/30 text-gray-300">
                  ID: {object.norad_cat_id}
                </Badge>
              )}
            </div>
          </div>

          {/* Orbital Parameters */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[#6366f1] flex items-center gap-2">
              <Orbit className="w-4 h-4" />
              ORBITAL PARAMETERS
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/20">
                <div className="text-xs text-gray-400 mb-1">ALTITUDE</div>
                <div className="text-lg font-mono text-white">{object.altitude?.toFixed(1) || 'N/A'} km</div>
              </div>
              
              <div className="p-3 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/20">
                <div className="text-xs text-gray-400 mb-1">VELOCITY</div>
                <div className="text-lg font-mono text-white">{object.velocity?.toFixed(2) || 'N/A'} km/s</div>
              </div>

              <div className="p-3 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/20">
                <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  PERIOD
                </div>
                <div className="text-lg font-mono text-white">{object.period?.toFixed(1) || 'N/A'} min</div>
              </div>

              <div className="p-3 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/20">
                <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                  <Ruler className="w-3 h-3" />
                  EST. SIZE
                </div>
                <div className="text-lg font-mono text-white">{getEstimatedSize()} m</div>
              </div>
            </div>
          </div>

          {/* Additional Orbital Data */}
          <div className="p-4 rounded-lg bg-black/30 border border-[#6366f1]/10">
            <div className="text-xs text-gray-400 mb-3">ORBITAL ELEMENTS</div>
            <div className="grid grid-cols-2 gap-3 font-mono text-sm text-white">
              <div>
                <span className="text-gray-400">Inclination:</span> {object.inclination?.toFixed(2) || 'N/A'}°
              </div>
              <div>
                <span className="text-gray-400">Eccentricity:</span> {object.eccentricity?.toFixed(4) || 'N/A'}
              </div>
              <div>
                <span className="text-gray-400">Apoapsis:</span> {object.apoapsis?.toFixed(1) || 'N/A'} km
              </div>
              <div>
                <span className="text-gray-400">Periapsis:</span> {object.periapsis?.toFixed(1) || 'N/A'} km
              </div>
            </div>
          </div>

          {/* Current Position */}
          <div className="p-4 rounded-lg bg-black/30 border border-[#6366f1]/10">
            <div className="text-xs text-gray-400 mb-2">CURRENT POSITION</div>
            <div className="grid grid-cols-2 gap-3 font-mono text-sm text-white">
              <div>
                <span className="text-gray-400">LAT:</span> {object.latitude?.toFixed(4) || 'N/A'}°
              </div>
              <div>
                <span className="text-gray-400">LON:</span> {object.longitude?.toFixed(4) || 'N/A'}°
              </div>
            </div>
          </div>

          {/* Threat Information */}
          {object.threat_level && object.threat_level !== 'none' && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold text-red-400">THREAT DETECTED</span>
              </div>
              <div className="text-sm text-gray-300 space-y-1">
                <div>Level: <span className="text-red-400 font-mono">{object.threat_level?.toUpperCase()}</span></div>
                {object.time_to_impact && (
                  <div>Impact in: <span className="text-red-400 font-mono">{object.time_to_impact.toFixed(1)}h</span></div>
                )}
                {object.collision_probability && (
                  <div>Probability: <span className="text-red-400 font-mono">{(object.collision_probability * 100).toFixed(1)}%</span></div>
                )}
              </div>
              
              {onDeploy && (
                <Button
                  onClick={() => onDeploy(object)}
                  className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white"
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  Deploy Interceptor
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}