(function () {
  let scene,
  renderer,
  camera,
  model,
  possibleAnims,
  mixer,
  idle,
  clock = new THREE.Clock(),
  currentlyAnimating = false,
  loaderAnim = document.getElementById('js-loader'),
  socket = io.connect();

  init();

  function init() {

    const MODEL_PATH = '/model/shiba.glb';
    const canvas = document.querySelector('#c');
    const backgroundColor = 0xf1f1f1;

    // Init the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    scene.fog = new THREE.Fog(backgroundColor, 60, 100);

    // Init the renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    // Add a camera
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

    camera.position.z = 30;
    camera.position.x = 0;
    camera.position.y = -3;

    let shijo_txt = new THREE.TextureLoader().load('/model/Image_0.png');
    shijo_txt.flipY = false;

    const shijo_mtl = new THREE.MeshPhongMaterial({
      map: shijo_txt,
      color: 0xffffff,
      skinning: true });

    var loader = new THREE.GLTFLoader();

    loader.load(
    MODEL_PATH,
    function (gltf) {
      model = gltf.scene;
      let fileAnimations = gltf.animations;

      model.traverse(o => {

        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          o.material = shijo_mtl;
        }
      });

      model.scale.set(7, 7, 7);
      model.position.y = -11;

      scene.add(model);

      loaderAnim.remove();

      mixer = new THREE.AnimationMixer(model);

      let clips = fileAnimations.filter(val => val.name !== 'standing');
      possibleAnims = clips.map(val => {
        let clip = THREE.AnimationClip.findByName(clips, val.name);

        clip.tracks.splice(3, 3);
        clip.tracks.splice(9, 3);

        clip = mixer.clipAction(clip);
        return clip;
      });

      let idleAnim = THREE.AnimationClip.findByName(fileAnimations, 'standing');

      idleAnim.tracks.splice(3, 3);
      idleAnim.tracks.splice(9, 3);

      idle = mixer.clipAction(idleAnim);
      idle.play();

    },
    undefined,
    function (error) {
      console.error(error);
    });

    // Add lights
    let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.61);
    hemiLight.position.set(0, 50, 0);
    // Add hemisphere light to scene
    scene.add(hemiLight);

    let d = 8.25;
    let dirLight = new THREE.DirectionalLight(0xffffff, 0.54);
    dirLight.position.set(-8, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize = new THREE.Vector2(1024, 1024);
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 1500;
    dirLight.shadow.camera.left = d * -1;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = d * -1;
    // Add directional Light to scene
    scene.add(dirLight);


    // Floor
    let floorGeometry = new THREE.PlaneGeometry(5000, 5000, 1, 1);
    let floorMaterial = new THREE.MeshPhongMaterial({
      color: 0xeeeeee,
      shininess: 0 });


    let floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -0.5 * Math.PI;
    floor.receiveShadow = true;
    floor.position.y = -11;
    scene.add(floor);

    let geometry = new THREE.SphereGeometry(8, 32, 32);
    let material = new THREE.MeshBasicMaterial({ color: 0x9bffaf });
    let sphere = new THREE.Mesh(geometry, material);

    sphere.position.z = -15;
    sphere.position.y = -2.5;
    sphere.position.x = -0.25;
    scene.add(sphere);
  }

  function update() {
    if (mixer) {
      mixer.update(clock.getDelta());
    }

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);
    requestAnimationFrame(update);
  }

  update();

  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let canvasPixelWidth = canvas.width / window.devicePixelRatio;
    let canvasPixelHeight = canvas.height / window.devicePixelRatio;

    const needResize =
    canvasPixelWidth !== width || canvasPixelHeight !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  socket.on('connect', function (data) {
    socket.emit('join', 'Server Connected to Client');
  });

  socket.on('messages', function (data) {
    console.log(data);
  });

  socket.on('speechData', function (data) {
    var dataFinal = undefined || data.results[0].isFinal;
    var text = document.getElementById("spoken");

    if (dataFinal === true) {
      // Log final string
      let finalString = data.results[0].alternatives[0].transcript;
      console.log("Google Speech sent 'final' Sentence and it is:");
      console.log(finalString);
      text.innerHTML = "You said " + finalString + ".";

      if (finalString == "play dead") {
        if (!currentlyAnimating) {
          currentlyAnimating = true;
          playModifierAnimation(idle, 0.25, possibleAnims[0], 0.25);
        }
      } else if (finalString == "rollover") {
        if (!currentlyAnimating) {
          currentlyAnimating = true;
          playModifierAnimation(idle, 0.25, possibleAnims[1], 0.25);
        }
      } else if (finalString == "shake" || finalString == "Shake") {
        if (!currentlyAnimating) {
          currentlyAnimating = true;
          playModifierAnimation(idle, 0.25, possibleAnims[2], 0.25);
        }
      } else if (finalString == "sit") {
        if (!currentlyAnimating) {
          currentlyAnimating = true;
          playModifierAnimation(idle, 0.25, possibleAnims[3], 0.25);
        }
      }
    }
  });

  function playModifierAnimation(from, fSpeed, to, tSpeed) {
    to.setLoop(THREE.LoopOnce);
    to.reset();
    to.play();
    from.crossFadeTo(to, fSpeed, true);
    setTimeout(function () {
      from.enabled = true;
      to.crossFadeTo(from, tSpeed, true);
      currentlyAnimating = false;
    }, to._clip.duration * 1000 - (tSpeed + fSpeed) * 1000);
  }

})();
