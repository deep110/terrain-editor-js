const ISO_LEVEL = 0;

const WIDTH = 16;
const HEIGHT = WIDTH;
const DEPTH = WIDTH;

var scene;
var camera;
var renderer;
var canvas;


class TerrainNoiseField {
    constructor() {
        this.seed = 6;
        this.numOctaves = 4;
        this.simplex = new SimplexNoise();
    }

    generate(xMax, yMax, zMax, sampleSize, ms) {
        for (let i = -xMax; i < xMax + 1; i++) {
            let x = i * sampleSize;
            for (let j = -yMax; j < yMax + 1; j++) {
                let y = j * sampleSize;
                for (let k = -zMax; k < zMax + 1; k++) {
                    let z = k * sampleSize;
                    ms.setField(i + xMax, j + yMax, k + zMax, this.#sphereField(x, y, z));
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

    const whiteMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    let terrainGeometry = new THREE.BufferGeometry();
    let terrainNoiseField = new TerrainNoiseField();

    let marchingCubes = new MarchingCubes(WIDTH, HEIGHT, DEPTH, sampleSize);
    terrainNoiseField.generate(marchingCubes.xMax, marchingCubes.yMax, marchingCubes.zMax, sampleSize, marchingCubes);

    marchingCubes.generateMesh(terrainGeometry, ISO_LEVEL);

    const mesh = new THREE.Mesh(terrainGeometry, whiteMaterial);
    scene.add(mesh);

    const boxGeo = new THREE.BoxGeometry();
    const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    
    temp(boxGeo, material, 20, 0, 0);
    temp(boxGeo, material, 0, 0, 15);
    temp(boxGeo, material, 0, 40, 0);

    function temp(geo, mat, x, y, z) {
        const c0 = new THREE.Mesh(geo, mat);
        c0.position.x = x;
        c0.position.y = y;
        c0.position.z = z;
    
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
