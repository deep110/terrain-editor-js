const ISO_LEVEL = 0;

const WIDTH = 32;
const HEIGHT = 32;
const DEPTH = 32;

var scene;
var camera;
var renderer;
var canvas;

class MarchingCubes {
    constructor(width, height, depth, sampleSize = 1) {
        this.xMax = Math.floor(width / (2 * sampleSize));
        this.yMax = Math.floor(height / (2 * sampleSize));
        this.zMax = Math.floor(depth / (2 * sampleSize));
        this.sampleSize = sampleSize;

        this.xMax2 = 2 * this.xMax;
        this.yMax2 = 2 * this.yMax;
        this.zMax2 = 2 * this.zMax;

        this.fieldBuffer = new Float32Array((this.xMax+1) * (this.yMax + 1) * (this.zMax + 1) * 8);
        this.vertices = new Float32Array(this.xMax2 * this.yMax2 * this.zMax2 * 12 * 3);

        this.edges = [];
        for (let i = 0; i < 12; i++) {
            this.edges.push(new Float32Array(3));
        }
    }

    setField(i, j, k, amt) {
        this.fieldBuffer[i * this.xMax2 * this.zMax2 + k * this.zMax2 + j] = amt;
    }

    getField(i, j, k) {
        return this.fieldBuffer[i * this.xMax2 * this.zMax2 + k * this.zMax2 + j];
    }

    generateMesh(geometry, surfaceLevel) {
        let fI, fJ, fK;
        let x, y, z;

        let vIdx = 0;

        for (let i = -this.xMax; i < this.xMax; i++) {
            fI = i + this.xMax;
            x = i * this.sampleSize;
            for (let j = -this.yMax; j < this.yMax; j++) {
                fJ = j + this.yMax;
                y = j * this.sampleSize;
                for (let k = -this.zMax; k < this.zMax; k++) {
                    fK = k + this.zMax;
                    z = k * this.sampleSize;

                    const v0 = this.getField(fI, fJ, fK);
                    const v1 = this.getField(fI + 1, fJ, fK);
                    const v2 = this.getField(fI + 1, fJ, fK + 1);
                    const v3 = this.getField(fI, fJ, fK + 1);
                    const v4 = this.getField(fI, fJ + 1, fK);
                    const v5 = this.getField(fI + 1, fJ + 1, fK);
                    const v6 = this.getField(fI + 1, fJ + 1, fK + 1);
                    const v7 = this.getField(fI, fJ + 1, fK + 1)

                    let cubeIndex = this.#getCubeIndex(surfaceLevel, v0, v1, v2, v3, v4, v5, v6, v7);
                    let edgeIndex = edgeTable[cubeIndex];
                    if (edgeIndex == 0) {
                        continue;
                    }
                    let mu = this.sampleSize / 2;
                    if (edgeIndex & 1) {
                        mu = (surfaceLevel - v0) / (v1 - v0);
                        this.#setFloatArray(this.edges[0], this.#lerp(x, x + this.sampleSize, mu), y, z);
                    }
                    if (edgeIndex & 2) {
                        mu = (surfaceLevel - v1) / (v2 - v1);
                        this.#setFloatArray(this.edges[1], x + this.sampleSize, y, this.#lerp(z, z + this.sampleSize, mu));
                    }
                    if (edgeIndex & 4) {
                        mu = (surfaceLevel - v3) / (v2 - v3);
                        this.#setFloatArray(this.edges[2], this.#lerp(x, x + this.sampleSize, mu), y, z + this.sampleSize);
                    }
                    if (edgeIndex & 8) {
                        mu = (surfaceLevel - v0) / (v3 - v0);
                        this.#setFloatArray(this.edges[3], x, y, this.#lerp(z, z + this.sampleSize, mu));
                    }
                    if (edgeIndex & 16) {
                        mu = (surfaceLevel - v4) / (v5 - v4);
                        this.#setFloatArray(this.edges[4], this.#lerp(x, x + this.sampleSize, mu), y + this.sampleSize, z);
                    }
                    if (edgeIndex & 32) {
                        mu = (surfaceLevel - v5) / (v6 - v5);
                        this.#setFloatArray(this.edges[5], x + this.sampleSize, y + this.sampleSize, this.#lerp(z, z + this.sampleSize, mu));
                    }
                    if (edgeIndex & 64) {
                        mu = (surfaceLevel - v7) / (v6 - v7);
                        this.#setFloatArray(this.edges[6], this.#lerp(x, x + this.sampleSize, mu), y + this.sampleSize, z + this.sampleSize);
                    }
                    if (edgeIndex & 128) {
                        mu = (surfaceLevel - v4) / (v7 - v4);
                        this.#setFloatArray(this.edges[7], x, y + this.sampleSize, this.#lerp(z, z + this.sampleSize, mu));
                    }
                    if (edgeIndex & 256) {
                        mu = (surfaceLevel - v0) / (v4 - v0);
                        this.#setFloatArray(this.edges[8], x, this.#lerp(y, y + this.sampleSize, mu), z);
                    }
                    if (edgeIndex & 512) {
                        mu = (surfaceLevel - v1) / (v5 - v1);
                        this.#setFloatArray(this.edges[9], x + this.sampleSize, this.#lerp(y, y + this.sampleSize, mu), z);
                    }
                    if (edgeIndex & 1024) {
                        mu = (surfaceLevel - v2) / (v6 - v2);
                        this.#setFloatArray(this.edges[10], x + this.sampleSize, this.#lerp(y, y + this.sampleSize, mu), z + this.sampleSize);
                    }
                    if (edgeIndex & 2048) {
                        mu = (surfaceLevel - v3) / (v7 - v3);
                        this.#setFloatArray(this.edges[11], x, this.#lerp(y, y + this.sampleSize, mu), z + this.sampleSize);
                    }

                    const triLen = triangulationTable[cubeIndex];
                    for (let i = 0; i < triLen.length; i++) {
                        if (triLen[i] === -1) {
                            break;
                        }
                        const e = this.edges[triLen[i]];
                        this.vertices[vIdx] = e[0];
                        this.vertices[vIdx + 1] = e[1];
                        this.vertices[vIdx + 2] = e[2];
                        // indices[idxCounter] = idxCounter;
                        // idxCounter++;
                        vIdx += 3;
                    }
                }
            }
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(this.vertices.slice(0, vIdx), 3));
        geometry.computeVertexNormals();
    }

    #getCubeIndex(isoLevel, a, b, c, d, e, f, g, h) {
        let cubeIndex = 0;

        if (a < isoLevel) cubeIndex |= 1;
        if (b < isoLevel) cubeIndex |= 2;
        if (c < isoLevel) cubeIndex |= 4;
        if (d < isoLevel) cubeIndex |= 8;
        if (e < isoLevel) cubeIndex |= 16;
        if (f < isoLevel) cubeIndex |= 32;
        if (g < isoLevel) cubeIndex |= 64;
        if (h < isoLevel) cubeIndex |= 128;

        return cubeIndex;
    }

    #setFloatArray(arr, a, b, c) {
        arr[0] = a;
        arr[1] = b;
        arr[2] = c;
    }

    #lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }
}

function fieldFunction(x, y, z) {
    return Math.sqrt(x * x + y * y + z * z) - 16;
}

function generateTerrainField(ms) {
    let sampleSize = ms.sampleSize;

    for (let i = -ms.xMax; i < ms.xMax + 1; i++) {
        let x = i * sampleSize;
        for (let j = -ms.yMax; j < ms.yMax + 1; j++) {
            let y = j * sampleSize;
            for (let k = -ms.zMax; k < ms.zMax + 1; k++) {
                let z = k * sampleSize;
                ms.setField(i + ms.xMax, j + ms.yMax, k + ms.zMax, fieldFunction(x, y, z));
            }
        }
    }
}

function addTerrainMesh() {
    const sampleSize = 1;

    const whiteMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    let terrainGeometry = new THREE.BufferGeometry();

    let marchingCubes = new MarchingCubes(WIDTH, HEIGHT, DEPTH, sampleSize);
    generateTerrainField(marchingCubes);

    marchingCubes.generateMesh(terrainGeometry, ISO_LEVEL);

    const mesh = new THREE.Mesh(terrainGeometry, whiteMaterial);
    scene.add(mesh);
}

function onWindowResize() {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();

    const pixelRatio = window.devicePixelRatio;
    renderer.setSize(canvas.clientWidth * pixelRatio, canvas.clientHeight * pixelRatio, false);
    render();
}

function setup() {
    canvas = document.getElementById("canvas");
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ canvas: canvas });
    const pixelRatio = window.devicePixelRatio;
    renderer.setSize(canvas.clientWidth * pixelRatio, canvas.clientHeight * pixelRatio, false);

    addTerrainMesh();

    // add lights
    const dLight = new THREE.DirectionalLight(0xFFFFFF, 0.5);
    dLight.position.set(-5, 2, 10);
    scene.add(dLight);

    let ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    scene.background = new THREE.Color("#3a3a3a");
    camera.position.z = 15;
    camera.position.x = 15;
    camera.position.y = 15;

    controls = new THREE.OrbitControls(camera, canvas);
    controls.listenToKeyEvents(window);
    controls.addEventListener('change', render);

    window.addEventListener('resize', onWindowResize);
}

function render() {
    console.log("render called");
    renderer.render(scene, camera);

    // requestAnimationFrame(render);
}

setup();
render();
