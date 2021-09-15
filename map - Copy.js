
// standalone library
//
// class Map
//		constructor( xmlFilename, onLoad(regions), options{roundness,width:height} )
//		mapGeometry3D( regionName ) - THREE.BufferGeometry for THREE.Mesh
//		mapGeometry2D( regionName ) - THREE.BufferGeometry for THREE.Line
//	private
//		parseXML( xml )

//import {BufferGeometryUtils} from './js/BufferGeometryUtils.js';


// load astnchonously XML file with map data
export class Map
{
	
	constructor( xmlFilename, onLoad, options )
	{
		var that = this;
		
		this.regions = {}; // THREE.Shape objects
		this.onLoad = onLoad; // called when the map regions are created
		this.context = null;

//		this.img = new Image();
//		this.img.onload = function()
//		{
//			var canvas = document.createElement( 'canvas' );
//			canvas.width = that.img.width;
//			canvas.height = that.img.height;
			
//			that.context = canvas.getContext( '2d' );
//			that.context.drawImage( that.img, 0, 0 );
	
//		}

//		this.img.src = './diagrams/heightmap-blur.jpg';
//		img.src = './diagrams/heightmap - Copy.jpg';

  
		this.scale = 1;
		this.center = {x:0, z:0};
		this.options = options || {};
		
		if( this.options.roundness === undefined ) this.options.roundness = 25;
		if( this.options.width  === undefined ) this.options.width  = MAP_WIDTH  ? MAP_WIDTH  : 45;
		if( this.options.height === undefined ) this.options.height = MAP_HEIGHT ? MAP_HEIGHT : 28;

		fetch( xmlFilename )
		  .then( response => response.text() )
		  .then( text => that.#parseXML( new DOMParser().parseFromString(text,"text/xml") ) );

	} // Map
 
 
	// parses XML DOM into object with elements province names and values THREE.Shape
	// parses XML DOM into object with elements province names and values THREE.Shape
	#parseXML( xml )
	{
		var minX = Infinity, maxX = -Infinity,
			minY = Infinity,maxY = -Infinity;
		
		var xmlElems = xml.getElementsByTagName( 'mxCell' );

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
		
					minX = Math.min( minX, x );
					maxX = Math.max( maxX, x );
					
					minY = Math.min( minY, y );
					maxY = Math.max( maxY, y );
					
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
				
				if( distPrev<7 && distNext<7 )
				{
					// point [i] is vertex, realign previous and next points
					points[iPrev] = points[iPrev].lerpVectors( points[i], points[iPrevPrev], 0.001 );
					points[iNext] = points[iNext].lerpVectors( points[i], points[iNextNext], 0.001 );
				}
						
			}
			
			// generate rounded shape
			var shape = new THREE.Shape( ),
				roundness =  this.options.roundness;

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

			this.regions[name] = shape;
		}

		this.scale = Math.min( this.options.width/(maxX-minX), this.options.height/(maxY-minY) );
		this.center.x = -this.scale*(maxX+minX)/2;
		this.center.z = -this.scale*(maxY+minY)/2;

		if( this.onLoad ) this.onLoad( this );
		
	} // Map.parseXML
 
	/*
	heightmapGeometry3D( )
	{
		var geometry = new THREE.BoxGeometry( this.options.width, 1, this.options.height, 25, 1, 15 )
		
		//geometry.computeVertexNormals();

		var pos = geometry.getAttribute( 'position' );
		var nor = geometry.getAttribute( 'normal' );
		for( var i=0; i<pos.count; i++ )
if( pos.getY(i)>0.45 )
			{
				var x = pos.getX( i ),
					z = pos.getZ( i );
					
				var xx = Math.round((this.img.width-1)*(x+this.options.width/2)/this.options.width);
				var yy = Math.round((this.img.height-1)*(z+this.options.height/2)/this.options.height);
				
				var pixel = this.context.getImageData( xx, yy, 1, 1 ).data[0];
		
				var y = pixel/200;
				//y = Math.pow(y,1/2);
				//y = 0.5-0.5*Math.cos(y*Math.PI);
				pos.setY( i, y );
			}
	
console.log(geometry.getAttribute( 'position' ).count);	
		geometry = BufferGeometryUtils.mergeVertices( geometry, 0.1 );
console.log(geometry.getAttribute( 'position' ).count);	

		geometry.computeVertexNormals();
		
		return geometry;
	}

	tesselate( geometry )
	{
		var tess = new THREE.TessellateModifier( 1/4, 20 );
		geometry = tess.modify( geometry );
console.log(geometry.getAttribute( 'position' ).count);	
		geometry = BufferGeometryUtils.mergeVertices( geometry, 0.3 );
console.log(geometry.getAttribute( 'position' ).count);	
		return geometry;
	}
	*/
	
	mapGeometry3D( regionName )
	{
		var shape = this.regions[regionName],
			extrudeSettings = { depth: 1, bevelEnabled: false, steps: 1 },
			geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings )
				.rotateX( Math.PI/2 )
				.scale( this.scale, 1, this.scale )
				.translate( this.center.x, 1, this.center.z );
/*
		if( this.options.heightmap )
		{
			geometry = this.tesselate( geometry );
		var pos = geometry.getAttribute( 'position' );
		var nor = geometry.getAttribute( 'normal' );
		for( var i=0; i<pos.count; i++ )
if( pos.getY(i)>0.45 )
			{
				var x = pos.getX( i ),
					z = pos.getZ( i );
					
				var xx = Math.round((this.img.width-1)*(x+this.options.width/2)/this.options.width);
				var yy = Math.round((this.img.height-1)*(z+this.options.height/2)/this.options.height);
				
				var pixel = this.context.getImageData( xx, yy, 1, 1 ).data[0];
		
				var y = pixel/200;
				
				//y = Math.pow(y,1/2);
				y = 0.5-0.5*Math.cos(y*Math.PI);
				pos.setY( i, pos.getY(i)+3*y );
			}
		} 
		geometry.computeVertexNormals();
		*/
		return geometry;
	} // Map.mapGeometry3D
 
	
	mapGeometry2D( regionName )
	{
		var shape = this.regions[regionName],
			geometry = new THREE.BufferGeometry().setFromPoints( shape.extractPoints(12).shape )
				.rotateX( Math.PI/2 )
				.scale( this.scale, 1, this.scale )
				.translate( this.center.x, 1.01, this.center.z );
				
		return geometry;
	} // Map.mapGeometry2D
	
} // Map
 


