import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, AlertTriangle, Send, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import * as THREE from 'three';

export default function CameraFeed({ threats, onObjectClick }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const [detectedObject, setDetectedObject] = useState(null);
  const [showNewObjectAlert, setShowNewObjectAlert] = useState(false);
  const [newObjectData, setNewObjectData] = useState(null);
  const detectionIntervalRef = useRef(null);

  // 3D debris visualization
  useEffect(() => {
    if (!mountRef.current) return;
    
    const currentMount = mountRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    currentMount.appendChild(renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Create debris object
    const debrisGeometry = new THREE.IcosahedronGeometry(0.5, 1);
    const debrisMaterial = new THREE.MeshPhongMaterial({
      color: 0xff6600,
      emissive: 0x331100,
      specular: 0x666666,
      shininess: 30
    });
    const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
    debris.position.z = -3;
    scene.add(debris);

    // Add smaller debris pieces
    for (let i = 0; i < 5; i++) {
      const smallDebris = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.1 + Math.random() * 0.2),
        new THREE.MeshPhongMaterial({
          color: Math.random() > 0.5 ? 0x999999 : 0xff6600,
          emissive: 0x111111
        })
      );
      smallDebris.position.set(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 3,
        -2 - Math.random() * 2
      );
      scene.add(smallDebris);
    }

    // Stars background
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < 200; i++) {
      starVertices.push(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100
      );
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Animation
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      debris.rotation.x += 0.01;
      debris.rotation.y += 0.015;
      debris.position.z += 0.01;
      
      if (debris.position.z > 2) {
        debris.position.z = -5;
      }
      
      scene.children.forEach(child => {
        if (child.geometry && child.geometry.type === 'DodecahedronGeometry') {
          child.rotation.x += 0.02;
          child.rotation.y += 0.01;
        }
      });
      
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!currentMount) return;
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const generateSafeObject = () => {
    // Generate object that's NOT on collision path (far from satellite)
    const objectTypes = ['satellite', 'debris', 'rocket_body'];
    const randomType = objectTypes[Math.floor(Math.random() * objectTypes.length)];
    
    // Generate altitude far from user satellite (550km)
    // Either much higher (800-1200km) or much lower (200-400km)
    const highOrLow = Math.random() > 0.5;
    const altitude = highOrLow ? 800 + Math.random() * 400 : 200 + Math.random() * 200;
    
    return {
      name: `OBJ-${Math.floor(Math.random() * 100000)}`,
      object_type: randomType,
      altitude: altitude,
      velocity: 6 + Math.random() * 3,
      latitude: -80 + Math.random() * 160, // Random latitude
      longitude: -180 + Math.random() * 360, // Random longitude
      threat_level: 'none',
      norad_cat_id: `${40000 + Math.floor(Math.random() * 50000)}`,
      period: 90 + Math.random() * 30,
      size: randomType === 'debris' ? 0.1 + Math.random() * 2 : 3 + Math.random() * 8
    };
  };

  const startDetectionCycle = () => {
    const detectNextObject = () => {
      const randomDelay = 20000 + Math.random() * 10000; // Random 20-30 seconds
      
      detectionIntervalRef.current = setTimeout(() => {
        // Generate a safe object that's not a threat
        const safeObject = generateSafeObject();
        setDetectedObject(safeObject);
        
        // 30% chance to trigger new object detection
        if (Math.random() < 0.3) {
          setTimeout(() => {
            triggerNewObjectDetection();
          }, 2000);
        }
        
        detectNextObject(); // Schedule next detection
      }, randomDelay);
    };

    // Initial detection
    const initialObject = generateSafeObject();
    setDetectedObject(initialObject);
    
    detectNextObject();
  };

  useEffect(() => {
    startDetectionCycle();

    return () => {
      if (detectionIntervalRef.current) {
        clearTimeout(detectionIntervalRef.current);
      }
    };
  }, []);

  const triggerNewObjectDetection = () => {
    // Generate truly unknown object (not in database)
    const newObj = {
      name: `UNIDENTIFIED-${Math.floor(Math.random() * 10000)}`,
      object_type: 'unknown',
      altitude: 300 + Math.random() * 600, // Random safe altitude
      velocity: 6 + Math.random() * 3,
      size: 0.3 + Math.random() * 4
    };
    setNewObjectData(newObj);
    setShowNewObjectAlert(true);
  };

  const handleReportObject = () => {
    const message = `New unidentified object detected via CV system:\nName: ${newObjectData.name}\nType: Unknown\nAltitude: ${newObjectData.altitude.toFixed(1)} km\nVelocity: ${newObjectData.velocity.toFixed(2)} km/s\nEstimated Size: ${newObjectData.size.toFixed(1)} m\n\nPlease analyze and add to database if necessary.`;
    
    window.dispatchEvent(new CustomEvent('reportObject', { detail: message }));
    
    // Clear everything and wait 30 seconds before resuming
    setShowNewObjectAlert(false);
    setNewObjectData(null);
    setDetectedObject(null);
    
    // Clear existing interval
    if (detectionIntervalRef.current) {
      clearTimeout(detectionIntervalRef.current);
    }
    
    // Wait 30 seconds before resuming detection
    setTimeout(() => {
      startDetectionCycle();
    }, 30000);
  };

  const handleDismissDetection = () => {
    setDetectedObject(null);
    // Don't restart cycle, let it continue naturally
  };

  const handleObjectNameClick = () => {
    if (detectedObject && onObjectClick) {
      onObjectClick(detectedObject);
    }
  };

  const getClassification = () => {
    if (!detectedObject) return null;
    
    const classifications = {
      satellite: { label: 'ACTIVE SATELLITE', color: 'text-cyan-400' },
      debris: { label: 'SPACE DEBRIS', color: 'text-orange-400' },
      rocket_body: { label: 'ROCKET BODY', color: 'text-purple-400' },
      asteroid: { label: 'ASTEROID', color: 'text-yellow-400' },
      unknown: { label: 'UNKNOWN OBJECT', color: 'text-yellow-400' }
    };
    
    return classifications[detectedObject.object_type] || classifications.debris;
  };

  const classification = getClassification();

  return (
    <Card className="bg-[#0a0e27]/90 border-[#6366f1]/30 backdrop-blur-xl">
      <CardHeader className="border-b border-[#6366f1]/20 pb-3">
        <CardTitle className="flex items-center justify-between text-[#e0e7ff] font-light tracking-wide text-sm">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#6366f1]" />
            LIVE CV DETECTION
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-400 font-mono">LIVE</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-black overflow-hidden">
          {/* 3D Space Debris View */}
          <div ref={mountRef} className="absolute inset-0" />

          {/* Detection overlay */}
          {detectedObject && classification && !showNewObjectAlert && (
            <div className="absolute inset-0 z-20">
              {/* Target box with animation */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-2 border-cyan-500 animate-pulse">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-cyan-500" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-cyan-500" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-cyan-500" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-cyan-500" />
              </div>

              {/* Crosshair */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-10 h-0.5 bg-cyan-500 absolute -translate-x-1/2" />
                <div className="h-10 w-0.5 bg-cyan-500 absolute -translate-y-1/2" />
              </div>

              {/* Dismiss button */}
              <div className="absolute top-2 right-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDismissDetection}
                  className="bg-black/50 hover:bg-black/70 text-gray-400 hover:text-white h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Detection info */}
              <div className="absolute bottom-2 left-2 right-2 bg-black/95 p-3 rounded border border-cyan-500/70">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500 text-xs py-0">
                    DETECTED
                  </Badge>
                  <span className={`text-xs font-mono font-bold ${classification.color}`}>
                    {classification.label}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  <div>
                    <div className="text-gray-500 text-xs">TARGET</div>
                    <div 
                      className="text-white font-bold text-xs truncate cursor-pointer hover:text-cyan-400 transition-colors"
                      onClick={handleObjectNameClick}
                      title="Click to view details"
                    >
                      {detectedObject.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">ALT</div>
                    <div className="text-white">{detectedObject.altitude?.toFixed(0)} km</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">VEL</div>
                    <div className="text-white">{detectedObject.velocity?.toFixed(1)} km/s</div>
                  </div>
                </div>
              </div>

              {/* Corner indicators */}
              <div className="absolute top-2 left-2 text-xs font-mono text-green-400 flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                NOVA-CAM
              </div>
            </div>
          )}

          {/* New Object Alert */}
          {showNewObjectAlert && newObjectData && (
            <div className="absolute inset-0 z-30 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-[#0a0e27] border-2 border-yellow-500 rounded-lg p-6 max-w-md">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-6 h-6 text-yellow-400 animate-pulse" />
                  <h3 className="text-lg font-bold text-yellow-400">NEW OBJECT IDENTIFIED</h3>
                </div>
                
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Designation:</span>
                    <span className="text-white font-mono">{newObjectData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type:</span>
                    <span className="text-yellow-400 font-mono">UNKNOWN</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Altitude:</span>
                    <span className="text-white font-mono">{newObjectData.altitude.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Velocity:</span>
                    <span className="text-white font-mono">{newObjectData.velocity.toFixed(2)} km/s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Size:</span>
                    <span className="text-white font-mono">{newObjectData.size.toFixed(1)} m</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleReportObject}
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Report to AI Assistant
                  </Button>
                  <Button
                    onClick={() => {
                      setShowNewObjectAlert(false);
                      setNewObjectData(null);
                    }}
                    variant="outline"
                    className="border-gray-500"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}