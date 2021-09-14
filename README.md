# bgmap
Low-poly map of provinces in Bulgaria. The file `maps.js` defines
the class `Map` that returns a province or the whole country either
as a 3D mesh (i.e. `THREE.BufferGeometry` for `THREE.Mesh`) or
a 2D contour (also `THREE.BufferGeometry` but `for THREE.Line`).

It is possible to apply rounding of borders.

The shapes of provinces are manually crafted in diagrams.net, exported
to XML and imported to `maps.js`.

## Examples

To draw the outline of Bulgaria we use create instance of `Map`,
then we get the geometry of the outline via its method `mapGeometry2D`.

```javascript
import {Map} from './map.js';

var map = new Map( 'bgmap-level-0.xml', createMap );

function createMap( map )
{
	var geometry = map.mapGeometry2D( 'BG' );
	var material = new THREE.LineBasicMaterial( {color: 'black'} );

	var region = new THREE.Line( geometry, material );

	scene.add( region );
}
```

[<img src="snapshots/example-1.jpg">](https://boytchev.github.io/bgmap/example-1.html)


September, 2021


