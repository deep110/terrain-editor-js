const ISO_LEVEL = 0;

const WIDTH = 60;
const HEIGHT = WIDTH;
const DEPTH = WIDTH;

var scene;
var camera;
var renderer;
var canvas;
var whichKeyPress = "NONE"; // Shift, Z, NONE

const raycaster = new THREE.Raycaster();

class Terrain {
    constructor(width, height, depth, sampleSize) {
        this.xMax = Math.floor(width / (2 * sampleSize));
        this.yMax = Math.floor(height / (2 * sampleSize));
        this.zMax = Math.floor(depth / (2 * sampleSize));
        this.sampleSize = sampleSize;

        this.xMax2 = 2 * this.xMax;
        this.yMax2 = 2 * this.yMax;
        this.zMax2 = 2 * this.zMax;
        this.fieldBuffer = new Float32Array((this.xMax + 1) * (this.yMax + 1) * (this.zMax + 1) * 8);

        // noise values
        this.numOctaves = 4;
        this.lacunarity = 2;
        this.persistence = 0.5;
        this.noiseScale = 2;
        this.noiseWeight = 7;
        this.floorOffset = 5;
        this.weightMultiplier = 3.6;
        this.simplex = new SimplexNoise();

        // graphics
        this.geometry = new THREE.BufferGeometry();
        this.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.marchingCubes = new MarchingCubes(this.xMax, this.yMax, this.zMax, sampleSize);

        // generate mesh geometry
        this.generateHeightField();
        this.marchingCubes.generateMesh(this.geometry, ISO_LEVEL, this);
    }

    setField(i, j, k, amt) {
        this.fieldBuffer[i * this.xMax2 * this.zMax2 + k * this.zMax2 + j] = amt;
    }

    getField(i, j, k) {
        return this.fieldBuffer[i * this.xMax2 * this.zMax2 + k * this.zMax2 + j];
    }

    getMesh() {
        return this.mesh;
    }

    makeShape(brushSize, point, multiplier) {
        for (let x = -brushSize - 2; x <= brushSize + 2; x++) {
            for (let y = -brushSize - 2; y <= brushSize + 2; y++) {
                for (let z = -brushSize - 2; z <= brushSize + 2; z++) {
                    let distance = this.#sphereDistance(point.clone(), new THREE.Vector3(point.x + x, point.y + y, point.z + z), brushSize);
                    if (distance < 0) {
                        let xi = Math.round(point.x + x) + this.xMax;
                        let yi = Math.round(point.y + y) + this.yMax;
                        let zi = Math.round(point.z + z) + this.zMax;

                        this.setField(xi, yi, zi, this.getField(xi, yi, zi) - distance * multiplier);
                    }
                }
            }
        }
        this.regenerateMesh();
    }

    regenerateMesh() {
        this.marchingCubes.generateMesh(this.geometry, ISO_LEVEL, this);
    }

    generateHeightField() {
        for (let i = -this.xMax; i < this.xMax + 1; i++) {
            let x = i * this.sampleSize;
            for (let j = -this.yMax; j < this.yMax + 1; j++) {
                let y = j * this.sampleSize;
                for (let k = -this.zMax; k < this.zMax + 1; k++) {
                    let z = k * this.sampleSize;
                    this.setField(i + this.xMax, j + this.yMax, k + this.zMax, this.#heightValue(x, y, z));
                }
            }
        }
    }

    #heightValue(x, y, z) {
        let offsetNoise = 1;
        let noise = 0;

        let frequency = this.noiseScale / 100;
        let amplitude = 1;
        let weight = 1;
        for (var j = 0; j < this.numOctaves; j++) {
            let n = this.simplex.noise3D(
                (x + offsetNoise) * frequency,
                (y + offsetNoise) * frequency,
                (z + offsetNoise) * frequency,
            );
            let v = 1 - Math.abs(n);
            v = v * v * weight;
            weight = Math.max(Math.min(v * this.weightMultiplier, 1), 0);
            noise += v * amplitude;
            amplitude *= this.persistence;
            frequency *= this.lacunarity;
        }

        let finalVal = -(y + this.floorOffset) + noise * this.noiseWeight;

        return -finalVal;
    }

    #sphereDistance = (spherePos, point, radius) => {
        return spherePos.distanceTo(point) - radius;
    }
}

function addAxis() {
    const boxGeo = new THREE.BoxGeometry();
    const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const material2 = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const material3 = new THREE.MeshPhongMaterial({ color: 0x0000ff });

    const st = 4;
    temp(boxGeo, material, st, 0, 0, 1);
    temp(boxGeo, material2, 0, st, 0, 2);
    temp(boxGeo, material3, 0, 0, st, 3);

    function temp(geo, mat, x, y, z, s) {
        mat.depthTest = false;
        const c0 = new THREE.Mesh(geo, mat);
        c0.position.x = x;
        c0.position.y = y;
        c0.position.z = z;

        switch (s) {
            case 1: c0.scale.x = 6; break;
            case 2: c0.scale.y = 6; break;
            case 3: c0.scale.z = 6; break;
        }

        scene.add(c0);
    }
}

function onWindowResize() {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();

    const pixelRatio = window.devicePixelRatio;
    renderer.setSize(canvas.clientWidth * pixelRatio, canvas.clientHeight * pixelRatio, false);
    render();
}

function updateBrushPosition(mousePosition, terrain, brush) {
    raycaster.setFromCamera(mousePosition, camera);
    const result = raycaster.intersectObject(terrain.getMesh());
    if (result.length > 0) {
        const point = result[0].point;
        brush.position.set(point.x, point.y, point.z);
        render();
    }
}

function setup() {
    canvas = document.getElementById("canvas");
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ canvas: canvas });
    const pixelRatio = window.devicePixelRatio;
    renderer.setSize(canvas.clientWidth * pixelRatio, canvas.clientHeight * pixelRatio, false);

    // add terrain
    const terrain = new Terrain(WIDTH, HEIGHT, DEPTH, 1);
    scene.add(terrain.getMesh());

    // add editing brush
    const brushMat = new THREE.MeshPhongMaterial({ color: 0xffff00, transparent: true, opacity: 0.5 });
    const brushGeo = new THREE.SphereGeometry(1.5, 16, 16);
    const brush = new THREE.Mesh(brushGeo, brushMat);
    scene.add(brush);

    // addAxis();

    // add lights
    const dLight = new THREE.DirectionalLight(0xFFFFFF, 0.5);
    dLight.position.set(-5, 2, 10);
    scene.add(dLight);

    let ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    scene.background = new THREE.Color("#3a3a3a");
    camera.position.set(15, 20, 20);

    controls = new THREE.OrbitControls(camera, canvas);
    controls.listenToKeyEvents(window);
    controls.addEventListener('change', render);

    window.addEventListener('resize', onWindowResize);

    const mousePointer = new THREE.Vector2();
    canvas.onmousemove = (e) => {
        mousePointer.x = ( e.clientX / window.innerWidth ) * 2 - 1;
        mousePointer.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
        updateBrushPosition(mousePointer, terrain, brush);
    }

    canvas.onclick = (e) => {
        let point = brush.position;

        if (whichKeyPress === "Shift") {
            // raise the terrain
            terrain.makeShape(5, point, -1);
            render();
        } else if (whichKeyPress === "Z") {
            // depress the terrain
            terrain.makeShape(5, point, 1);
            render();
        }
    }

    document.addEventListener('keydown', (e) => {
        const key = e.key;
        if (key === "Shift") {
            whichKeyPress = "Shift";
            return;
        }
        if (key.toUpperCase() === "Z") {
            whichKeyPress = "Z";
            return;
        }
        whichKeyPress = "NONE";
    });
    document.addEventListener('keyup', () => {
        whichKeyPress = "NONE";
    });
}

function render() {
    renderer.render(scene, camera);
}

setup();
render();
