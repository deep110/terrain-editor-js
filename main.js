const ISO_LEVEL = 0;

const WIDTH = 16;
const HEIGHT = WIDTH;
const DEPTH = WIDTH;

var scene;
var camera;
var renderer;
var canvas;


class Terrain {
    constructor(width, height, depth, sampleSize) {
        this.xMax = Math.floor(width / (2 * sampleSize));
        this.yMax = Math.floor(height / (2 * sampleSize));
        this.zMax = Math.floor(depth / (2 * sampleSize));
        this.sampleSize = sampleSize;

        this.xMax2 = 2 * this.xMax;
        this.yMax2 = 2 * this.yMax;
        this.zMax2 = 2 * this.zMax;
        this.fieldBuffer = new Float32Array((this.xMax+1) * (this.yMax + 1) * (this.zMax + 1) * 8);

        // noise values
        this.seed = 6;
        this.numOctaves = 4;
        this.simplex = new SimplexNoise();

        // graphics
        this.geometry = new THREE.BufferGeometry();
        this.material = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
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

    regenerateMesh() {}

    generateHeightField() {
        for (let i = -this.xMax; i < this.xMax + 1; i++) {
            let x = i * this.sampleSize;
            for (let j = -this.yMax; j < this.yMax + 1; j++) {
                let y = j * this.sampleSize;
                for (let k = -this.zMax; k < this.zMax + 1; k++) {
                    let z = k * this.sampleSize;
                    this.setField(i + this.xMax, j + this.yMax, k + this.zMax, this.#sphereField(x, y, z));
                }
            }
        }
    }

    #sphereField(x, y, z) {
        return Math.sqrt(x * x + y * y + z * z) - WIDTH/2;
    }
}

function addTerrain() {
    const sampleSize = 1;
    let terrain = new Terrain(WIDTH, HEIGHT, DEPTH, sampleSize);

    scene.add(terrain.getMesh());

    const boxGeo = new THREE.BoxGeometry();
    const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const material2 = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const material3 = new THREE.MeshPhongMaterial({ color: 0x0000ff });
    
    temp(boxGeo, material, 4, 0, 0, 1);
    temp(boxGeo, material2, 0, 4, 0, 2);
    temp(boxGeo, material3, 0, 0, 4, 3);

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

function setup() {
    canvas = document.getElementById("canvas");
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ canvas: canvas });
    const pixelRatio = window.devicePixelRatio;
    renderer.setSize(canvas.clientWidth * pixelRatio, canvas.clientHeight * pixelRatio, false);

    addTerrain();

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
