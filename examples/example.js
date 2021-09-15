


var renderer = new THREE.WebGLRenderer( {antialias:true} );
	renderer.setAnimationLoop( animate );
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.VSMShadowMap;

	document.body.appendChild( renderer.domElement );


var scene = new THREE.Scene();
	scene.background = new THREE.Color( 'white' );


var camera = new THREE.PerspectiveCamera( 60, 1, 1, 1000 );
	camera.position.set( 0, 40, 0 );
	camera.position.set( 0, 40, 0 );
	//camera.position.set( 0, 30, 40 );
	camera.lookAt( scene.position );


var light = new THREE.SpotLight( 'white' );
	light.position.set( 0, 100, -100 );
	light.target = scene;
	light.angle = Math.PI*0.07;
	light.penumbra = 1;
	light.castShadow = true;
	light.shadow.mapSize.width = 2048; 
	light.shadow.mapSize.height = 2048; 
	light.shadow.camera.near = 100; 
	light.shadow.camera.far = 300; 
	light.shadow.camera.left = -2; 
	light.shadow.camera.right = 2; 
	light.shadow.camera.top = -2; 
	light.shadow.camera.bottom = 2; 
	light.shadow.bias = -0.005;
	light.shadow.radius = 10;

	scene.add( light );

	scene.add( new THREE.AmbientLight( 'white', 0.5 ) );


var controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls.maxPolarAngle = Math.PI * 0.4;
	controls.minDistance = 1;
	controls.maxDistance = 70;
	controls.enableDamping = !true;
	controls.dampingFactor = 0.5;
	controls.rotateSpeed = 0.3;
	controls.panSpeed = 0.7;
	controls.screenSpacePanning = false;
	controls.target.set( 0, 0, 0 );
	controls.update();
	
			
var MAP_THICK = 1,
	MAP_PADDING = 4,
	geometry = new THREE.BoxGeometry(
				MAP_WIDTH + 2*MAP_PADDING,
				MAP_THICK,
				MAP_HEIGHT + 2*MAP_PADDING
			),
	material = new THREE.MeshStandardMaterial( {
				color: 'gray',
				roughness: 0.6,
				metalness: 0.3,
				emissive: 'cornflowerblue',
				emissiveIntensity: 0.2,
				polygonOffset: true,
				polygonOffsetUnits: 2,
				polygonOffsetFactor: 2,
			} ),
	base = new THREE.Mesh( geometry, material );
	base.position.y = -MAP_THICK/2;
	base.receiveShadow = true;

	scene.add( base );


window.addEventListener( 'resize', onWindowResize, false );

onWindowResize();


function onWindowResize( event )
{
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight, true );
}			


function animate( time )
{
	renderer.render( scene, camera );
}

export {scene};