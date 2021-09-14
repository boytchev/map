# bgmap
Low-poly map of provinces in Bulgaria. The file `maps.js` defines
the class `Map` that returns a province or the whole country either
as a 3D mesh (i.e. `THREE.BufferGeometry` for `THREE.Mesh`) or
a 2D contour (also `THREE.BufferGeometry` but `for THREE.Line`).

It is possible to apply rounding of borders.

The shapes of provinces are manually crafted in diagrams.net, exported
to XML and imported to `maps.js`.

## Examples

## Bulgaria outline

```javascript
geometry = map.mapGeometry2D( 'BG' );
material = new THREE.LineBasicMaterial(...);

region = new THREE.Line( geometry, material );

scene.add( region );
```

[<img src="snapshots/example-1.jpg">](https://boytchev.github.io/bgmap/example-1.html)


## Bulgarian provinces outlines

```javascript
for( name in map.regions ) if( name!='BG' )
{
	geometry = map.mapGeometry2D( name );
	material = new THREE.LineBasicMaterial(...);
	
	region = new THREE.Line( geometry, material );
		
	scene.add( region );
}
```

[<img src="snapshots/example-2.jpg">](https://boytchev.github.io/bgmap/example-2.html)


September, 2021


