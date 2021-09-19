# map
Low-poly map of regions.

`map.js` is a minimialistic library for generating
outlines and flat 3D shapes of map regions. The
current map dataset is of Bulgaria and its provinces.

The library is implemented as a single `map.js` file.

[<img src="examples/example-1.jpg" width="100">](https://boytchev.github.io/map/examples/example-1.html)
[<img src="examples/example-2.jpg" width="100">](https://boytchev.github.io/map/examples/example-2.html)
[<img src="examples/example-3-ex.jpg" width="100">](https://boytchev.github.io/map/examples/example-3-ex.html)
[<img src="examples/example-4.jpg" width="100">](https://boytchev.github.io/map/examples/example-4.html)
[<img src="examples/example-5.jpg" width="100">](https://boytchev.github.io/map/examples/example-5.html)
[<img src="examples/example-6.jpg" width="100">](https://boytchev.github.io/map/examples/example-6.html)
[<img src="examples/example-7.jpg" width="100">](https://boytchev.github.io/map/examples/example-7.html)
[<img src="examples/example-8.jpg" width="100">](https://boytchev.github.io/map/examples/example-8.html)


## Table of contents
   * [Quick reference](#quick-reference)
   * [API](#api)
      * [Constructor](#constructor)
      * [Region name](#region-name)
      * [Region outline](#region-outline)
      * [Region 3D shape](#region-3d-shape)
      * [Region label](#region-label)
      * [Region center](#region-center)
   * [XML Data](#xml-data)
   * [Examples](#examples)
     * [Outline of country](#outline-of-country)
     * [Outlines of provinces](#outlines-of-provinces)
     * [Country and provinces](#country-and-provinces)
     * [Colored provinces](#colored-provinces)
     * [Elevated provinces](#elevated-provinces)
     * [Water supply](#water-supply)
     * [Labels of provinces](#labels-of-provinces)
     * [Overlaying maps](#overlaying-maps)


## Quick reference

```javascript
new Map( xmlFilename, drawMap, options );

map.regions // [string, string, ...]

map.region2D( regionName, height, color ) // THREE.Line
map.region3D( regionName, height, color ) // THREE.Mesh

map.geometry2D( regionName ) // THREE.BufferGeometry
map.geometry3D( regionName ) // THREE.BufferGeometry

map.label2D( labelText, height, color ) // THREE.Mesh
```


## API

The library is implemented as a single `map.js` file.

### Constructor
It is initialized by generating an instance of the class `Map`.
This instance is used to get a list of regions' names, the outline
and the 3D shape of each region.

```javascript
new Map( xmlFilename, drawMap, options )
```

* `xmlFilename` is a name of an XML file defining the
regions in Bulgaria. The library provides low-poly definitions
of regions in Bulgaria in file `map.xml` and an extended definition in `map-ex.xml`.
* `drawMap` is a user-defined callback function, that receives the map instance as parameter. This instance is used to extract
outlines and 3D shapes of regions. Because the XML processing is
asynchronous, the instance can be used only after the callback
function is actually called.
* `options` is an optional parameter for the map generator with
structure `{width: 45, height: 28, roundness: 25}`. The `width` and `height` attributes define the size of the map. If these values are not provided, `Map` uses global variables `MAP_WIDTH` and `MAP_HEIGHT`. If they are not defined, `Map` assumes the width is 45 and the height is 28. The attribute `roundness` sets the rounding radius of some vertices in the map. The default value is 25. The following two illustration show sharp outline ([roundness=0](https://boytchev.github.io/map/examples/example-1-sharp.html)) and smooth outline ([roundness=100](https://boytchev.github.io/map/examples/example-1-smooth.html)):

<p align="center">
	<img src="examples/example-1-sharp.jpg" width="200">
	<img src="examples/example-1-smooth.jpg" width="200">
</p>

The callback function `drawMap` has one parameter &ndash; an instance
of the map. This function is the place where all the fun happens. A typical
pattern of using `drawMap` is:

```javascript
new Map( '../map.xml', drawMap );

function drawMap( map )
{
  scene.add( map.region2D( 'BG' ) );
}
```

and using the `=>` syntax it becomes shorter:

```javascript
new Map( '../map.xml',
          map => scene.add( map.region2D( 'BG' ) )
       );
```


### Region name

```javascript
map.regions
```

The instance has property `regions` which is an array of the names
of all regions. These names are extracted from the XML files. The 
property is used to traverse through all regions in the map.

```javascript
// processing all regions
for( regionName in map.regions )
{
  :
}
```

Note, that the map of Buigaria is defined as a region, i.e. the same
way as Bulgarian provinces. The way to distinguish the country region
from the provinces regions is by name. The country region in file
`map.xml` is `'BG'`.

```javascript
// processing all provinces
for( regionName in map.regions )
  if( regionName != 'BG' )
  {
    :	
  }
```

### Region outline

```javascript
map.region2D( regionName, height, color )
```

The method `region2D` generates the outline of
the region called `regionName` as a `THREE.Line` object. Both
`height` and `color` are optional and by default are `1` and `'black'`.

```javascript
map.geometry2D( regionName )
```

The method `geometry2D` generates the outline of
the region called `regionName` as a `THREE.BufferGeometry`
suitable for creating `THREE.Line` lines. This method is used by
`region2D`.

### Region 3D shape

```javascript
map.region3D( regionName, height, color )
```

The method `region3D` generates the 3D shape of
the region called `regionName` as a `THREE.Mesh` object. Both
`height` and `color` are optional and by default are `1` and `'white'`.

```javascript
map.geometry2D( regionName )
```

The method `geometry3D` generates the 3D shape of
the region called `regionName` as a `THREE.BufferGeometry`
suitable for creating `THREE.Mesh` objects. This method is used by
`region3D`.

### Region label

```javascript
map.label2D( text, height, color )
```

The method `label2D` generates a 2D rectangular shape
containing a given `text`. The shape is `THREE.Mesh` with
`THREE.PlaneGeometry` geometry. Both `height` and `color`
are optional and by default are `1` and `'black'`.



### Region center

```javascript
map.center( regionName, height )
```

The method `center` returns the center of a region as indicated
by the position of its label in the XML file. The return value
is `THREE.Vector3`. It can be used to position labels and other
objects in a region.

That's all.


## XML Data

The XML file is exported from file `map.drawio` which can be
be edited in [Diagrams.net](https://www.diagrams.net/) (previously known as Draw.io).
The `Map` constructor has minimal parser of XML files, i.e. its
looks only for specific nodes, ignoring all the rest. The structure
of the XMl file must be like this:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mxfile ...>
  :
  <mxCell value="BG" ...>
    :
    <mxPoint x="370" y="-620" as="sourcePoint" />
    <Array as="points">
        <mxPoint x="540" y="-550" />
        <mxPoint x="540" y="-510" />
		:
        <mxPoint x="220" y="-330" />
    </Array>
  </mxCell>
  :
</mxfile>
```

Each region is defined as `<mxCell>` and the name of the region is in attribute `value`.
The geographical shape of the region is defined by a starting point `<mxPoint ... as="sourcePoint">`
and a list of next consequitive points `<mxPoint>` from `<Array>`.


## Examples

The following examples show code sniplets. Click on the image 
to run the example in real-rime in your browser. Use your
default pointing device to change the viewpoint.


#### Outline of country

```javascript
new Map( '../map.xml', drawMap );

function drawMap( map )
{
  scene.add( map.region2D( 'BG' ) );
}
```

[<img src="examples/example-1.jpg" width="300">](https://boytchev.github.io/map/examples/example-1.html)


#### Outlines of provinces

```javascript
new Map( '../map.xml', drawMap );

function drawMap( map )
{
  for( var regionName in map.regions )
    if( regionName != 'BG' )
      scene.add( map.region2D( regionName ) );
}
```

[<img src="examples/example-2.jpg" width="300">](https://boytchev.github.io/map/examples/example-2.html)



#### Country and provinces

```javascript
new Map( '../map.xml', drawMap );

function drawMap( map )
{
  scene.add( map.region3D( 'BG', 1, 'crimson' ) );

  for( var regionName in map.regions )
    if( regionName!='BG' )
      scene.add( map.region2D( regionName ) );
}
```

[<img src="examples/example-3.jpg" width="300">](https://boytchev.github.io/map/examples/example-3.html)

The same example using the extended map `map-ex.xml` instead of  `map.xml`.

[<img src="examples/example-3-ex.jpg" width="300">](https://boytchev.github.io/map/examples/example-3-ex.html)


#### Colored provinces

```javascript
new Map( '../map.xml', drawMap );

function drawMap( map )
{
  for( var regionName in map.regions )
    if( regionName!='BG' )
    {
      var color = new THREE.Color( 0xFFFFFF*Math.random() );

      scene.add( map.region3D( regionName, 1, color ) );
      scene.add( map.region2D( regionName, 1 ) );
    }
}
```

[<img src="examples/example-4.jpg" width="300">](https://boytchev.github.io/map/examples/example-4.html)


#### Elevated provinces

```javascript
new Map( '../map.xml', drawMap );

function drawMap( map )
{
  for( var regionName in map.regions )
    if( regionName!='BG' )
    {
      var value = Math.random();
      var color = new THREE.Color( value, 0.6, 1-value );
      var height = 1+3*value;

      scene.add( map.region3D( regionName, height, color ) );
      scene.add( map.region2D( regionName, height ) );
   }
}
```

[<img src="examples/example-5.jpg" width="300">](https://boytchev.github.io/map/examples/example-5.html)


#### Water supply

Imaginary map of water supply per province.

```javascript
new Map( '../map.xml', drawMap );

function drawMap( map )
{
  for( var regionName in map.regions )
    if( regionName!='BG' )
    {
      var value = Math.random(),
          color = new THREE.Color( value, value/2+0.5, 1 ),
          radius = 1.5-value;

      scene.add( map.region3D( regionName, 1, color ) );
      scene.add( map.region2D( regionName, 1 ) );

      var ball = new THREE.Mesh(
         new THREE.IcosahedronGeometry( radius, 4 ),
         new THREE.MeshPhysicalMaterial( {...} )
      );

      ball.position.copy( map.center( regionName, 1+radius ) );
      ball.castShadow = true;

      scene.add( ball );
   }
}
```

[<img src="examples/example-6.jpg" width="300">](https://boytchev.github.io/map/examples/example-6.html)

#### Labels of provinces

The actual labels are stored in custom-defined dictionary map `dictMap`.

```javascript
new Map( '../map.xml', drawMap );

var dictMap = {
  BG: 'България',
  BL: 'Благоевград',
  BU: 'Бургас',
   :
  YA: 'Ямбол' };

function drawMap( map )
{
  for( var regionName in map.regions )
  {
    var value = 0.1+3*Math.random();
    var color = new THREE.Color( 1, value/3, value/6 );
	
    scene.add( map.region3D( regionName, value, color ) );
			
    var label = map.label2D( dictMap[regionName], value );

    label.position.copy( map.center( regionName, value ) );
    label.scale.set( 0.8, 0.8, 0.8 );

    scene.add( label );
  }
}

```

[<img src="examples/example-7.jpg" width="300">](https://boytchev.github.io/map/examples/example-7.html)


#### Overlaying maps

Map `map-ex.xml` provides outlines of provinces, map `example-8.xml` provices locations of towns.
To have both maps with equal sizes and positions, they have the same region for the whole country.

```javascript
new Map( '../map-ex.xml', loadSubmap );
		
function loadSubmap( map )
{
  mainMap = map;
  new Map( 'example-8.xml', drawMap );
}

function drawMap( overlayMap )
{
  // using mainMap and overlayMap
  :
}
```

[<img src="examples/example-8.jpg" width="300">](https://boytchev.github.io/map/examples/example-8.html)


September, 2021


