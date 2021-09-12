

var renderer = new THREE.WebGLRenderer( {antialias:true} );
	renderer.setAnimationLoop( animate );
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.VSMShadowMap;

	document.body.appendChild( renderer.domElement );


var scene = new THREE.Scene();
	scene.background = new THREE.Color( 'white' );


var camera = new THREE.PerspectiveCamera( 60, 1, 1, 1000 );
	camera.position.set( 0, 30, 0 );
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
	light.shadow.radius = 10;

	scene.add( light );

	scene.add( new THREE.AmbientLight( 'white', 0.5 ) );


//var axesHelper = new THREE.AxesHelper( 100 );
//	scene.add( axesHelper );
	

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