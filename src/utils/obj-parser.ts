function parseOBJ(objData) {
  const vertices = [];
  const normals = [];
  const textureCoords = [];
  const indices = [];
  const parsedVertices = [];
  const parsedNormals = [];
  const parsedTextureCoords = [];

  const vertexMap = {};

  objData = objData.replace(/\\\s*\n/g, ' ');

  const lines = objData.split('\n');

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('#') || line.startsWith('mtllib') || line.startsWith('o') || line === '') {
      continue;
    }

    const parts = line.split(/\s+/);
    const type = parts[0];

    switch (type) {
      case 'v':
        vertices.push(
          parseFloat(parts[1]),
          parseFloat(parts[2]),
          parseFloat(parts[3])
        );
        break;

      case 'vt':
        textureCoords.push(
          parseFloat(parts[1]),
          parseFloat(parts[2])
        );
        break;

      case 'vn':
        normals.push(
          parseFloat(parts[1]),
          parseFloat(parts[2]),
          parseFloat(parts[3])
        );
        break;

      case 'f': {
        const faceVertices = parts.slice(1);
        for (let i = 1; i < faceVertices.length - 1; i++) {
          const verticesToProcess = [faceVertices[0], faceVertices[i], faceVertices[i + 1]];
          for (const vertex of verticesToProcess) {
            const [vIndexStr, tIndexStr = '', nIndexStr = ''] = vertex.split('/');
            const vertexIndex = parseInt(vIndexStr) - 1;
            const textureCoordIndex = tIndexStr !== '' ? parseInt(tIndexStr) - 1 : null;
            const normalVectorIndex = nIndexStr !== '' ? parseInt(nIndexStr) - 1 : null;

            const key = `${vertexIndex}/${textureCoordIndex !== null ? textureCoordIndex : ''}/${normalVectorIndex !== null ? normalVectorIndex : ''}`;

            if (!(key in vertexMap)) {
              parsedVertices.push(
                vertices[3 * vertexIndex],
                vertices[3 * vertexIndex + 1],
                vertices[3 * vertexIndex + 2]
              );

              if (textureCoordIndex !== null && textureCoordIndex >= 0 && textureCoords.length > 0) {
                parsedTextureCoords.push(
                  textureCoords[2 * textureCoordIndex],
                  textureCoords[2 * textureCoordIndex + 1]
                );
              } else {
                parsedTextureCoords.push(0, 0);
              }

              if (normalVectorIndex !== null && normalVectorIndex >= 0 && normals.length > 0) {
                parsedNormals.push(
                  normals[3 * normalVectorIndex],
                  normals[3 * normalVectorIndex + 1],
                  normals[3 * normalVectorIndex + 2]
                );
              } else {
                parsedNormals.push(0, 0, 1);
              }

              vertexMap[key] = parsedVertices.length / 3 - 1;
            }
            indices.push(vertexMap[key]);
          }
        }
        break;
      }

      default:
        if (import.meta.env.NODE_ENV !== 'production') {
          console.warn(`Ignorando linha desconhecida: ${line}`);
        }
      break;
    }
  }

  const indexArray = indices.length > 65536 ? new Uint32Array(indices) : new Uint16Array(indices);

  return {
    vertices: new Float32Array(parsedVertices),
    normals: new Float32Array(parsedNormals),
    textureCoords: new Float32Array(parsedTextureCoords),
    indices: indexArray,
  };
}

export default parseOBJ;
