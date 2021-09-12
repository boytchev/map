

import * as CFG from './config.js';
import {scene} from './init.js';



// load astnchonously XML file with map data

fetch(`bgmap-level-${CFG.MAP_LEVEL}.xml`)
  .then(response => response.text())
  .then( text => parseXML( new DOMParser().parseFromString(text,"text/xml") ) );
 
 
 
 
 
 // parses XML DOM into object with elements province names and values THREE.Shape
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
				var x = parseFloat( xmlPoint.getAttribute( 'x' ) || '0' ),
					y = parseFloat( xmlPoint.getAttribute( 'y' ) || '0' );
				
				result.push( new THREE.Vector2( x, y ) );
			}
			
			return result;
		}
		
		// collect arra of all vertices
		var points = [
			...extractVectors( 'mxPoint[as="sourcePoint"' ),
			...extractVectors( 'Array[as="points"] mxPoint' ),
			//...extractVectors( 'mxPoint[as="targetPoint"' )
		];
		
		// fix sharp edges
		for( var i=0; i<points.length; i++ )
		{
			var iPrevPrev = (i-2+points.length)%points.length,
				iPrev     = (i-1+points.length)%points.length,
				iNext     = (i+1)%points.length,
				iNextNext = (i+2)%points.length;
				
			var distPrev = points[iPrev].distanceTo(points[i]),
				distNext = points[iNext].distanceTo(points[i]);
			
			if( distPrev<10 && distNext<10 )
			{
				// point [i] is vertex, realign previous and next points
				points[iPrev] = points[iPrev].lerpVectors( points[i], points[iPrevPrev], 0.001 );
				points[iNext] = points[iNext].lerpVectors( points[i], points[iNextNext], 0.001 );
			}
					
		}
		
		
		
		// generate rounded shape
		var shape = new THREE.Shape( ),
			roundness = CFG.ROUNDNESS;

		var v = new THREE.Vector2();
		
		function lerp( idx1, idx2, start )
		{
			var distance = points[idx1].distanceTo(points[idx2]),
				alpha = THREE.Math.clamp( roundness/distance, 0, 0.5 );
			v.lerpVectors( points[idx1], points[idx2], start?alpha:1-alpha );
		}
		
		lerp( 0, 1, true );
		shape.moveTo( v.x, v.y );

		for( var i=0; i<points.length; i++ )
		{
			var i1 = (i+1)%points.length,
				i2 = (i+2)%points.length;
			
			lerp( i, i1, false );
			shape.lineTo( v.x, v.y );
			
			lerp( i1, i2, true );
			shape.quadraticCurveTo( points[i1].x, points[i1].y, v.x, v.y );
		}			

		map[name] = shape;
	}

	mapData( map );
 }
 
 
 
function generateCountry( mapShape, color = 'white', height = 1 )
{
	var extrudeSettings = { depth: 1, bevelEnabled: !true, bevelSegments: 10, steps: 1, bevelSize: 5, bevelThickness: 5 };

	var geometry = new THREE.ExtrudeGeometry( mapShape, extrudeSettings );
		geometry.computeBoundingBox();
		geometry.computeBoundingSphere();

	var material = new THREE.MeshStandardMaterial( {
						color: color,
						roughness: 1,
						metalness: 0,
						polygonOffset: true,
						polygonOffsetUnits: -0.1,
						polygonOffsetFactor: -0.1,
					} );
					
	var scale = CFG.MAP_WIDTH/(geometry.boundingBox.max.x - geometry.boundingBox.min.x);

	var mesh = new THREE.Mesh( geometry, material );
		mesh.position.x = -scale*(geometry.boundingBox.max.x+geometry.boundingBox.min.x)/2;
		mesh.position.z = -scale*(geometry.boundingBox.max.y+geometry.boundingBox.min.y)/2;
		mesh.position.y = height;
		mesh.scale.set( scale, scale, height );
		mesh.rotation.x = Math.PI/2;
		mesh.castShadow = true;
		mesh.receiveShadow = true;

	return mesh;
}


function generateProvince( country, mapShape, color = 'white', height = 1 )
{
	var extrudeSettings = { depth: 1, bevelEnabled: !true, bevelSegments: 10, steps: 1, bevelSize: 5, bevelThickness: 5 };

	var geometry = new THREE.ExtrudeGeometry( mapShape, extrudeSettings );
		geometry.computeBoundingBox();
		geometry.computeBoundingSphere();

	var material = new THREE.MeshStandardMaterial( {
						color: color,
						roughness: 1,
						metalness: 0,
						polygonOffset: true,
						polygonOffsetUnits: -0.1,
						polygonOffsetFactor: -0.1,
					} );
					
	var mesh = new THREE.Mesh( geometry, material );
		mesh.position.set( country.position.x, height+0.01, country.position.z );
		mesh.scale.set( country.scale.x, country.scale.y, height );
		mesh.rotation.copy( country.rotation );
		mesh.castShadow = true;
		mesh.receiveShadow = true;

	return mesh;
}


function generateCountryBorder( mapShape, color = 'black', height = 1 )
{
	var geometry = new THREE.BufferGeometry().setFromPoints( mapShape.extractPoints(12).shape );
		geometry.computeBoundingBox();
		
	var scale = CFG.MAP_WIDTH/(geometry.boundingBox.max.x - geometry.boundingBox.min.x);

	var line = new THREE.Line( geometry, new THREE.LineBasicMaterial( {color: color} ) );
		line.position.x = -scale*(geometry.boundingBox.max.x+geometry.boundingBox.min.x)/2;
		line.position.z = -scale*(geometry.boundingBox.max.y+geometry.boundingBox.min.y)/2;
		line.position.y = height+0.02;
		line.scale.set( scale, scale, 1 );
		line.rotation.x = Math.PI/2;

	return line;
}


function generateProvinceBorder( country, mapShape, color = 'black', height = 1 )
{
	var geometry = new THREE.BufferGeometry().setFromPoints( mapShape.extractPoints(12).shape );

	var line = new THREE.Line( geometry, new THREE.LineBasicMaterial( {color: color} ) );
		line.position.set( country.position.x, height+0.02, country.position.z );
		line.scale.copy( country.scale );
		line.rotation.copy( country.rotation );

	return line;
}


 function mapData( map )
{
	var country = generateCountry( map.BG, 'crimson', 1 );
	var countryBorder = generateCountryBorder( map.BG, 'black', 10.5 );
	//scene.add( country );
	//scene.add( /*country,*/ countryBorder );

	for( var name in map )
		if( name!='BG' )
		{
			var e = 15+240*Math.random();
			var province = generateProvince( country, map[name], new THREE.Color( e/255, e/255, 1-e/255 ), e/200 );
			
			scene.add( province );

			var provinceBorder = generateProvinceBorder( country, map[name], 'black', e/200 );
			
			//scene.add( provinceBorder );
		}
		
}
 
 
