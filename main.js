var scene;
var camera;
var renderer;
var canvas;


function getLight(...pos) {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...pos);
    return light;
}

function getCube(geometry) {
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    return new THREE.Mesh(geometry, material);
}

function onWindowResize() {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    controls.handleResize();
}

function setup() {
    canvas = document.getElementById("canvas");
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ canvas: canvas });
    const pixelRatio = window.devicePixelRatio;
    renderer.setSize(canvas.clientWidth * pixelRatio, canvas.clientHeight * pixelRatio, false);

    const geometry = new THREE.BoxGeometry();

    let cube = getCube(geometry);
    scene.add(cube);
    scene.add(getLight(-1, 2, 10));

    scene.background = new THREE.Color("#3a3a3a");
    camera.position.z = 5;

    controls = new THREE.OrbitControls(camera, canvas);
    controls.listenToKeyEvents(window);
    // controls.addEventListener('change', render);

    window.addEventListener('resize', onWindowResize);
}

function render() {
    renderer.render(scene, camera);

    requestAnimationFrame(render);
}

setup();
render();