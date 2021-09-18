
// bgmap.js
//
// class Map
//		constructor( xmlFilename, onLoad, {options} )
//		geometry3D( regionName )
//		geometry2D( regionName )
//		region3D ( regionName, {height}, {color} )
//		region2D ( regionName, {height}, {color} )
//	private
//		#parseXML( xml )



// load astnchonously XML file with map data
export class Map
{
	
	constructor( xmlFilename, onLoad, options )
	{
		var that = this;
		
		this.points = {}; // THREE.Vector2 objects
		this.labels = {}; // THREE.Vector2 object
		this.regions = {}; // THREE.Shape objects
		this.onLoad = onLoad; // called when the map regions are created
		this.context = null;
  
		this.mapScale = 1;
		this.mapCenter = {x:0, z:0};
		this.options = options || {};
		
		if( this.options.roundness === undefined ) this.options.roundness = 25;
		if( this.options.width  === undefined ) this.options.width  = MAP_WIDTH  ? MAP_WIDTH  : 45;
		if( this.options.height === undefined ) this.options.height = MAP_HEIGHT ? MAP_HEIGHT : 28;

		fetch( xmlFilename )
		  .then( response => response.text() )
		  .then( text => that.#parseXML( new DOMParser().parseFromString(text,"text/xml") ) );

	} // BGMap
 
 
	// parses XML DOM into object with elements province names and values THREE.Shape
	#parseXML( xml )
	{
		var minX = Infinity, maxX = -Infinity,
			minY = Infinity, maxY = -Infinity;
		
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
				var xmlPoints =  xmlElem.querySelectorAll( queryString );
				
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
				...extractVectors( 'mxGeometry mxPoint[as="sourcePoint"' ),
				...extractVectors( 'mxGeometry Array[as="points"] mxPoint' ),
				//...extractVectors( 'mxPoint[as="targetPoint"' )
			];
			
			// get label position
			{
				var closedPoints = [ ...points, ...extractVectors( 'mxPoint[as="targetPoint"' ) ];
				var v = extractVectors( 'mxGeometry' )[0],
					relativePos = v.x,
					orthoDistance = v.y,
					labelOffset = extractVectors( 'mxGeometry mxPoint[as="offset"' )[0];
			
//if( name=='SO' )
//{
//	console.log('relativePos',relativePos);
//}
				relativePos = 0.5 + relativePos/2; // [-1,1]->[0,1]
				
				// calculate path length
				var sharpShape = new THREE.Shape( closedPoints );
				var labelPos = sharpShape.getPointAt( relativePos );
//if( name=='SO' )
//{
//	console.log('orthoDistance',orthoDistance);
//	console.log('labelOffset',labelOffset);
//	console.log('labelPos',labelPos);
//}
				var p1, p2;
				if( relativePos>0.99 )
				{
					p1 = sharpShape.getPointAt( relativePos );
					p2 = sharpShape.getPointAt( relativePos-0.01 );
				}
				else
				{
					p1 = sharpShape.getPointAt( relativePos+0.01 );
					p2 = sharpShape.getPointAt( relativePos+0.001 );
				}
				var firstSegment = new THREE.Vector2().subVectors( p1, p2 );
				var orthoSegment = new THREE.Vector2( firstSegment.y, -firstSegment.x );
//if( name=='SO' )
//{
//	console.log('firstSegment',firstSegment);
//	console.log('orthoSegment',orthoSegment);
//}
				orthoSegment.setLength( orthoDistance );
//if( name=='SO' )
//{
//	console.log('orthoSegment',orthoSegment,orthoSegment.length());
//}
				labelPos.add( orthoSegment ).add( labelOffset );
//if( name=='SO' )
//{
//	console.log('label+ortho+offset',labelPos);
//}
	
				this.labels[name] = labelPos;
			}
			
			
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
			this.points[name] = points;
		}

		this.mapScale = Math.min( this.options.width/(maxX-minX), this.options.height/(maxY-minY) );
		this.mapCenter.x = -this.mapScale*(maxX+minX)/2;
		this.mapCenter.z = -this.mapScale*(maxY+minY)/2;

		if( this.onLoad ) this.onLoad( this );
		
	} // Map.parseXML
 

	
	geometry3D( regionName )
	{

		if( this.regions[regionName]===undefined )
			throw `Unknown regions id '${regionName}'`;
		
		var shape = this.regions[regionName],
			extrudeSettings = { depth: 1, bevelEnabled: false, steps: 1 },
			geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings )
				.rotateX( Math.PI/2 )
				.scale( this.mapScale, 1, this.mapScale )
				.translate( this.mapCenter.x, 1, this.mapCenter.z );
				
		return geometry;
		
	} // Map.geometry3D
 
 
	
	region3D( regionName, height = 1, color = 'white' )
	{
		var geometry = this.geometry3D( regionName ),
			material = new THREE.MeshStandardMaterial( {
								color: color,
								roughness: 1,
								metalness: 0,
							} ),
			region = new THREE.Mesh( geometry, material );
			
		region.scale.y = height||0.001;
		region.castShadow = true;
		region.receiveShadow = true;
		
		return region;
		
	} // Map.region3D



	geometry2D( regionName )
	{

		if( this.regions[regionName]===undefined )
			throw `Unknown regions id '${regionName}'`;
		
		var shape = this.regions[regionName],
			geometry = new THREE.BufferGeometry().setFromPoints( shape.extractPoints(12).shape )
				.rotateX( Math.PI/2 )
				.scale( this.mapScale, 1, this.mapScale )
				.translate( this.mapCenter.x, 1.01, this.mapCenter.z );
				
		return geometry;
		
	} // Map.geometry2D
	
	
	
	region2D( regionName, height = 1, color = 'black' )
	{
		var geometry = this.geometry2D( regionName ),
			material = new THREE.LineBasicMaterial( {color: color} ),
			region = new THREE.Line( geometry, material );
			
		region.scale.y = height||0.001;
		region.castShadow = true;
		region.receiveShadow = true;
		
		return region;
		
	} // Map.region2D
 


	center( regionName, height = 1 )
	{

		if( this.regions[regionName]===undefined )
			throw `Unknown regions id '${regionName}'`;
		
		return new THREE.Vector3(
			this.mapScale*this.labels[regionName].x + this.mapCenter.x,
			height,
			this.mapScale*this.labels[regionName].y + this.mapCenter.z
		);


		
		var minX =  Infinity,
			maxX = -Infinity,
			minZ =  Infinity,
			maxZ = -Infinity;
			
		var x = 0,
			z = 0;
			
		for( var point of this.points[regionName] )
		{
			x += point.x;
			z += point.y;
			
			minX = Math.min( minX, point.x );
			maxX = Math.max( maxX, point.x );
			minZ = Math.min( minZ, point.y );
			maxZ = Math.max( maxZ, point.y );
		}
			/*	
		return new THREE.Vector3(
			this.mapScale*x/this.points[regionName].length + this.mapCenter.x,
			height,
			this.mapScale*z/this.points[regionName].length + this.mapCenter.z );
		*/
		return new THREE.Vector3(
			this.mapScale*(minX+maxX)/2 + this.mapCenter.x,
			height,
			this.mapScale*(minZ+maxZ)/2 + this.mapCenter.z );
		
	} // Map.center
	
	
	
	label2D( text, height=1, color='black' )
	{
		
		var textSize = 100;
				
		var canvas = document.createElement( 'canvas' ),
			ctx = canvas.getContext( '2d' );
			
		ctx.font = `bold ${textSize}px arial`;
					
		var measure = ctx.measureText( text ),
			textDX = Math.round( measure.actualBoundingBoxRight - measure.actualBoundingBoxLeft ),
			textDY = Math.round( measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent );

		canvas.width = textDX;
		canvas.height = textDY;
				
		ctx.font = `bold ${textSize}px arial`;
		ctx.fillStyle = 'white';
		ctx.fillText( text, 0, textDY-measure.actualBoundingBoxDescent);

		var texture = new THREE.CanvasTexture( canvas );
			//texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
		var label = new THREE.Mesh( 
			new THREE.PlaneGeometry( textDX/textSize, textDY/textSize ).rotateX( -Math.PI/2 ).translate( 0, 0.1, 0 ),
			new THREE.MeshBasicMaterial({
					color: color,
					map: texture,
					transparent: true,
					alphaMap: texture,
				})
			);
			
		return label;
		
	} // Map.label2D
	
} // Map
 


