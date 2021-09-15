# bgmap
Low-poly map of provinces in Bulgaria.

[<img src="examples/example-1.jpg" width="75">](https://boytchev.github.io/bgmap/examples/example-1.html)
[<img src="examples/example-2.jpg" width="75">](https://boytchev.github.io/bgmap/examples/example-2.html)
[<img src="examples/example-3.jpg" width="75">](https://boytchev.github.io/bgmap/examples/example-3.html)
[<img src="examples/example-4.jpg" width="75">](https://boytchev.github.io/bgmap/examples/example-4.html)
[<img src="examples/example-5.jpg" width="75">](https://boytchev.github.io/bgmap/examples/example-5.html)

The file `maps.js` defines
the class `Map` that returns a province or the whole country either
as a 3D mesh (i.e. `THREE.BufferGeometry` for `THREE.Mesh`) or
a 2D contour (also `THREE.BufferGeometry` but `for THREE.Line`).

It is possible to apply rounding of borders.

The shapes of provinces are manually crafted in diagrams.net, exported
to XML and imported to `maps.js`.

## Examples

The following examples show code sniplets. Click on the image 
to run the example in real-rime in your browser. Use your
default pointing device to change the viewpoint.


### 1. Outline of Bulgaria

The example extracts the outline of Bulgaria with
`mapGeometry2D` and region name set to `'BG'`.

```javascript
geometry = map.mapGeometry2D( 'BG' );
material = new THREE.LineBasicMaterial(...);

region = new THREE.Line( geometry, material );
```

[<img src="examples/example-1.jpg">](https://boytchev.github.io/bgmap/examples/example-1.html)


### 2. Outlines of Bulgarian provinces

The example uses the list of all regions from `regions`
and extract the outline of all regions, that are not
called `'BG'`.

```javascript
for( regionName in map.regions )
{
  geometry = map.mapGeometry2D( regionName );
  material = new THREE.LineBasicMaterial(...);
	
  region = new THREE.Line( geometry, material );
  :	
}
```

[<img src="snapshots/example-2.jpg">](https://boytchev.github.io/bgmap/examples/example-2.html)


September, 2021


