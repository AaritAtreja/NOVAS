
import React, { useState, useEffect } from 'react';
import { SpaceObject, InterceptorAction } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Info, Target } from "lucide-react";

import EarthGlobe from '../components/space/EarthGlobe';
import ThreatPanel from '../components/space/ThreatPanel';
import ObjectDetails from '../components/space/ObjectDetails';
import AIAssistant from '../components/space/AIAssistant';
import ApproachVisualization from '../components/space/ApproachVisualization';
import CameraFeed from '../components/space/CameraFeed';
import LegendPanel from '../components/space/LegendPanel';
import InterceptorStatus from '../components/space/InterceptorStatus';

export default function SpaceDefense() {
  const [spaceObjects, setSpaceObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [interceptors, setInterceptors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const userSatellite = {
    name: "NOVA-SAT-01",
    altitude: 550,
    velocity: 7.5,
    latitude: 0,
    longitude: 0
  };

  // Calculate position from orbital elements
  const calculatePosition = (obj, elapsedSeconds = 0) => {
    if (!obj.mean_motion || !obj.semimajor_axis) {
      return { latitude: 0, longitude: 0, altitude: 500, velocity: 7.5 };
    }

    const earthRadius = 6371;
    const angularVelocity = (obj.mean_motion * 360) / 86400;
    
    const newMeanAnomaly = ((obj.mean_anomaly || 0) + angularVelocity * elapsedSeconds) % 360;
    
    const inclination = (obj.inclination || 0) * Math.PI / 180;
    const raan = (obj.ra_of_asc_node || 0) * Math.PI / 180;
    const argPerigee = (obj.arg_of_pericenter || 0) * Math.PI / 180;
    const trueAnomaly = newMeanAnomaly * Math.PI / 180;
    
    const r = obj.semimajor_axis;
    
    const x = r * (Math.cos(raan) * Math.cos(argPerigee + trueAnomaly) - 
                   Math.sin(raan) * Math.sin(argPerigee + trueAnomaly) * Math.cos(inclination));
    const y = r * (Math.sin(raan) * Math.cos(argPerigee + trueAnomaly) + 
                   Math.cos(raan) * Math.sin(argPerigee + trueAnomaly) * Math.cos(inclination));
    const z = r * Math.sin(inclination) * Math.sin(argPerigee + trueAnomaly);
    
    const currentRadius = Math.sqrt(x*x + y*y + z*z);
    const altitude = currentRadius - earthRadius;
    const latitude = Math.asin(z / currentRadius) * 180 / Math.PI;
    const longitude = Math.atan2(y, x) * 180 / Math.PI;
    const velocity = (obj.mean_motion * 2 * Math.PI * r) / (24 * 3600);
    
    return { latitude, longitude, altitude, velocity };
  };

  // Calculate threat level
  const assessThreat = (obj, userSat) => {
    const altDiff = Math.abs((obj.altitude || 0) - userSat.altitude);
    const latDiff = Math.abs((obj.latitude || 0) - userSat.latitude);
    const lonDiff = Math.abs((obj.longitude || 0) - userSat.longitude);
    
    const distance = Math.sqrt(altDiff**2 + latDiff**2 + lonDiff**2);
    
    if (distance < 50) {
      return { level: 'critical', prob: 0.1 + Math.random() * 0.05, time: 2 + Math.random() * 4 };
    } else if (distance < 100) {
      return { level: 'high', prob: 0.05 + Math.random() * 0.05, time: 6 + Math.random() * 6 };
    } else if (distance < 200) {
      return { level: 'medium', prob: 0.02 + Math.random() * 0.03, time: 12 + Math.random() * 12 };
    } else if (distance < 300) {
      return { level: 'low', prob: 0.01 + Math.random() * 0.01, time: 24 + Math.random() * 24 };
    }
    return { level: 'none', prob: 0, time: null };
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    
    let startTime = Date.now();
    
    const moveInterval = setInterval(() => {
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      
      setSpaceObjects(prev => prev.map(obj => {
        const position = calculatePosition(obj, elapsedSeconds);
        const threat = assessThreat({ ...obj, ...position }, userSatellite);
        
        return {
          ...obj,
          ...position,
          threat_level: threat.level,
          collision_probability: threat.prob,
          time_to_impact: threat.time
        };
      }));
    }, 1000);
    
    return () => {
      clearInterval(interval);
      clearInterval(moveInterval);
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const objects = await SpaceObject.list('-threat_level', 100);
    
    const objectsWithPositions = objects.map(obj => {
      const position = calculatePosition(obj, 0);
      const threat = assessThreat({ ...obj, ...position }, userSatellite);
      
      return { 
        ...obj, 
        ...position,
        threat_level: threat.level,
        collision_probability: threat.prob,
        time_to_impact: threat.time
      };
    });
    
    setSpaceObjects(objectsWithPositions);

    const activeInterceptors = await InterceptorAction.list('-created_date');
    setInterceptors(activeInterceptors);

    setIsLoading(false);
  };

  const threats = spaceObjects
    .filter((obj) => obj.threat_level && obj.threat_level !== 'none')
    .sort((a, b) => {
      const threatOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return threatOrder[a.threat_level] - threatOrder[b.threat_level];
    })
    .slice(0, 5);

  const handleDeployInterceptor = async (target) => {
    await InterceptorAction.create({
      target_object_id: target.id,
      target_name: target.name,
      deployment_time: new Date().toISOString(),
      status: 'deployed',
      distance_to_target: Math.abs(target.altitude - userSatellite.altitude),
      estimated_intercept_time: target.time_to_impact * 60
    });

    await loadData();
    setSelectedObject(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0a0e27] to-[#1e1b4b] text-white p-4">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-5xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#6366f1] via-[#a855f7] to-[#ec4899] mb-2">
                N O V A
              </h1>
              <p className="text-gray-400 font-light">Novel Orbital Visualization & Analysis System</p>
            </div>
            <Button
              onClick={loadData}
              variant="outline"
              className="border-[#6366f1]/50 text-[#6366f1] hover:bg-[#6366f1]/10"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>

          <div className="flex gap-4 text-sm flex-wrap">
            <div className="px-4 py-2 bg-[#6366f1]/10 border border-[#6366f1]/30 rounded-lg">
              <span className="text-gray-400">Tracked Objects:</span>
              <span className="ml-2 font-mono text-[#6366f1] font-semibold">{spaceObjects.length}</span>
            </div>
            <div className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
              <span className="text-gray-400">Active Threats:</span>
              <span className="ml-2 font-mono text-red-400 font-semibold">{threats.length}</span>
            </div>
            <div className="px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
              <span className="text-gray-400">Interceptors:</span>
              <span className="ml-2 font-mono text-green-400 font-semibold">{interceptors.length}</span>
            </div>
            <div className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <span className="text-gray-400">NOVA Status:</span>
              <span className="ml-2 font-mono text-purple-400 font-semibold">ONLINE</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="bg-[#0a0e27]/90 border border-[#6366f1]/30 backdrop-blur-xl rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-light tracking-wide text-[#e0e7ff]">
                  ORBITAL VIEW
                </h2>
                <LegendPanel />
              </div>
              <div style={{ height: '350px', width: '100%' }}>
                <EarthGlobe
                  spaceObjects={spaceObjects}
                  onObjectClick={setSelectedObject}
                  userSatellite={userSatellite}
                  threatObjects={threats}
                />
              </div>
            </div>

            <ThreatPanel
              threats={threats}
              onThreatClick={setSelectedObject}
            />

            <ApproachVisualization
              threats={threats}
              spaceObjects={spaceObjects}
              onObjectClick={setSelectedObject}
            />

            <CameraFeed threats={threats} onObjectClick={setSelectedObject} />
          </div>

          <div className="space-y-4">
            {selectedObject ? (
              <ObjectDetails
                object={selectedObject}
                onClose={() => setSelectedObject(null)}
                onDeploy={handleDeployInterceptor}
              />
            ) : (
              <Card className="bg-[#0a0e27]/90 border-[#6366f1]/30 backdrop-blur-xl">
                <CardHeader className="border-b border-[#6366f1]/20">
                  <CardTitle className="flex items-center gap-2 text-[#e0e7ff] font-light tracking-wide">
                    <Info className="w-5 h-5 text-[#6366f1]" />
                    OBJECT INFORMATION
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center py-12 text-gray-400">
                    <Target className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg mb-2">No Object Selected</p>
                    <p className="text-sm">Click on any object in the orbital views to see details</p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <InterceptorStatus interceptors={interceptors} onRefresh={loadData} />
            
            <AIAssistant threats={threats} spaceObjects={spaceObjects} />
          </div>
        </div>
      </div>
    </div>
  );
}
