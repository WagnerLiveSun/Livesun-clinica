"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

function readPrimaryColor() {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()
  const hex = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1]
  if (hex) {
    const normalized = hex.length === 3 ? hex.split("").map((character) => `${character}${character}`).join("") : hex
    return new THREE.Color(`#${normalized}`)
  }

  const hsl = value.match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/)
  if (hsl) return new THREE.Color().setHSL(Number(hsl[1]) / 360, Number(hsl[2]) / 100, Number(hsl[3]) / 100)

  return new THREE.Color("#c8627a")
}

export function WebGLShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene | null
    camera: THREE.OrthographicCamera | null
    renderer: THREE.WebGLRenderer | null
    mesh: THREE.Mesh | null
    uniforms: any
    animationId: number | null
  }>({
    scene: null,
    camera: null,
    renderer: null,
    mesh: null,
    uniforms: null,
    animationId: null,
  })

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const { current: refs } = sceneRef

    const vertexShader = `
      attribute vec3 position;
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `

    const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform float xScale;
      uniform float yScale;
      uniform float distortion;
      uniform vec3 brandColor;

      void main() {
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
        float d = length(p) * distortion;
        float rx = p.x * (1.0 + d);
        float gx = p.x;
        float bx = p.x * (1.0 - d);

        float r = 0.035 / abs(p.y + sin((rx + time) * xScale) * yScale);
        float g = 0.035 / abs(p.y + sin((gx + time) * xScale) * yScale);
        float b = 0.035 / abs(p.y + sin((bx + time) * xScale) * yScale);
        float wave = (r + g + b) / 3.0;
        float core = smoothstep(0.45, 1.45, wave);
        float halo = smoothstep(0.10, 0.62, wave) - core;
        vec3 color = mix(brandColor * 0.52, brandColor * 1.28, core);
        gl_FragColor = vec4(color, halo * 0.18 + core * 0.62);
      }
    `

    const initScene = () => {
      refs.scene = new THREE.Scene()
      refs.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
      refs.renderer.setPixelRatio(window.devicePixelRatio)
      refs.renderer.setClearColor(new THREE.Color(0x000000), 0)

      refs.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, -1)

      refs.uniforms = {
        resolution: { value: [window.innerWidth, window.innerHeight] },
        time: { value: 0.0 },
        xScale: { value: 1.5 },
        yScale: { value: 0.8 },
        distortion: { value: 0.1 },
        brandColor: { value: readPrimaryColor() },
      }

      const position = [
        -1.0, -1.0, 0.0,
         1.0, -1.0, 0.0,
        -1.0,  1.0, 0.0,
         1.0, -1.0, 0.0,
        -1.0,  1.0, 0.0,
         1.0,  1.0, 0.0,
      ]

      const positions = new THREE.BufferAttribute(new Float32Array(position), 3)
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute("position", positions)

      const material = new THREE.RawShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: refs.uniforms,
        side: THREE.DoubleSide,
        transparent: true,
      })

      refs.mesh = new THREE.Mesh(geometry, material)
      refs.scene.add(refs.mesh)

      handleResize()
    }

    const animate = () => {
      if (refs.uniforms) refs.uniforms.time.value += 0.005
      if (refs.renderer && refs.scene && refs.camera) {
        refs.renderer.render(refs.scene, refs.camera)
      }
      refs.animationId = requestAnimationFrame(animate)
    }

    const handleResize = () => {
      if (!refs.renderer || !refs.uniforms) return
      const width = window.innerWidth
      const height = window.innerHeight
      refs.renderer.setSize(width, height, false)
      refs.uniforms.resolution.value = [width, height]
    }

    const updateBrandColor = () => {
      if (refs.uniforms?.brandColor) refs.uniforms.brandColor.value.copy(readPrimaryColor())
    }

    initScene()
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reducedMotion && refs.renderer && refs.scene && refs.camera) {
      refs.renderer.render(refs.scene, refs.camera)
    } else {
      animate()
    }
    window.addEventListener("resize", handleResize)
    const rootObserver = new MutationObserver(updateBrandColor)
    rootObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] })

    return () => {
      if (refs.animationId) cancelAnimationFrame(refs.animationId)
      window.removeEventListener("resize", handleResize)
      rootObserver.disconnect()
      if (refs.mesh) {
        refs.scene?.remove(refs.mesh)
        refs.mesh.geometry.dispose()
        if (refs.mesh.material instanceof THREE.Material) {
          refs.mesh.material.dispose()
        }
      }
      refs.renderer?.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="sunset-shader fixed inset-0 z-0 h-full w-full pointer-events-none"
    />
  )
}
