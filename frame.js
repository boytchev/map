

import * as CFG from './config.js';
import {scene} from './init.js';



class Frame extends THREE.Mesh
{
	constructor()
	{
		var geometry = new THREE.BoxGeometry(
							CFG.MAP_WIDTH + 2*CFG.MAP_BORDER,
							CFG.MAP_THICK,
							CFG.MAP_HEIGHT + 2*CFG.MAP_BORDER
						);

		var material = new THREE.MeshStandardMaterial( {
							color: 'dimgray',
							roughness: 1,
							metalness: 0,
							emissive: 'cornflowerblue',
							emissiveIntensity: 0.1,
						} );

		super( geometry, material );

		this.position.y = -CFG.MAP_THICK/2;
		this.receiveShadow = true;
	} // Frame.constructor
} // Frame
	
	

var frame = new Frame();	

scene.add( frame );
