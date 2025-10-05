
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";

export default function ApproachVisualization({ threats, spaceObjects, onObjectClick }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const debrisObjectsRef = useRef([]);
  const satelliteRef = useRef(null);
  const linesRef = useRef([]);

  useEffect(() => {
    if (!mountRef.current) return;
    
    const currentMount = mountRef.current;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x333333, 0.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(8, 3, 5);
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x4466ff, 0.3);
    fillLight.position.set(-5, 0, -2);
    scene.add(fillLight);

    // Create realistic Earth (centered)
    const earthGeometry = new THREE.SphereGeometry(2, 64, 64);
    
    // Create detailed earth texture with accurate continents
    const canvas = document.createElement('canvas');
    canvas.width = 4096;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    
    // Ocean base
    const oceanGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    oceanGradient.addColorStop(0, '#1a5f8f');
    oceanGradient.addColorStop(0.5, '#0d3d5c');
    oceanGradient.addColorStop(1, '#1a5f8f');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw accurate continents
    ctx.fillStyle = '#2d5a2d';
    
    // North America
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.18, canvas.height * 0.35, 350, 400, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // South America
    ctx.fillStyle = '#3d6a3d';
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.25, canvas.height * 0.6, 200, 350, 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Europe
    ctx.fillStyle = '#3d6a3d';
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.52, canvas.height * 0.28, 180, 150, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Africa
    ctx.fillStyle = '#4a6b2d';
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.52, canvas.height * 0.5, 280, 400, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Asia
    ctx.fillStyle = '#2d5a2d';
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.68, canvas.height * 0.32, 500, 350, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Australia
    ctx.fillStyle = '#4a6b2d';
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.8, canvas.height * 0.68, 180, 150, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Antarctica
    ctx.fillStyle = '#e8f4f8';
    ctx.fillRect(0, canvas.height * 0.88, canvas.width, canvas.height * 0.12);
    
    // Arctic
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.08);
    
    // Add clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = 20 + Math.random() * 80;
      ctx.globalAlpha = 0.2 + Math.random() * 0.2;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    
    const texture = new THREE.CanvasTexture(canvas);
    
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: texture,
      shininess: 20,
      specular: new THREE.Color(0x333333)
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.position.set(0, 0, 0); // Centered
    scene.add(earth);

    // Add realistic atmosphere
    const atmosphereGeometry = new THREE.SphereGeometry(2.1, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.5 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.3, 0.5, 1.0, 1.0) * intensity;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    atmosphere.position.set(0, 0, 0);
    scene.add(atmosphere);

    // Create orbital path
    const orbitGeometry = new THREE.RingGeometry(3.2, 3.22, 128);
    const orbitMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3
    });
    const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
    orbit.rotation.x = Math.PI / 2;
    orbit.position.set(0, 0, 0);
    scene.add(orbit);

    // User satellite in orbit
    const satGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.4);
    const satMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 0.3
    });
    const satellite = new THREE.Mesh(satGeometry, satMaterial);
    satelliteRef.current = satellite;
    scene.add(satellite);

    // Add solar panels
    const panelGeometry = new THREE.BoxGeometry(0.5, 0.05, 0.3);
    const panelMaterial = new THREE.MeshPhongMaterial({ color: 0x1a5f8f });
    const panel1 = new THREE.Mesh(panelGeometry, panelMaterial);
    panel1.position.x = 0.35;
    satellite.add(panel1);
    const panel2 = new THREE.Mesh(panelGeometry, panelMaterial);
    panel2.position.x = -0.35;
    satellite.add(panel2);

    // Mouse interaction for clicking objects
    const handleClick = (event) => {
      const rect = currentMount.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(debrisObjectsRef.current);
      if (intersects.length > 0 && intersects[0].object.userData.threat) {
        if (onObjectClick) {
          onObjectClick(intersects[0].object.userData.threat);
        }
      }
    };

    currentMount.addEventListener('click', handleClick);

    // Animation
    let animationId;
    let orbitAngle = 0;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Rotate earth slowly
      earth.rotation.y += 0.001;
      atmosphere.rotation.y += 0.001;

      // Satellite orbit - moves faster
      orbitAngle += 0.015;
      if (satelliteRef.current) {
        satelliteRef.current.position.x = Math.cos(orbitAngle) * 3.2;
        satelliteRef.current.position.z = Math.sin(orbitAngle) * 3.2;
        satelliteRef.current.rotation.y += 0.02;
      }

      // Update debris to orbit realistically
      debrisObjectsRef.current.forEach(debris => {
        if (!debris.userData || !satelliteRef.current) return;
        
        // Move debris in its orbit
        debris.userData.angle += debris.userData.speed;
        const angle = debris.userData.angle;
        const orbitRadius = debris.userData.orbitRadius;
        const inclination = debris.userData.inclination;
        
        debris.position.x = Math.cos(angle) * orbitRadius * Math.cos(inclination);
        debris.position.y = Math.sin(inclination) * orbitRadius * 0.5;
        debris.position.z = Math.sin(angle) * orbitRadius;
        
        // Rotate debris
        debris.rotation.x += 0.02;
        debris.rotation.y += 0.03;
      });

      // Update lines smoothly
      linesRef.current.forEach((lineData) => {
        if (!lineData || !lineData.line || !lineData.debris || !satelliteRef.current) return;
        
        const positions = lineData.line.geometry.attributes.position.array;
        positions[0] = lineData.debris.position.x;
        positions[1] = lineData.debris.position.y;
        positions[2] = lineData.debris.position.z;
        positions[3] = satelliteRef.current.position.x;
        positions[4] = satelliteRef.current.position.y;
        positions[5] = satelliteRef.current.position.z;
        lineData.line.geometry.attributes.position.needsUpdate = true;
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
      currentMount.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationId);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [onObjectClick]);

  // Update debris objects based on threats
  useEffect(() => {
    if (!sceneRef.current || !satelliteRef.current) return;

    // Remove all existing debris and lines
    debrisObjectsRef.current.forEach(debris => {
      sceneRef.current.remove(debris);
    });
    linesRef.current.forEach(lineData => {
      if (lineData && lineData.line) {
        sceneRef.current.remove(lineData.line);
      }
    });
    
    // Clear the arrays
    debrisObjectsRef.current = [];
    linesRef.current = [];

    // Add smooth-moving debris for top threats
    threats.slice(0, 5).forEach((threat, index) => {
      const geometry = new THREE.SphereGeometry(0.12, 16, 16);
      const material = new THREE.MeshPhongMaterial({ 
        color: threat.threat_level === 'critical' ? 0xff0000 : 0xff6600,
        emissive: threat.threat_level === 'critical' ? 0x660000 : 0x663300,
        emissiveIntensity: 0.5
      });
      const debris = new THREE.Mesh(geometry, material);
      
      // Position based on threat's actual orbital position
      const initialAngle = (index / 5) * Math.PI * 2; // Distribute them initially around the orbit
      const orbitBaseRadius = 3.2; // Satellite's orbit base radius
      const threatAltitudeScaled = (threat.altitude || 400) / 1000 * 0.1; // Scale altitude to scene units
      const orbitRadius = orbitBaseRadius + threatAltitudeScaled + (index * 0.05); // Add small offset for visual separation
      
      const inclination = (threat.inclination || 0) * Math.PI / 180; // Convert degrees to radians
      
      debris.position.set(
        Math.cos(initialAngle) * orbitRadius * Math.cos(inclination),
        Math.sin(inclination) * orbitRadius * 0.5, // Simulate y-component due to inclination
        Math.sin(initialAngle) * orbitRadius
      );
      
      // Store threat data and movement parameters
      debris.userData = { 
        threat: threat,
        id: threat.id,
        angle: initialAngle, // Store the current angle for animation
        orbitRadius: orbitRadius,
        inclination: inclination,
        // Speed based on altitude: higher altitude -> slower speed
        speed: 0.005 + (1 / ((threat.altitude || 400) / 1000)) * 0.005
      };
      
      debrisObjectsRef.current.push(debris);
      sceneRef.current.add(debris);

      // Add collision warning line
      if (threat.threat_level === 'critical' || threat.threat_level === 'high') {
        const linePoints = [];
        linePoints.push(debris.position.clone());
        linePoints.push(satelliteRef.current.position.clone());
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
        const lineMaterial = new THREE.LineBasicMaterial({ 
          color: threat.threat_level === 'critical' ? 0xff0000 : 0xff6600,
          transparent: true,
          opacity: 0.6
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        linesRef.current.push({ line, debris, threat }); // Store line, associated debris, and threat
        sceneRef.current.add(line);
      }
    });
  }, [threats]);

  return (
    <Card className="bg-[#0a0e27]/90 border-[#6366f1]/30 backdrop-blur-xl">
      <CardHeader className="border-b border-[#6366f1]/20">
        <CardTitle className="flex items-center gap-2 text-[#e0e7ff] font-light tracking-wide">
          <Target className="w-5 h-5 text-[#6366f1]" />
          ORBITAL COLLISION VIEW
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          ref={mountRef}
          style={{ width: '100%', height: '350px', cursor: 'pointer' }} 
        />
      </CardContent>
    </Card>
  );
}
