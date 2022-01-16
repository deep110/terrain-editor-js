const RAD = 8;
const ISO_LEVEL = 0;

const WIDTH = 2 * RAD;
const HEIGHT = 2 * RAD;
const DEPTH = 2 * RAD;

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

        this.fieldBuffer = generateField(sampleSize, this.xMax, this.yMax, this.zMax);

        // this.indices = new Uint32Array(width * height * depth * 12);
        this.vertices = new Float32Array(this.xMax * this.yMax * this.zMax * 8 * 12 * 3);

        this.edges = [];
        for (let i = 0; i < 12; i++) {
            this.edges.push(new Float32Array(3));
        }
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

                    let cubeIndex = this.#getCubeIndex(
                        surfaceLevel,
                        this.fieldBuffer[fI][fJ][fK],
                        this.fieldBuffer[fI + 1][fJ][fK],
                        this.fieldBuffer[fI + 1][fJ][fK + 1],
                        this.fieldBuffer[fI][fJ][fK + 1],
                        this.fieldBuffer[fI][fJ + 1][fK],
                        this.fieldBuffer[fI + 1][fJ + 1][fK],
                        this.fieldBuffer[fI + 1][fJ + 1][fK + 1],
                        this.fieldBuffer[fI][fJ + 1][fK + 1],
                    );
                    let edgeIndex = edgeTable[cubeIndex];
                    if (edgeIndex == 0) {
                        continue;
                    }
                    const mu = this.sampleSize / 2;
                    if (edgeIndex & 1) {
                        // const mu = (surfaceLevel - e0) / (e1 - e0);
                        this.#setFloatArray(this.edges[0], x + mu, y, z);
                    }
                    if (edgeIndex & 2) {
                        // const mu = (surfaceLevel - e1) / (e2 - e1);
                        this.#setFloatArray(this.edges[1], x + this.sampleSize, y, z + mu);
                    }
                    if (edgeIndex & 4) {
                        // const mu = (surfaceLevel - e3) / (e2 - e3);
                        this.#setFloatArray(this.edges[2], x + mu, y, z + this.sampleSize);
                    }
                    if (edgeIndex & 8) {
                        // const mu = (surfaceLevel - e0) / (e3 - e0);
                        this.#setFloatArray(this.edges[3], x, y, z + mu);
                    }
                    if (edgeIndex & 16) {
                        // const mu = (surfaceLevel - e4) / (e5 - e4);
                        this.#setFloatArray(this.edges[4], x + mu, y + this.sampleSize, z);
                    }
                    if (edgeIndex & 32) {
                        // const mu = (surfaceLevel - e5) / (e6 - e5);
                        this.#setFloatArray(this.edges[5], x + this.sampleSize, y + this.sampleSize, z + mu);
                    }
                    if (edgeIndex & 64) {
                        // const mu = (surfaceLevel - e7) / (e6 - e7);
                        this.#setFloatArray(this.edges[6], x + mu, y + this.sampleSize, z + this.sampleSize);
                    }
                    if (edgeIndex & 128) {
                        // const mu = (surfaceLevel - e4) / (e7 - e4);
                        this.#setFloatArray(this.edges[7], x, y + this.sampleSize, z + mu);
                    }
                    if (edgeIndex & 256) {
                        // const mu = (surfaceLevel - e0) / (e4 - e0);
                        this.#setFloatArray(this.edges[8], x, y + mu, z);
                    }
                    if (edgeIndex & 512) {
                        // const mu = (surfaceLevel - e1) / (e5 - e1);
                        this.#setFloatArray(this.edges[9], x + this.sampleSize, y + mu, z);
                    }
                    if (edgeIndex & 1024) {
                        // const mu = (surfaceLevel - e2) / (e6 - e2);
                        this.#setFloatArray(this.edges[10], x + this.sampleSize, y + mu, z + this.sampleSize);
                    }
                    if (edgeIndex & 2048) {
                        // const mu = (surfaceLevel - e3) / (e7 - e3);
                        this.#setFloatArray(this.edges[11], x, y + mu, z + this.sampleSize);
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
}

function fieldFunction(x, y, z) {
    return Math.sqrt(x * x + y * y + z * z) - RAD
}

function generateField(sampleSize, xVal, yVal, zVal) {
    let field = [];

    for (let i = -xVal; i < xVal + 1; i++) {
        let x = i * sampleSize;
        field[i + xVal] = [];
        for (let j = -yVal; j < yVal + 1; j++) {
            let y = j * sampleSize;
            field[i + xVal][j + yVal] = [];
            for (let k = -zVal; k < zVal + 1; k++) {
                let z = k * sampleSize;
                field[i + xVal][j + yVal][k + zVal] = fieldFunction(x, y, z);
            }
        }
    }
    return field;
}

function addTerrainMesh() {
    const sampleSize = 1;

    const whiteMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    let terrainGeometry = new THREE.BufferGeometry();

    let marchingCubes = new MarchingCubes(WIDTH, HEIGHT, DEPTH, sampleSize);
    marchingCubes.generateMesh(terrainGeometry, ISO_LEVEL);

    const mesh = new THREE.Mesh(terrainGeometry, whiteMaterial);
    scene.add(mesh);
}

function onWindowResize() {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
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
