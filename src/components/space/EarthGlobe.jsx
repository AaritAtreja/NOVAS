
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function EarthGlobe({ spaceObjects, onObjectClick, userSatellite, threatObjects }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const earthRef = useRef(null);
  const markersRef = useRef([]);
  const linesRef = useRef([]);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const mouseDownPosRef = useRef({ x: 0, y: 0 });
  const mouseDownTimeRef = useRef(0);

  useEffect(() => {
    if (!mountRef.current) return;
    
    const currentMount = mountRef.current;
    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(
      45,
      width / height,
      0.1,
      1000
    );
    camera.position.set(0, 0, 3.5); // Adjusted camera position for a wider view
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Enhanced lighting for realism
    const ambientLight = new THREE.AmbientLight(0x333333, 0.5);
    scene.add(ambientLight);
    
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(5, 0, 2);
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x4466ff, 0.3);
    fillLight.position.set(-5, 0, -2);
    scene.add(fillLight);

    // Create hyper-realistic Earth with accurate continents
    const earthGeometry = new THREE.SphereGeometry(1, 128, 128);
    
    // Create detailed earth texture
    const canvas = document.createElement('canvas');
    canvas.width = 4096;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    
    // Deep ocean base
    const oceanGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    oceanGradient.addColorStop(0, '#1a5f8f');
    oceanGradient.addColorStop(0.5, '#0d3d5c');
    oceanGradient.addColorStop(1, '#1a5f8f');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw accurate 7 continents
    ctx.fillStyle = '#2d5a2d';
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.18, canvas.height * 0.35, 350, 400, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#3d6a3d';
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.25, canvas.height * 0.6, 200, 350, 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#3d6a3d';
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.52, canvas.height * 0.28, 180, 150, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#4a6b2d';
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.52, canvas.height * 0.5, 280, 400, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#2d5a2d';
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.68, canvas.height * 0.32, 500, 350, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#4a6b2d';
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.8, canvas.height * 0.68, 180, 150, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#e8f4f8';
    ctx.fillRect(0, canvas.height * 0.88, canvas.width, canvas.height * 0.12);
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.08);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = 15 + Math.random() * 100;
      ctx.globalAlpha = 0.2 + Math.random() * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: texture,
      shininess: 25,
      specular: new THREE.Color(0x333333),
      transparent: false
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.rotation.y = 0;
    earthRef.current = earth;
    scene.add(earth);

    // Add realistic atmosphere glow
    const atmosphereGeometry = new THREE.SphereGeometry(1.02, 128, 128);
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
          float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.3, 0.5, 1.0, 1.0) * intensity;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    // Mouse interaction - FIXED for proper click detection
    const handleMouseDown = (e) => {
      isDraggingRef.current = false;
      mouseDownTimeRef.current = Date.now();
      mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      // Only start dragging if mouse button is held down AND moved significantly
      if (e.buttons !== 1) return; // Not holding left mouse button
      
      const deltaX = Math.abs(e.clientX - mouseDownPosRef.current.x);
      const deltaY = Math.abs(e.clientY - mouseDownPosRef.current.y);
      
      // Require at least 5 pixels of movement to be considered a drag
      if (deltaX > 5 || deltaY > 5) {
        isDraggingRef.current = true;
      }
      
      if (!isDraggingRef.current || !earthRef.current) return;

      const deltaRotX = e.clientX - previousMousePositionRef.current.x;
      const deltaRotY = e.clientY - previousMousePositionRef.current.y;

      earthRef.current.rotation.y += deltaRotX * 0.005;
      earthRef.current.rotation.x += deltaRotY * 0.005;

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      // Don't immediately reset - wait for click handler
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 50);
    };

    currentMount.addEventListener('mousedown', handleMouseDown);
    currentMount.addEventListener('mousemove', handleMouseMove);
    currentMount.addEventListener('mouseup', handleMouseUp);
    currentMount.addEventListener('mouseleave', handleMouseUp);

    // Animation - Earth rotates slowly
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      if (earthRef.current && !isDraggingRef.current) {
        earthRef.current.rotation.y += 0.0003; // Very slow rotation
      }
      
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!currentMount) return;
      const newWidth = currentMount.clientWidth;
      const newHeight = currentMount.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      currentMount.removeEventListener('mousedown', handleMouseDown);
      currentMount.removeEventListener('mousemove', handleMouseMove);
      currentMount.removeEventListener('mouseup', handleMouseUp);
      currentMount.removeEventListener('mouseleave', handleMouseUp);
      cancelAnimationFrame(animationId);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update markers continuously with smooth position updates
  useEffect(() => {
    if (!sceneRef.current || !earthRef.current) return;

    // Clear old markers and lines
    markersRef.current.forEach(marker => {
      sceneRef.current.remove(marker);
    });
    markersRef.current = [];

    linesRef.current.forEach(line => {
      sceneRef.current.remove(line);
    });
    linesRef.current = [];

    // Add markers for all space objects
    spaceObjects.forEach(obj => {
      const color = getColorForType(obj.object_type, obj.threat_level);
      const markerGeometry = new THREE.SphereGeometry(0.02, 16, 16); // Increased marker size
      const markerMaterial = new THREE.MeshBasicMaterial({ color });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);

      const phi = (90 - (obj.latitude || 0)) * (Math.PI / 180);
      const theta = (obj.longitude || 0) * (Math.PI / 180);
      const radius = 1 + (obj.altitude || 400) / 6371;

      marker.position.x = radius * Math.sin(phi) * Math.cos(theta);
      marker.position.y = radius * Math.cos(phi);
      marker.position.z = radius * Math.sin(phi) * Math.sin(theta);

      marker.userData = { object: obj };
      markersRef.current.push(marker);
      sceneRef.current.add(marker);
    });

    // Add user satellite marker
    if (userSatellite) {
      const satGeometry = new THREE.SphereGeometry(0.04, 16, 16); // Increased user satellite marker size
      const satMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 0.5
      });
      const satMarker = new THREE.Mesh(satGeometry, satMaterial);

      const radius = 1 + 550 / 6371;
      satMarker.position.set(0, 0, radius);

      markersRef.current.push(satMarker);
      sceneRef.current.add(satMarker);

      // Draw curved threat lines
      if (threatObjects && threatObjects.length > 0) {
        threatObjects.forEach(threat => {
          const threatPhi = (90 - (threat.latitude || 0)) * (Math.PI / 180);
          const threatTheta = (threat.longitude || 0) * (Math.PI / 180);
          const threatRadius = 1 + (threat.altitude || 400) / 6371;

          const startPos = new THREE.Vector3(0, 0, radius);
          const endPos = new THREE.Vector3(
            threatRadius * Math.sin(threatPhi) * Math.cos(threatTheta),
            threatRadius * Math.cos(threatPhi),
            threatRadius * Math.sin(threatPhi) * Math.sin(threatTheta)
          );

          // Create smooth curved line
          const midPoint = startPos.clone().add(endPos).multiplyScalar(0.5);
          const distance = startPos.distanceTo(endPos);
          const heightFactor = 1 + (distance * 0.3);
          midPoint.normalize().multiplyScalar(radius * heightFactor);

          const curve = new THREE.QuadraticBezierCurve3(startPos, midPoint, endPos);
          const points = curve.getPoints(50);
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
          const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.7
          });
          const line = new THREE.Line(lineGeometry, lineMaterial);
          linesRef.current.push(line);
          sceneRef.current.add(line);
        });
      }
    }
  }, [spaceObjects, userSatellite, threatObjects]);

  const getColorForType = (type, threatLevel) => {
    if (threatLevel === 'critical') return 0xff0000;
    if (threatLevel === 'high') return 0xff6600;
    
    switch(type) {
      case 'satellite': return 0x00ffff;
      case 'debris': return 0xff9900;
      case 'rocket_body': return 0xff00ff;
      case 'asteroid': return 0xffff00;
      default: return 0xaaaaaa;
    }
  };

  const handleClick = (event) => {
    if (!cameraRef.current || !sceneRef.current || !mountRef.current) return;
    
    // Don't trigger click if user was dragging
    if (isDraggingRef.current) {
        return;
    }

    // Check if this was a quick click (less than 200ms)
    const clickDuration = Date.now() - mouseDownTimeRef.current;
    if (clickDuration > 200) {
      return;
    }

    const rect = mountRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    const intersects = raycaster.intersectObjects(markersRef.current);
    if (intersects.length > 0 && intersects[0].object.userData.object) {
      onObjectClick(intersects[0].object.userData.object);
    }
  };

  return (
    <div 
      ref={mountRef} 
      onClick={handleClick}
      className="w-full h-full"
      style={{ cursor: isDraggingRef.current ? 'grabbing' : 'grab' }}
    />
  );
}

function getColorForType(type, threatLevel) {
  if (threatLevel === 'critical') return 0xff0000;
  if (threatLevel === 'high') return 0xff6600;
  
  switch(type) {
    case 'satellite': return 0x00ffff;
    case 'debris': return 0xff9900;
    case 'rocket_body': return 0xff00ff;
    case 'asteroid': return 0xffff00;
    default: return 0xaaaaaa;
  }
}
