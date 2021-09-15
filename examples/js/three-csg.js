const CONSTANTS = Object.freeze({
    _CSGDEBUG: false,
    defaultResolution2D: 32, // Number of polygons per 360 degree revolution for 2D objects.
    defaultResolution3D: 12, //Number of polygons per 360 degree revolution for 3D objects.
    EPS: 0.00001, // Epsilon used during determination of near zero distances.
    angleEPS: 0.1, // Epsilon used during determination of near zero areas.
    areaEPS: 4.9916708323414084e-12, // Epsilon used during determination of near zero areas. This is the minimal area of a minimal polygon.
    all: 0,
    top: 1,
    bottom: 2,
    left: 3,
    right: 4,
    front: 5,
    back: 6,
});

const IsFloat = function (n) {
    return !isNaN(n) || n === Infinity || n === -Infinity;
};

// # class Plane
// Represents a plane in 3D space.
const Plane = function (normal, w) {
    this.normal = normal;
    this.w = w;
};

Plane.fromVector3Ds = function (a, b, c) {
    let n = b.minus(a).cross(c.minus(a)).unit();
    return new Plane(n, n.dot(a));
};

Plane.prototype = {
    flipped: function () {
        return new Plane(this.normal.negated(), -this.w);
    },

    getTag: function () {
        let result = this.tag;
        if (!result) {
            result = window.getTag(); // TODO: KILL THIS!!!
            this.tag = result;
        }
        return result;
    },

    equals: function (n) {
        return this.normal.equals(n.normal) && this.w === n.w;
    },

    // robust splitting of a line by a plane
    // will work even if the line is parallel to the plane
    splitLineBetweenPoints: function (p1, p2) {
        let direction = p2.minus(p1);
        let labda = (this.w - this.normal.dot(p1)) / this.normal.dot(direction);
        if (isNaN(labda)) labda = 0;
        if (labda > 1) labda = 1;
        if (labda < 0) labda = 0;
        let result = p1.plus(direction.times(labda));
        return result;
    },

    signedDistanceToPoint: function (point) {
        let t = this.normal.dot(point) - this.w;
        return t;
    },

    mirrorPoint: function (point3d) {
        let distance = this.signedDistanceToPoint(point3d);
        let mirrored = point3d.minus(this.normal.times(distance * 2.0));
        return mirrored;
    },
};

/** Class Polygon
 * Represents a convex polygon. The vertices used to initialize a polygon must
 *   be coplanar and form a convex loop. They do not have to be `Vertex`
 *   instances but they must behave similarly (duck typing can be used for
 *   customization).
 * <br>
 * Each convex polygon has a `shared` property, which is shared between all
 *   polygons that are clones of each other or were split from the same polygon.
 *   This can be used to define per-polygon properties (such as surface color).
 * <br>
 * The plane of the polygon is calculated from the vertex coordinates if not provided.
 *   The plane can alternatively be passed as the third argument to avoid calculations.
 *
 * @constructor
 * @param {Vertex[]} vertices - list of vertices
 * @param {Polygon.Shared} [shared=defaultShared] - shared property to apply
 * @param {Plane} [plane] - plane of the polygon
 *
 * @example
 * const vertices = [
 *   new CSG.Vertex(new CSG.Vector([0, 0, 0])),
 *   new CSG.Vertex(new CSG.Vector([0, 10, 0])),
 *   new CSG.Vertex(new CSG.Vector([0, 10, 10]))
 * ]
 * let observed = new Polygon(vertices)
 */
let Polygon = function (vertices, shared, plane) {
    this.vertices = vertices;
    this.shared = {
        color: shared ? shared.color : null,
        getHash: function () {
            if (!this.color) return this.color;
            return this.color.join('/');
        },
        getTag: function () {
            let result = this.tag;
            if (!result) {
                result = getTag();
                this.tag = result;
            }
            return result;
        },
    };
    // let numvertices = vertices.length;

    if (arguments.length >= 3) {
        this.plane = plane;
    } else {
        this.plane = Plane.fromVector3Ds(vertices[0].pos, vertices[1].pos, vertices[2].pos);
    }

    if (CONSTANTS._CSGDEBUG) {
        if (!this.checkIfConvex()) {
            throw new Error('Not convex!');
        }
    }
};

Polygon.prototype = {
    // returns an array with a Vector3D (center point) and a radius
    boundingSphere: function () {
        if (!this.cachedBoundingSphere) {
            let box = this.boundingBox();
            let middle = box[0].plus(box[1]).times(0.5);
            let radius3 = box[1].minus(middle);
            let radius = radius3.length();
            this.cachedBoundingSphere = [middle, radius];
        }
        return this.cachedBoundingSphere;
    },

    // returns an array of two Vector3Ds (minimum coordinates and maximum coordinates)
    boundingBox: function () {
        if (!this.cachedBoundingBox) {
            let minpoint, maxpoint;
            let vertices = this.vertices;
            let numvertices = vertices.length;
            if (numvertices === 0) {
                minpoint = new Vector(0, 0, 0);
            } else {
                minpoint = vertices[0].pos;
            }
            maxpoint = minpoint;
            for (let i = 1; i < numvertices; i++) {
                let point = vertices[i].pos;
                minpoint = minpoint.min(point);
                maxpoint = maxpoint.max(point);
            }
            this.cachedBoundingBox = [minpoint, maxpoint];
        }
        return this.cachedBoundingBox;
    },

    flipped: function () {
        let newvertices = this.vertices.map(function (v) {
            return v.flipped();
        });
        newvertices.reverse();
        return new Polygon(newvertices, this.shared);
    },
};

/** Class Vector
 * Represents a 3D vector with X, Y, Z coordinates.
 * @constructor
 *
 * @example
 * new CSG.Vector(1, 2, 3);
 * new CSG.Vector([1, 2, 3]);
 * new CSG.Vector({ x: 1, y: 2, z: 3 });
 * new CSG.Vector(1, 2); // assumes z=0
 * new CSG.Vector([1, 2]); // assumes z=0
 */
const Vector = function (x, y, z) {
    if (arguments.length === 3) {
        this._x = parseFloat(x);
        this._y = parseFloat(y);
        this._z = parseFloat(z);
    } else if (arguments.length === 2) {
        this._x = parseFloat(x);
        this._y = parseFloat(y);
        this._z = 0;
    } else {
        var ok = true;
        if (arguments.length === 1) {
            if (typeof x === 'object') {
                if (x instanceof Vector) {
                    this._x = x._x;
                    this._y = x._y;
                    this._z = x._z;
                } else if (x instanceof Array) {
                    if (x.length < 2 || x.length > 3) {
                        ok = false;
                    } else {
                        this._x = parseFloat(x[0]);
                        this._y = parseFloat(x[1]);
                        if (x.length === 3) {
                            this._z = parseFloat(x[2]);
                        } else {
                            this._z = 0;
                        }
                    }
                } else if ('x' in x && 'y' in x) {
                    this._x = parseFloat(x.x);
                    this._y = parseFloat(x.y);
                    if ('z' in x) {
                        this._z = parseFloat(x.z);
                    } else {
                        this._z = 0;
                    }
                } else if ('_x' in x && '_y' in x) {
                    this._x = parseFloat(x._x);
                    this._y = parseFloat(x._y);
                    if ('_z' in x) {
                        this._z = parseFloat(x._z);
                    } else {
                        this._z = 0;
                    }
                } else ok = false;
            } else {
                var v = parseFloat(x);
                this._x = v;
                this._y = v;
                this._z = v;
            }
        } else ok = false;
        if (ok) {
            if (!IsFloat(this._x) || !IsFloat(this._y) || !IsFloat(this._z)) ok = false;
        } else {
            throw new Error('wrong arguments');
        }
    }
};

// This does the same as new Vector(x,y,z) but it doesn't go through the constructor
// and the parameters are not validated. Is much faster.
Vector.Create = function (x, y, z) {
    var result = Object.create(Vector.prototype);
    result._x = x;
    result._y = y;
    result._z = z;
    return result;
};

Vector.prototype = {
    get x() {
        return this._x;
    },
    get y() {
        return this._y;
    },
    get z() {
        return this._z;
    },

    set x(v) {
        throw new Error('Vector is immutable');
    },
    set y(v) {
        throw new Error('Vector is immutable');
    },
    set z(v) {
        throw new Error('Vector is immutable');
    },

    clone: function () {
        return Vector.Create(this._x, this._y, this._z);
    },

    negated: function () {
        return Vector.Create(-this._x, -this._y, -this._z);
    },

    abs: function () {
        return Vector.Create(Math.abs(this._x), Math.abs(this._y), Math.abs(this._z));
    },

    plus: function (a) {
        return Vector.Create(this._x + a._x, this._y + a._y, this._z + a._z);
    },

    minus: function (a) {
        return Vector.Create(this._x - a._x, this._y - a._y, this._z - a._z);
    },

    times: function (a) {
        return Vector.Create(this._x * a, this._y * a, this._z * a);
    },

    dividedBy: function (a) {
        return Vector.Create(this._x / a, this._y / a, this._z / a);
    },

    dot: function (a) {
        return this._x * a._x + this._y * a._y + this._z * a._z;
    },

    lerp: function (a, t) {
        return this.plus(a.minus(this).times(t));
    },

    lengthSquared: function () {
        return this.dot(this);
    },

    length: function () {
        return Math.sqrt(this.lengthSquared());
    },

    unit: function () {
        return this.dividedBy(this.length());
    },

    cross: function (a) {
        return Vector.Create(this._y * a._z - this._z * a._y, this._z * a._x - this._x * a._z, this._x * a._y - this._y * a._x);
    },

    distanceTo: function (a) {
        return this.minus(a).length();
    },

    distanceToSquared: function (a) {
        return this.minus(a).lengthSquared();
    },

    equals: function (a) {
        return this._x === a._x && this._y === a._y && this._z === a._z;
    },

    // Right multiply by a 4x4 matrix (the vector is interpreted as a row vector)
    // Returns a new Vector
    multiply4x4: function (matrix4x4) {
        return matrix4x4.leftMultiply1x3Vector(this);
    },

    // find a vector that is somewhat perpendicular to this one
    randomNonParallelVector: function () {
        var abs = this.abs();
        if (abs._x <= abs._y && abs._x <= abs._z) {
            return Vector.Create(1, 0, 0);
        } else if (abs._y <= abs._x && abs._y <= abs._z) {
            return Vector.Create(0, 1, 0);
        } else {
            return Vector.Create(0, 0, 1);
        }
    },

    min: function (p) {
        return Vector.Create(Math.min(this._x, p._x), Math.min(this._y, p._y), Math.min(this._z, p._z));
    },

    max: function (p) {
        return Vector.Create(Math.max(this._x, p._x), Math.max(this._y, p._y), Math.max(this._z, p._z));
    },
};

// # class Vertex
// Represents a vertex of a polygon. Use your own vertex class instead of this
// one to provide additional features like texture coordinates and vertex
// colors. Custom vertex classes need to provide a `pos` property
// `flipped()`, and `interpolate()` methods that behave analogous to the ones
// FIXME: And a lot MORE (see plane.fromVector3Ds for ex) ! This is fragile code
// defined by `Vertex`.
const Vertex = function (pos) {
    this.pos = pos;
};

// create from an untyped object with identical property names:
Vertex.fromObject = function (obj) {
    var pos = new Vector(obj.pos);
    return new Vertex(pos);
};

Vertex.prototype = {
    // Return a vertex with all orientation-specific data (e.g. vertex normal) flipped. Called when the
    // orientation of a polygon is flipped.
    flipped: function () {
        return this;
    },

    getTag: function () {
        var result = this.tag;
        if (!result) {
            result = window.getTag(); // TODO: KILL THIS!!!
            this.tag = result;
        }
        return result;
    },

    // Create a new vertex between this vertex and `other` by linearly
    // interpolating all properties using a parameter of `t`. Subclasses should
    // override this to interpolate additional properties.
    interpolate: function (other, t) {
        var newpos = this.pos.lerp(other.pos, t);
        return new Vertex(newpos);
    },
};

/** Class CSG
 * Holds a binary space partition tree representing a 3D solid. Two solids can
 * be combined using the `union()`, `subtract()`, and `intersect()` methods.
 * @constructor
 */
let CSG = function () {
    this.polygons = [];
    this.properties = new Properties();
};

CSG.prototype = {
    /**
     * Return a new CSG solid representing the space in either this solid or
     * in the given solids. Neither this solid nor the given solids are modified.
     * @param {CSG[]} csg - list of CSG objects
     * @returns {CSG} new CSG object
     * @example
     * let C = A.union(B)
     * @example
     * +-------+            +-------+
     * |       |            |       |
     * |   A   |            |       |
     * |    +--+----+   =   |       +----+
     * +----+--+    |       +----+       |
     *      |   B   |            |       |
     *      |       |            |       |
     *      +-------+            +-------+
     */
    union: function (csg) {
        let csgs;
        if (csg instanceof Array) {
            csgs = csg.slice(0);
            csgs.push(this);
        } else {
            csgs = [this, csg];
        }

        let i;
        // combine csg pairs in a way that forms a balanced binary tree pattern
        for (i = 1; i < csgs.length; i += 2) {
            csgs.push(csgs[i - 1].unionSub(csgs[i]));
        }
        return csgs[i - 1];
    },

    unionSub: function (csg) {
        if (!this.mayOverlap(csg)) {
            let newpolygons = this.polygons.concat(csg.polygons);
            let result = this.fromPolygons(newpolygons);
            result.properties = this.properties._merge(csg.properties);
            return result;
        } else {
            let a = new Tree(this.polygons);
            let b = new Tree(csg.polygons);
            a.clipTo(b, false);

            // b.clipTo(a, true); // ERROR: this doesn't work
            b.clipTo(a);
            b.invert();
            b.clipTo(a);
            b.invert();

            let newpolygons = a.allPolygons().concat(b.allPolygons());
            let result = this.fromPolygons(newpolygons);
            result.properties = this.properties._merge(csg.properties);
            return result;
        }
    },

    /**
     * Return a new CSG solid representing space in this solid but
     * not in the given solids. Neither this solid nor the given solids are modified.
     * @param {CSG[]} csg - list of CSG objects
     * @returns {CSG} new CSG object
     * @example
     * let C = A.subtract(B)
     * @example
     * +-------+            +-------+
     * |       |            |       |
     * |   A   |            |       |
     * |    +--+----+   =   |    +--+
     * +----+--+    |       +----+
     *      |   B   |
     *      |       |
     *      +-------+
     */
    subtract: function (csg) {
        let csgs;
        if (csg instanceof Array) {
            csgs = csg;
        } else {
            csgs = [csg];
        }
        let result = this;
        for (let i = 0; i < csgs.length; i++) {
            let islast = i === csgs.length - 1;
            result = result.subtractSub(csgs[i], islast, islast);
        }
        return result;
    },

    subtractSub: function (csg) {
        let a = new Tree(this.polygons);
        let b = new Tree(csg.polygons);
        a.invert();
        a.clipTo(b);
        b.clipTo(a, true);
        a.addPolygons(b.allPolygons());
        a.invert();
        let result = this.fromPolygons(a.allPolygons());
        result.properties = this.properties._merge(csg.properties);
        return result;
    },

    /**
     * Return a new CSG solid representing space in both this solid and
     * in the given solids. Neither this solid nor the given solids are modified.
     * @param {CSG[]} csg - list of CSG objects
     * @returns {CSG} new CSG object
     * @example
     * let C = A.intersect(B)
     * @example
     * +-------+
     * |       |
     * |   A   |
     * |    +--+----+   =   +--+
     * +----+--+    |       +--+
     *      |   B   |
     *      |       |
     *      +-------+
     */
    intersect: function (csg) {
        let csgs;
        if (csg instanceof Array) {
            csgs = csg;
        } else {
            csgs = [csg];
        }
        let result = this;
        for (let i = 0; i < csgs.length; i++) {
            let islast = i === csgs.length - 1;
            result = result.intersectSub(csgs[i], islast, islast);
        }
        return result;
    },

    intersectSub: function (csg) {
        let a = new Tree(this.polygons);
        let b = new Tree(csg.polygons);
        a.invert();
        b.clipTo(a);
        b.invert();
        a.clipTo(b);
        b.clipTo(a);
        a.addPolygons(b.allPolygons());
        a.invert();
        let result = this.fromPolygons(a.allPolygons());
        result.properties = this.properties._merge(csg.properties);
        return result;
    },

    fromPolygons: function (polygons) {
        let csg = new CSG();
        csg.polygons = polygons;
        return csg;
    },

    bounds: function (csg = this) {
        if (!csg.cachedBoundingBox) {
            let minpoint = new Vector(0, 0, 0);
            let maxpoint = new Vector(0, 0, 0);
            let polygons = csg.polygons;
            let numpolygons = polygons.length;
            for (let i = 0; i < numpolygons; i++) {
                let polygon = polygons[i];
                let myBounds = polygon.boundingBox();
                if (i === 0) {
                    minpoint = myBounds[0];
                    maxpoint = myBounds[1];
                } else {
                    minpoint = minpoint.min(myBounds[0]);
                    maxpoint = maxpoint.max(myBounds[1]);
                }
            }
            // FIXME: not ideal, we are mutating the input, we need to move some of it out
            csg.cachedBoundingBox = [minpoint, maxpoint];
        }
        return csg.cachedBoundingBox;
    },

    // ALIAS !
    getBounds: function () {
        return this.bounds();
    },

    /** returns true if there is a possibility that the two solids overlap
     * returns false if we can be sure that they do not overlap
     * NOTE: this is critical as it is used in UNIONs
     * @param  {CSG} csg
     */
    mayOverlap: function (csg) {
        if (this.polygons.length === 0 || csg.polygons.length === 0) {
            return false;
        } else {
            let mybounds = this.bounds();
            let otherbounds = this.bounds(csg);
            if (mybounds[1].x < otherbounds[0].x) return false;
            if (mybounds[0].x > otherbounds[1].x) return false;
            if (mybounds[1].y < otherbounds[0].y) return false;
            if (mybounds[0].y > otherbounds[1].y) return false;
            if (mybounds[1].z < otherbounds[0].z) return false;
            if (mybounds[0].z > otherbounds[1].z) return false;
            return true;
        }
    },

    setColor: function (args) {
        this.polygons.forEach((polygon) => {
            polygon.shared.color = args;
        });
    },
};

// ////////////////////////////////////
// # Class Properties
// This class is used to store properties of a solid
// A property can for example be a Vertex, a Plane or a Line3D
// Whenever an affine transform is applied to the CSG solid, all its properties are
// transformed as well.
// The properties can be stored in a complex nested structure (using arrays and objects)
const Properties = function () {};

Properties.prototype = {
    _transform: function (matrix4x4) {
        let result = new Properties();
        Properties.transformObj(this, result, matrix4x4);
        return result;
    },
    _merge: function (otherproperties) {
        let result = new Properties();
        Properties.cloneObj(this, result);
        Properties.addFrom(result, otherproperties);
        return result;
    },
};

Properties.transformObj = function (source, result, matrix4x4) {
    for (let propertyname in source) {
        if (propertyname === '_transform') continue;
        if (propertyname === '_merge') continue;
        let propertyvalue = source[propertyname];
        let transformed = propertyvalue;
        if (typeof propertyvalue === 'object') {
            if ('transform' in propertyvalue && typeof propertyvalue.transform === 'function') {
                transformed = propertyvalue.transform(matrix4x4);
            } else if (propertyvalue instanceof Array) {
                transformed = [];
                Properties.transformObj(propertyvalue, transformed, matrix4x4);
            } else if (propertyvalue instanceof Properties) {
                transformed = new Properties();
                Properties.transformObj(propertyvalue, transformed, matrix4x4);
            }
        }
        result[propertyname] = transformed;
    }
};

Properties.cloneObj = function (source, result) {
    for (let propertyname in source) {
        if (propertyname === '_transform') continue;
        if (propertyname === '_merge') continue;
        let propertyvalue = source[propertyname];
        let cloned = propertyvalue;
        if (typeof propertyvalue === 'object') {
            if (propertyvalue instanceof Array) {
                cloned = [];
                for (let i = 0; i < propertyvalue.length; i++) {
                    cloned.push(propertyvalue[i]);
                }
            } else if (propertyvalue instanceof Properties) {
                cloned = new Properties();
                Properties.cloneObj(propertyvalue, cloned);
            }
        }
        result[propertyname] = cloned;
    }
};

Properties.addFrom = function (result, otherproperties) {
    for (let propertyname in otherproperties) {
        if (propertyname === '_transform') continue;
        if (propertyname === '_merge') continue;
        if (
            propertyname in result &&
            typeof result[propertyname] === 'object' &&
            result[propertyname] instanceof Properties &&
            typeof otherproperties[propertyname] === 'object' &&
            otherproperties[propertyname] instanceof Properties
        ) {
            Properties.addFrom(result[propertyname], otherproperties[propertyname]);
        } else if (!(propertyname in result)) {
            result[propertyname] = otherproperties[propertyname];
        }
    }
};

// Returns object:
// .type:
//   0: coplanar-front
//   1: coplanar-back
//   2: front
//   3: back
//   4: spanning
// In case the polygon is spanning, returns:
// .front: a Polygon of the front part
// .back: a Polygon of the back part
function splitPolygonByPlane(plane, polygon) {
    let result = {
        type: null,
        front: null,
        back: null,
    };
    // cache in local lets (speedup):
    let planenormal = plane.normal;
    let vertices = polygon.vertices;
    let numvertices = vertices.length;
    if (polygon.plane.equals(plane)) {
        result.type = 0;
    } else {
        let thisw = plane.w;
        let hasfront = false;
        let hasback = false;
        let vertexIsBack = [];
        let MINEPS = -CONSTANTS.EPS;
        for (let i = 0; i < numvertices; i++) {
            let t = planenormal.dot(vertices[i].pos) - thisw;
            let isback = t < 0;
            vertexIsBack.push(isback);
            if (t > CONSTANTS.EPS) hasfront = true;
            if (t < MINEPS) hasback = true;
        }
        if (!hasfront && !hasback) {
            // all points coplanar
            let t = planenormal.dot(polygon.plane.normal);
            result.type = t >= 0 ? 0 : 1;
        } else if (!hasback) {
            result.type = 2;
        } else if (!hasfront) {
            result.type = 3;
        } else {
            // spanning
            result.type = 4;
            let frontvertices = [];
            let backvertices = [];
            let isback = vertexIsBack[0];
            for (let vertexindex = 0; vertexindex < numvertices; vertexindex++) {
                let vertex = vertices[vertexindex];
                let nextvertexindex = vertexindex + 1;
                if (nextvertexindex >= numvertices) nextvertexindex = 0;
                let nextisback = vertexIsBack[nextvertexindex];
                if (isback === nextisback) {
                    // line segment is on one side of the plane:
                    if (isback) {
                        backvertices.push(vertex);
                    } else {
                        frontvertices.push(vertex);
                    }
                } else {
                    // line segment intersects plane:
                    let point = vertex.pos;
                    let nextpoint = vertices[nextvertexindex].pos;
                    let intersectionpoint = plane.splitLineBetweenPoints(point, nextpoint);
                    let intersectionvertex = new Vertex(intersectionpoint);
                    if (isback) {
                        backvertices.push(vertex);
                        backvertices.push(intersectionvertex);
                        frontvertices.push(intersectionvertex);
                    } else {
                        frontvertices.push(vertex);
                        frontvertices.push(intersectionvertex);
                        backvertices.push(intersectionvertex);
                    }
                }
                isback = nextisback;
            } // for vertexindex
            // remove duplicate vertices:
            let EPS_SQUARED = CONSTANTS.EPS * CONSTANTS.EPS;
            if (backvertices.length >= 3) {
                let prevvertex = backvertices[backvertices.length - 1];
                for (let vertexindex = 0; vertexindex < backvertices.length; vertexindex++) {
                    let vertex = backvertices[vertexindex];
                    if (vertex.pos.distanceToSquared(prevvertex.pos) < EPS_SQUARED) {
                        backvertices.splice(vertexindex, 1);
                        vertexindex--;
                    }
                    prevvertex = vertex;
                }
            }
            if (frontvertices.length >= 3) {
                let prevvertex = frontvertices[frontvertices.length - 1];
                for (let vertexindex = 0; vertexindex < frontvertices.length; vertexindex++) {
                    let vertex = frontvertices[vertexindex];
                    if (vertex.pos.distanceToSquared(prevvertex.pos) < EPS_SQUARED) {
                        frontvertices.splice(vertexindex, 1);
                        vertexindex--;
                    }
                    prevvertex = vertex;
                }
            }
            if (frontvertices.length >= 3) {
                result.front = new Polygon(frontvertices, polygon.shared, polygon.plane);
            }
            if (backvertices.length >= 3) {
                result.back = new Polygon(backvertices, polygon.shared, polygon.plane);
            }
        }
    }
    return result;
}

// # class PolygonTreeNode
// This class manages hierarchical splits of polygons
// At the top is a root node which doesn hold a polygon, only child PolygonTreeNodes
// Below that are zero or more 'top' nodes; each holds a polygon. The polygons can be in different planes
// splitByPlane() splits a node by a plane. If the plane intersects the polygon, two new child nodes
// are created holding the splitted polygon.
// getPolygons() retrieves the polygon from the tree. If for PolygonTreeNode the polygon is split but
// the two split parts (child nodes) are still intact, then the unsplit polygon is returned.
// This ensures that we can safely split a polygon into many fragments. If the fragments are untouched,
//  getPolygons() will return the original unsplit polygon instead of the fragments.
// remove() removes a polygon from the tree. Once a polygon is removed, the parent polygons are invalidated
// since they are no longer intact.
// constructor creates the root node:
const PolygonTreeNode = function () {
    this.parent = null;
    this.children = [];
    this.polygon = null;
    this.removed = false;
};

PolygonTreeNode.prototype = {
    // fill the tree with polygons. Should be called on the root node only; child nodes must
    // always be a derivate (split) of the parent node.
    addPolygons: function (polygons) {
        // new polygons can only be added to root node; children can only be splitted polygons
        if (!this.isRootNode()) {
            throw new Error('Assertion failed');
        }
        let _this = this;
        polygons.map(function (polygon) {
            _this.addChild(polygon);
        });
    },

    // remove a node
    // - the siblings become toplevel nodes
    // - the parent is removed recursively
    remove: function () {
        if (!this.removed) {
            this.removed = true;

            if (CONSTANTS._CSGDEBUG) {
                if (this.isRootNode()) throw new Error('Assertion failed'); // can't remove root node
                if (this.children.length) throw new Error('Assertion failed'); // we shouldn't remove nodes with children
            }

            // remove ourselves from the parent's children list:
            let parentschildren = this.parent.children;
            let i = parentschildren.indexOf(this);
            if (i < 0) throw new Error('Assertion failed');
            parentschildren.splice(i, 1);

            // invalidate the parent's polygon, and of all parents above it:
            this.parent.recursivelyInvalidatePolygon();
        }
    },

    isRemoved: function () {
        return this.removed;
    },

    isRootNode: function () {
        return !this.parent;
    },

    // invert all polygons in the tree. Call on the root node
    invert: function () {
        if (!this.isRootNode()) throw new Error('Assertion failed'); // can only call this on the root node
        this.invertSub();
    },

    getPolygon: function () {
        if (!this.polygon) throw new Error('Assertion failed'); // doesn't have a polygon, which means that it has been broken down
        return this.polygon;
    },

    getPolygons: function (result) {
        let children = [this];
        let queue = [children];
        let i, j, l, node;
        for (i = 0; i < queue.length; ++i) {
            // queue size can change in loop, don't cache length
            children = queue[i];
            for (j = 0, l = children.length; j < l; j++) {
                // ok to cache length
                node = children[j];
                if (node.polygon) {
                    // the polygon hasn't been broken yet. We can ignore the children and return our polygon:
                    result.push(node.polygon);
                } else {
                    // our polygon has been split up and broken, so gather all subpolygons from the children
                    queue.push(node.children);
                }
            }
        }
    },

    // split the node by a plane; add the resulting nodes to the frontnodes and backnodes array
    // If the plane doesn't intersect the polygon, the 'this' object is added to one of the arrays
    // If the plane does intersect the polygon, two new child nodes are created for the front and back fragments,
    //  and added to both arrays.
    splitByPlane: function (plane, coplanarfrontnodes, coplanarbacknodes, frontnodes, backnodes) {
        if (this.children.length) {
            let queue = [this.children];
            let i;
            let j;
            let l;
            let node;
            let nodes;
            for (i = 0; i < queue.length; i++) {
                // queue.length can increase, do not cache
                nodes = queue[i];
                for (j = 0, l = nodes.length; j < l; j++) {
                    // ok to cache length
                    node = nodes[j];
                    if (node.children.length) {
                        queue.push(node.children);
                    } else {
                        // no children. Split the polygon:
                        node._splitByPlane(plane, coplanarfrontnodes, coplanarbacknodes, frontnodes, backnodes);
                    }
                }
            }
        } else {
            this._splitByPlane(plane, coplanarfrontnodes, coplanarbacknodes, frontnodes, backnodes);
        }
    },

    // only to be called for nodes with no children
    _splitByPlane: function (plane, coplanarfrontnodes, coplanarbacknodes, frontnodes, backnodes) {
        let polygon = this.polygon;
        if (polygon) {
            let bound = polygon.boundingSphere();
            let sphereradius = bound[1] + CONSTANTS.EPS; // FIXME Why add imprecision?
            let planenormal = plane.normal;
            let spherecenter = bound[0];
            let d = planenormal.dot(spherecenter) - plane.w;
            if (d > sphereradius) {
                frontnodes.push(this);
            } else if (d < -sphereradius) {
                backnodes.push(this);
            } else {
                let splitresult = splitPolygonByPlane(plane, polygon);
                switch (splitresult.type) {
                    case 0:
                        // coplanar front:
                        coplanarfrontnodes.push(this);
                        break;

                    case 1:
                        // coplanar back:
                        coplanarbacknodes.push(this);
                        break;

                    case 2:
                        // front:
                        frontnodes.push(this);
                        break;

                    case 3:
                        // back:
                        backnodes.push(this);
                        break;

                    case 4:
                        // spanning:
                        if (splitresult.front) {
                            let frontnode = this.addChild(splitresult.front);
                            frontnodes.push(frontnode);
                        }
                        if (splitresult.back) {
                            let backnode = this.addChild(splitresult.back);
                            backnodes.push(backnode);
                        }
                        break;
                }
            }
        }
    },

    // PRIVATE methods from here:
    // add child to a node
    // this should be called whenever the polygon is split
    // a child should be created for every fragment of the split polygon
    // returns the newly created child
    addChild: function (polygon) {
        let newchild = new PolygonTreeNode();
        newchild.parent = this;
        newchild.polygon = polygon;
        this.children.push(newchild);
        return newchild;
    },

    invertSub: function () {
        let children = [this];
        let queue = [children];
        let i, j, l, node;
        for (i = 0; i < queue.length; i++) {
            children = queue[i];
            for (j = 0, l = children.length; j < l; j++) {
                node = children[j];
                if (node.polygon) {
                    node.polygon = node.polygon.flipped();
                }
                queue.push(node.children);
            }
        }
    },

    recursivelyInvalidatePolygon: function () {
        let node = this;
        while (node.polygon) {
            node.polygon = null;
            if (node.parent) {
                node = node.parent;
            }
        }
    },
};

// # class Tree
// This is the root of a BSP tree
// We are using this separate class for the root of the tree, to hold the PolygonTreeNode root
// The actual tree is kept in this.rootnode
const Tree = function (polygons) {
    this.polygonTree = new PolygonTreeNode();
    this.rootnode = new Node(null);
    if (polygons) this.addPolygons(polygons);
};

Tree.prototype = {
    invert: function () {
        this.polygonTree.invert();
        this.rootnode.invert();
    },

    // Remove all polygons in this BSP tree that are inside the other BSP tree
    // `tree`.
    clipTo: function (tree, alsoRemovecoplanarFront) {
        alsoRemovecoplanarFront = !!alsoRemovecoplanarFront;
        this.rootnode.clipTo(tree, alsoRemovecoplanarFront);
    },

    allPolygons: function () {
        let result = [];
        this.polygonTree.getPolygons(result);
        return result;
    },

    addPolygons: function (polygons) {
        let _this = this;
        let polygontreenodes = polygons.map(function (p) {
            return _this.polygonTree.addChild(p);
        });
        this.rootnode.addPolygonTreeNodes(polygontreenodes);
    },
};

// # class Node
// Holds a node in a BSP tree. A BSP tree is built from a collection of polygons
// by picking a polygon to split along.
// Polygons are not stored directly in the tree, but in PolygonTreeNodes, stored in
// this.polygontreenodes. Those PolygonTreeNodes are children of the owning
// Tree.polygonTree
// This is not a leafy BSP tree since there is
// no distinction between internal and leaf nodes.
const Node = function (parent) {
    this.plane = null;
    this.front = null;
    this.back = null;
    this.polygontreenodes = [];
    this.parent = parent;
};

Node.prototype = {
    // Convert solid space to empty space and empty space to solid space.
    invert: function () {
        let queue = [this];
        let node;
        for (let i = 0; i < queue.length; i++) {
            node = queue[i];
            if (node.plane) node.plane = node.plane.flipped();
            if (node.front) queue.push(node.front);
            if (node.back) queue.push(node.back);
            let temp = node.front;
            node.front = node.back;
            node.back = temp;
        }
    },

    // clip polygontreenodes to our plane
    // calls remove() for all clipped PolygonTreeNodes
    clipPolygons: function (polygontreenodes, alsoRemovecoplanarFront) {
        let args = { node: this, polygontreenodes: polygontreenodes };
        let node;
        let stack = [];

        do {
            node = args.node;
            polygontreenodes = args.polygontreenodes;

            // begin "function"
            if (node.plane) {
                let backnodes = [];
                let frontnodes = [];
                let coplanarfrontnodes = alsoRemovecoplanarFront ? backnodes : frontnodes;
                let plane = node.plane;
                let numpolygontreenodes = polygontreenodes.length;
                for (let i = 0; i < numpolygontreenodes; i++) {
                    let node1 = polygontreenodes[i];
                    if (!node1.isRemoved()) {
                        node1.splitByPlane(plane, coplanarfrontnodes, backnodes, frontnodes, backnodes);
                    }
                }

                if (node.front && frontnodes.length > 0) {
                    stack.push({ node: node.front, polygontreenodes: frontnodes });
                }
                let numbacknodes = backnodes.length;
                if (node.back && numbacknodes > 0) {
                    stack.push({ node: node.back, polygontreenodes: backnodes });
                } else {
                    // there's nothing behind this plane. Delete the nodes behind this plane:
                    for (let i = 0; i < numbacknodes; i++) {
                        backnodes[i].remove();
                    }
                }
            }
            args = stack.pop();
        } while (typeof args !== 'undefined');
    },

    // Remove all polygons in this BSP tree that are inside the other BSP tree
    // `tree`.
    clipTo: function (tree, alsoRemovecoplanarFront) {
        let node = this;
        let stack = [];
        do {
            if (node.polygontreenodes.length > 0) {
                tree.rootnode.clipPolygons(node.polygontreenodes, alsoRemovecoplanarFront);
            }
            if (node.front) stack.push(node.front);
            if (node.back) stack.push(node.back);
            node = stack.pop();
        } while (typeof node !== 'undefined');
    },

    addPolygonTreeNodes: function (polygontreenodes) {
        let args = { node: this, polygontreenodes: polygontreenodes };
        let node;
        let stack = [];
        do {
            node = args.node;
            polygontreenodes = args.polygontreenodes;

            if (polygontreenodes.length === 0) {
                args = stack.pop();
                continue;
            }
            let _this = node;
            if (!node.plane) {
                let bestplane = polygontreenodes[0].getPolygon().plane;
                node.plane = bestplane;
            }
            let frontnodes = [];
            let backnodes = [];

            for (let i = 0, n = polygontreenodes.length; i < n; ++i) {
                polygontreenodes[i].splitByPlane(_this.plane, _this.polygontreenodes, backnodes, frontnodes, backnodes);
            }

            if (frontnodes.length > 0) {
                if (!node.front) node.front = new Node(node);
                stack.push({ node: node.front, polygontreenodes: frontnodes });
            }
            if (backnodes.length > 0) {
                if (!node.back) node.back = new Node(node);
                stack.push({ node: node.back, polygontreenodes: backnodes });
            }

            args = stack.pop();
        } while (typeof args !== 'undefined');
    },
};

/*
 * interface converters
 */
const importThreeGeometry = (geometry) => {
    if (geometry instanceof CSG) return geometry;

    const csg = new CSG();
    const vertices = geometry.index ? geometry.index.array : [];
    const vectors = geometry.attributes.position.array;
    const getVector = (x, y = 0) => vectors[vertices[x] * 3 + y];
    const getVertex = (x) => new Vertex(new Vector(getVector(x), getVector(x, 1), getVector(x, 2)));
    const getVertex2 = (x) => new Vertex(new Vector(vectors[x], vectors[x + 1], vectors[x + 2]));
    const getVertexes = (x) => [getVertex(x), getVertex(x + 1), getVertex(x + 2)];

    if (vertices.length) {
        for (let x = 0; x < vertices.length; x += 3) {
            csg.polygons.push(new Polygon(getVertexes(x)));
        }
    } else {
        for (let x = 0; x < vectors.length; x += 9) {
            csg.polygons.push(new Polygon([getVertex2(x), getVertex2(x + 3), getVertex2(x + 6)]));
        }
    }

    csg.isCanonicalized = false;
    csg.isRetesselated = false;
    return csg;
};

const exportThreeGeometry = (geometry) => {
    if (!(geometry instanceof CSG)) return geometry;

    const threeGeometry = new THREE.BufferGeometry(); // eslint-disable-line no-undef
    const vertices = [];
    const colors = [];
    let colorsUsed = false;
    let vertexColor;

    geometry.polygons.forEach((polygon) => {
        if (polygon.shared.color) {
            vertexColor = [polygon.shared.color[0], polygon.shared.color[1], polygon.shared.color[2]];
            colorsUsed = true;
        } else {
            vertexColor = [1, 1, 1];
        }

        for (let x = 0; x < polygon.vertices.length - 2; x++) {
            [0, x + 1, x + 2].forEach((vertice) => {
                ['x', 'y', 'z'].forEach((axis) => {
                    vertices.push(polygon.vertices[vertice].pos[axis]);
                });
            });

            for (let y = 0; y < 3; y++) {
                colors.push(...vertexColor);
            }
        }
    });

    threeGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3)); // eslint-disable-line no-undef
    if (colorsUsed) threeGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3)); // eslint-disable-line no-undef
    threeGeometry.computeVertexNormals();
    return threeGeometry;
};

/*
 * operations
 */
const prepareObjects = (objects, colors) =>
    objects.map((object, index) => {
        const convertedObject = importThreeGeometry(object);

        if (colors[index]) convertedObject.setColor([colors[index].r, colors[index].g, colors[index].b, 1]);

        return convertedObject;
    });

const runOperation = (operation, objects, colors = []) => {
    objects = prepareObjects(objects, colors);

    const firstObject = objects.shift();

    return firstObject[operation](objects);
};

/*
 * See the LICENSE file for license.
 */

// TODO: FIXME: KILL THIS!!!! Tag factory: we can request a unique tag through _CSG.getTag()
window.staticTag = 1;
window.getTag = () => window.staticTag++;

// create user interface
const CSG$1 = {
    BufferGeometry: exportThreeGeometry,
    union: runOperation.bind(undefined, 'union'),
    subtract: runOperation.bind(undefined, 'subtract'),
    intersect: runOperation.bind(undefined, 'intersect'),
};
window.CSG = CSG$1;

export default CSG$1;
