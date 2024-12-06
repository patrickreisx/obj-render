import React, { useEffect, useRef, useState } from 'react'
import UseLoadFile from '../hooks/use-load-file'
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger
} from '@/components/ui/menubar.tsx';

export default function ModelViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [modelInfo, setModelInfo] = useState({vertices: 0, faces: 0, triangles: 0})
  const [activeDetails, setActiveDetails] = useState(true)

  const examples = [
    {
      name: 'Armadillo',
      url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/armadillo.obj'
    },
    {
      name: 'Beast',
      url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/beast.obj'
    },
    {
      name: 'Beetle',
      url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/beetle.obj'
    },
    {
      name: 'Cheburashka',
      url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/cheburashka.obj'
    },
    {
      name: 'Cow',
      url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/cow.obj'
    },
    {
      name: 'Happy Buddha',
      url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/happy.obj'
    },
    {
      name: 'Max Planck',
      url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/max-planck.obj'
    },
    {
      name: 'Nefertiti',
      url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/nefertiti.obj'
    },
    {
      name: 'Ogre',
      url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/ogre.obj'
    },
    {
      name: 'Rocker Arm',
      url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/rocker-arm.obj'
    },
    {
      name: 'Spot',
      url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/spot.obj'
    },
    {
      name: 'Stanford Bunny',
      url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/stanford-bunny.obj'
    },
    {
      name: 'Suzanne',
      url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/suzanne.obj'
    },
    {
      name: 'Teapot',
      url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/teapot.obj'
    },
    {
      name: 'XYZ Dragon',
      url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/xyzrgb_dragon.obj'
    },
    {
      name: 'Igea',
      url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/igea.obj'
    },
    {
      name: 'Homer',
      url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/refs/heads/master/data/homer.obj'
    }
  ];


  function loadExample(url: string) {
    fetch(url)
      .then(response => response.text())
      .then(text => {
        setFileContent(text)
        updateModelInfo(text)
      })
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setFileContent(content)
        updateModelInfo(content)
      }
      reader.readAsText(file)
    }
  }

  const updateModelInfo = (content: string) => {
    const lines = content.split('\n')
    const vertices = lines.filter(line => line.startsWith('v ')).length
    const faces = lines.filter(line => line.startsWith('f ')).length
    const triangles = lines.filter(line => line.startsWith('f ')).reduce((acc, line) => {
      const vertices = line.split(' ').slice(1)
      return acc + (vertices.length - 2)
    }, 0)
    setModelInfo({vertices, faces, triangles})
  }

  useEffect(() => {
    if (fileContent && canvasRef.current) {
      const canvas = canvasRef.current;
      const gl = canvas.getContext('webgl');

      if (!gl) {
        console.error('WebGL not supported');
        return;
      }

      const devicePixelRatio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth * devicePixelRatio;
      const height = canvas.clientHeight * devicePixelRatio;

      canvas.width = width;
      canvas.height = height;

      gl.viewport(0, 0, width, height);

      const initWebGL = UseLoadFile(canvasRef, fileContent);
      return initWebGL();
    }
  }, [fileContent]);

  return (
    <div className="flex flex-col w-screen h-screen relative">
      <div className="absolute p-2 top-4 left-4 flex items-center gap-2 z-20">
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={() => document.getElementById('file-upload')?.click()}>
                Upload File
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Examples</MenubarTrigger>
            <MenubarContent>
              {examples.map(example => (
                <MenubarItem key={example.name} onClick={() => loadExample(example.url)}>
                  {example.name}
                </MenubarItem>
              ))}
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={() => setActiveDetails(!activeDetails)}>Show Details</MenubarItem>
              {/*<MenubarItem>Wireframe</MenubarItem>*/}
              {/*<MenubarSeparator />*/}
              {/*<MenubarItem>Zoom In</MenubarItem>*/}
              {/*<MenubarItem>Zoom Out</MenubarItem>*/}
              {/*<MenubarSeparator />*/}
              {/*<MenubarItem>Reset</MenubarItem>*/}
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
        <input
          id="file-upload"
          type="file"
          accept=".obj"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
      {activeDetails && (
        <div className="absolute top-20 left-4 flex items-center gap-2 z-10">
          <dl className="flex flex-col gap-2">
            <div className="px-4 flex gap-2 items-center justify-start text-sm">
              <span className="font-semibold text-[#4550ea]">Vertices:</span>
              <span>{modelInfo.vertices}</span>
            </div>
            <div className="px-4 flex gap-2 items-center justify-start text-sm">
              <span className="font-semibold text-[#4550ea]">Faces:</span>
              <span>{modelInfo.faces}</span>
            </div>
            <div className="px-4 flex gap-2 items-center justify-start text-sm">
              <span className="font-semibold text-[#4550ea]">Triangles:</span>
              <span>{modelInfo.triangles}</span>
            </div>
          </dl>
        </div>
      )}
      <div className="flex-1 flex items-center justify-center w-full h-full">
        <canvas ref={canvasRef} className="w-full h-full"></canvas>
      </div>
    </div>
  )
}
