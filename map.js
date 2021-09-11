

import * as CFG from './config.js';
import {scene} from './init.js';



// load astnchonously XML file with map data

fetch(`bgmap-level-${CFG.MAP_LEVEL}.xml`)
  .then(response => response.text())
  .then( text => parseXML( new DOMParser().parseFromString(text,"text/xml") ) );
 
 
 
 
 
 
 function parseXML( xml )
 {
	var xmlElems = xml.getElementsByTagName( 'mxCell' );

	var map = {};
	
	for( var xmlElem of xmlElems )
	{
		var name = xmlElem.getAttribute( 'value' );
		
		// empty names
		if( !name ) continue;
		
		// bad names
		if( name.indexOf( '<' )!=-1 )
		{
			console.warn( `Invalid XML value attribute: ${name}` );
			continue;
		}

		// extract points
		function extractVectors( queryString )
		{
			var xmlPoints =  xmlElem.querySelectorAll( 'mxGeometry '+queryString );
			
			var result = [];
			
			for( var xmlPoint of xmlPoints )
			{
				var x = parseFloat( xmlPoint.getAttribute( 'x' ) ),
					y = parseFloat( xmlPoint.getAttribute( 'y' ) );
				
				result.push( new THREE.Vector2( x, y ) );
			}
			
			return result;
		}
		 
		map[name] = [];
		
		map[name].push( ...extractVectors( 'mxPoint[as="sourcePoint"' ) );
		map[name].push( ...extractVectors( 'Array[as="points"] mxPoint' ) );
		map[name].push( ...extractVectors( 'mxPoint[as="targetPoint"' ) );
	}
	
	mapData( map );
 }
 
 
 
function mapData( map )
{
	var country = generateCountry( map.BG, 'crimson', 10 );
		//scene.add( country );

	for( var name in map )
		if( name!='BG' )
		{
			var e = 15+240*Math.random();
				var region = generateCountry( map[name], new THREE.Color( 1, e/255, e/255 ), 10 );
					region.position.copy( country.position );
					region.scale.copy( country.scale );
					region.position.y = country.position.y/10*10;
				scene.add( region );
		}
 }
 
 
 function generateCountry( mapShape, color = 'white', elevation = 20 )
 {
	var shape = new THREE.Shape( mapShape );
	 
	var extrudeSettings = { depth: elevation, bevelEnabled: true, bevelSegments: 10, steps: 1, bevelSize: 5, bevelThickness: 5 };

	var geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
		geometry.computeBoundingBox();
		
	var scale = CFG.MAP_WIDTH/(geometry.boundingBox.max.x - geometry.boundingBox.min.x);
	
	var mesh = new THREE.Mesh( geometry, new THREE.MeshPhongMaterial( {color: color, shininess:100} ) );
		mesh.position.x = -scale*(geometry.boundingBox.max.x+geometry.boundingBox.min.x)/2;
		mesh.position.z = -scale*(geometry.boundingBox.max.y+geometry.boundingBox.min.y)/2;
		mesh.position.y = scale*elevation;
		mesh.scale.set( scale, scale, scale );
		mesh.rotation.x = Math.PI/2;
		mesh.castShadow = true;
		mesh.receiveShadow = true;
	
	return mesh;
 }
 
 
 