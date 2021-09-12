
// standalone library
//
// class Map
//		constructor( xmlFilename, onLoad(regions), options{roundness,width:height} )
//		mapGeometry3D( regionName ) - THREE.BufferGeometry for THREE.Mesh
//		mapGeometry2D( regionName ) - THREE.BufferGeometry for THREE.Line
//	private
//		parseXML( xml )


// load astnchonously XML file with map data
export class Map
{
	
	constructor( xmlFilename, onLoad, options )
	{
		this.regions = {}; // THREE.Shape objects
		this.onLoad = onLoad; // called when the map regions are created

		this.scale = 1;
		this.center = {x:0, z:0};
		this.options = options || {};
		
		this.options.roundness = this.options.roundness ? this.options.roundness : 25;
		this.options.width = this.options.width ? this.options.width : 1;
		this.options.height = this.options.height ? this.options.height : 1;
		
		fetch( xmlFilename )
		  .then( response => response.text() )
		  .then( text => this.#parseXML( new DOMParser().parseFromString(text,"text/xml") ) );
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
				
				if( distPrev<10 && distNext<10 )
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
 
	
	mapGeometry3D( regionName )
	{
		var shape = this.regions[regionName],
			extrudeSettings = { depth: 1, bevelEnabled: false, steps: 1 },
			geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings )
				.rotateX( Math.PI/2 )
				.scale( this.scale, 1, this.scale )
				.translate( this.center.x, 1, this.center.z );
				
		return geometry;
	} // Map.mapGeometry3D
 
	
	mapGeometry2D( regionName )
	{
		var shape = this.regions[regionName],
			geometry = new THREE.BufferGeometry().setFromPoints( shape.extractPoints(12).shape )
				.rotateX( Math.PI/2 )
				.scale( this.scale, 1, this.scale )
				.translate( this.center.x, 1, this.center.z );
				
		return geometry;
	} // Map.mapGeometry2D
	
} // Map
 


