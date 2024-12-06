import { mat4 } from 'gl-matrix';
import parseOBJ from '../utils/obj-parser.ts';

function UseLoadFile(canvasRef, objData) {
  return () => {
    if (!canvasRef.current) return;

    const gl = canvasRef.current.getContext('webgl');
    if (!gl) {
      console.error('Falha ao inicializar WebGL');
      return;
    }

    const compileShader = (source, type) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Erro ao compilar o shader:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShaderSource = `
      precision mediump float;
      
      attribute vec3 aVertexPosition;
      attribute vec3 aVertexNormal;
      
      uniform mat4 uProjectionMatrix;
      uniform mat4 uViewMatrix;
      uniform mat4 uModelMatrix;
      
      varying vec3 vColor;

      void main() {
          vec4 vertexPosition = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aVertexPosition, 1.0);
          gl_Position = vertexPosition;
      
          vec3 normal = normalize(mat3(uModelMatrix) * aVertexNormal);
          vec3 lightDirection = normalize(vec3(1.0, 1.0, 8.0) - vec3(uModelMatrix * vec4(aVertexPosition, 1.0)));
          float diff = max(dot(normal, lightDirection), 0.0);
      
          vec3 viewDirection = normalize(vec3(0.0, 0.0, 5.0) - vec3(uModelMatrix * vec4(aVertexPosition, 1.0)));
          vec3 reflectDirection = reflect(-lightDirection, normal);
          float spec = pow(max(dot(viewDirection, reflectDirection), 0.0), 16.0);
      
          vec3 ambient = vec3(0.4, 0.4, 0.4);
          vec3 diffuse = vec3(1.0, 1.0, 1.0) * diff;
          vec3 specular = vec3(1.0, 1.0, 1.0) * spec;
      
          vColor = ambient + diffuse + specular;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      varying vec3 vColor;
      
      void main() {
          gl_FragColor = vec4(vColor, 1.0);
      }
    `;


    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Erro ao linkar o programa:', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const parsedOBJ = parseOBJ(objData);

    const vertices = new Float32Array(parsedOBJ.vertices);

    const calculateBoundingBox = (vertices) => {
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];

      for (let i = 0; i < vertices.length; i += 3) {
        min[0] = Math.min(min[0], vertices[i]);
        min[1] = Math.min(min[1], vertices[i + 1]);
        min[2] = Math.min(min[2], vertices[i + 2]);
        max[0] = Math.max(max[0], vertices[i]);
        max[1] = Math.max(max[1], vertices[i + 1]);
        max[2] = Math.max(max[2], vertices[i + 2]);
      }

      const size = [
        max[0] - min[0],
        max[1] - min[1],
        max[2] - min[2],
      ];

      const center = [
        (max[0] + min[0]) / 2,
        (max[1] + min[1]) / 2,
        (max[2] + min[2]) / 2,
      ];

      return { size, center };
    };

    const ext = gl.getExtension('OES_element_index_uint');
    if (!ext && parsedOBJ.indices instanceof Uint32Array) {
      throw new Error('Seu ambiente WebGL não suporta índices de 32 bits.');
    } else {
      console.log('Seu ambiente WebGL suporta índices de 32 bits.');
    }

    if (!gl.getExtension('OES_element_index_uint')) {
      console.error('Este dispositivo não suporta índices de 32 bits.');
      return;
    }

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, parsedOBJ.indices, gl.STATIC_DRAW);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);


    const normals = new Float32Array(parsedOBJ.normals);
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

    const aNormal = gl.getAttribLocation(program, 'aVertexNormal');
    gl.enableVertexAttribArray(aNormal);
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);

    const aPosition = gl.getAttribLocation(program, 'aVertexPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

    const uProjectionMatrix = gl.getUniformLocation(program, 'uProjectionMatrix');
    const uViewMatrix = gl.getUniformLocation(program, 'uViewMatrix');
    const uModelMatrix = gl.getUniformLocation(program, 'uModelMatrix');
    const boundingBox = calculateBoundingBox(parsedOBJ.vertices);
    const maxSize = Math.max(...boundingBox.size);

    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, (80 * Math.PI) / 180, gl.canvas.width / gl.canvas.height, 0.1, 1000);

    const modelMatrix = mat4.create();

    gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);


    let cameraDistance = maxSize * 2;
    let rotationX = 0;
    let rotationY = 0;
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let isPanning = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const updateViewMatrix = () => {
      const viewMatrix = mat4.create();
      mat4.translate(viewMatrix, viewMatrix, [panX, panY, -cameraDistance]);
      mat4.rotateX(viewMatrix, viewMatrix, rotationX);
      mat4.rotateY(viewMatrix, viewMatrix, rotationY);
      gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);
    };

    const handleMouseWheel = (event) => {
      cameraDistance += event.deltaY * 0.01;
      if (cameraDistance < 1) cameraDistance = 1;
      updateViewMatrix();
      drawScene();
    };

    const handleMouseDown = (event) => {
      if (event.button === 0) {
        isDragging = true;
      } else if (event.button === 2) {
        isPanning = true;
      }
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
    };

    const handleMouseMove = (event) => {
      const deltaX = event.clientX - lastMouseX;
      const deltaY = event.clientY - lastMouseY;

      if (isDragging) {
        rotationY += deltaX * 0.01;
        rotationX += deltaY * 0.01;
      } else if (isPanning) {
        panX += deltaX * 0.01;
        panY -= deltaY * 0.01;
      }

      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      updateViewMatrix();
      drawScene();
    };

    const handleMouseUp = () => {
      isDragging = false;
      isPanning = false;
    };

    const drawScene = () => {
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0.9, 0.9, 0.9, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      const indexType = parsedOBJ.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;

      gl.drawElements(gl.TRIANGLES, parsedOBJ.indices.length, indexType, 0);

    };
    let lastTouchX = 0;
    let lastTouchY = 0;
    let lastTouchDist = 0;

    const handleTouchStart = (event) => {
      event.preventDefault();
      if (event.touches.length === 1) {
        isDragging = true;
        lastTouchX = event.touches[0].clientX;
        lastTouchY = event.touches[0].clientY;
      } else if (event.touches.length === 2) {
        isPanning = true;
        lastTouchDist = Math.hypot(
          event.touches[0].clientX - event.touches[1].clientX,
          event.touches[0].clientY - event.touches[1].clientY
        );
      }
    };

    const handleTouchMove = (event) => {
      event.preventDefault();
      if (event.touches.length === 1 && isDragging) {
        const deltaX = event.touches[0].clientX - lastTouchX;
        const deltaY = event.touches[0].clientY - lastTouchY;

        rotationY += deltaX * 0.01;
        rotationX += deltaY * 0.01;

        lastTouchX = event.touches[0].clientX;
        lastTouchY = event.touches[0].clientY;
      } else if (event.touches.length === 2 && isPanning) {
        const newDist = Math.hypot(
          event.touches[0].clientX - event.touches[1].clientX,
          event.touches[0].clientY - event.touches[1].clientY
        );
        const deltaDist = newDist - lastTouchDist;

        cameraDistance -= deltaDist * 0.05;
        if (cameraDistance < 1) cameraDistance = 1;

        lastTouchDist = newDist;
      }

      updateViewMatrix();
      drawScene();
    };

    const handleTouchEnd = (event) => {
      event.preventDefault();
      if (event.touches.length === 0) {
        isDragging = false;
        isPanning = false;
      }
    };

    const disableContextMenu = (event) => {
      event.preventDefault();
    };

    canvasRef.current.addEventListener('contextmenu', disableContextMenu);
    canvasRef.current.addEventListener('wheel', handleMouseWheel);
    canvasRef.current.addEventListener('mousedown', handleMouseDown);
    canvasRef.current.addEventListener('mousemove', handleMouseMove);

    canvasRef.current.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvasRef.current.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvasRef.current.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('mouseup', handleMouseUp);

    updateViewMatrix();
    drawScene();

    return () => {
      canvasRef.current.removeEventListener('wheel', handleMouseWheel);
      canvasRef.current.removeEventListener('mousedown', handleMouseDown);
      canvasRef.current.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvasRef.current.removeEventListener('contextmenu', disableContextMenu);
      gl.deleteBuffer(vertexBuffer);
      gl.deleteBuffer(normalBuffer);
      gl.deleteProgram(program);
    };
  };
}

export default UseLoadFile;
