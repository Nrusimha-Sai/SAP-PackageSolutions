import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ThreeLoader = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    currentMount.appendChild(renderer.domElement);

    // Create a modern looking geometry (Icosahedron for a tech vibe)
    const geometry = new THREE.IcosahedronGeometry(2, 0);
    
    // Create material with a wireframe for a cool, tech look
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x1B90FF, 
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    
    const shape = new THREE.Mesh(geometry, material);
    scene.add(shape);

    camera.position.z = 5;

    // Animation loop
    let animationFrameId;
    const animate = function () {
      animationFrameId = requestAnimationFrame(animate);
      
      shape.rotation.x += 0.01;
      shape.rotation.y += 0.01;

      renderer.render(scene, camera);
    };
    
    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (currentMount) {
        currentMount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }} />;
};

export default ThreeLoader;
