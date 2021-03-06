/**
 * The Render Engine
 *
 * Simulation object
 *
 * @author: Brett Fattori (brettf@renderengine.com)
 *
 * @author: $Author: bfattori $
 * @version: $Revision: 1555 $
 *
 * Copyright (c) 2011 Brett Fattori (brettf@renderengine.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

// The class this file defines and its required classes
R.Engine.define({
   "class": "R.physics.Simulation",
   "requires": [
      "R.engine.BaseObject",
      "R.math.Math2D",
      "R.components.physics.BaseBody"
   ],
   "includes": [
      "/libs/Box2dWeb-2.1a.2.min.js"
   ]
});

/**
 * @class A representation of a physical world.  This object is used to
 *        introduce Box2dWeb physics into your game by creating a world
 *        which supports the physical structures provided by Box2dWeb.  You
 *        will need to create an <tt>R.physics.Simulation</tt> before you can utilize
 *        physics in a game.
 *        <p/>
 *        See either "/demos/physics/" or "/demos/physics2" for examples
 *        of utilizing the <tt>R.physics.Simulation</tt> object with rigid body components.
 *
 * @param name {String} The name of the object
 * @param viewport {R.math.Rectangle2D} Your rendering context's viewport
 * @param [gravity] {R.math.Vector2D} The world's gravity vector. default: [0, 650]
 * @extends R.engine.BaseObject
 * @constructor
 * @description Create a physical world for Box2dJS
 */
R.physics.Simulation = function() {
   return R.engine.BaseObject.extend(/** @scope R.physics.Simulation.prototype */{

      worldAABB: null,
      world: null,
      gravity: null,
      doSleep: true,
      worldBoundary: null,
      integrations: 0,
      scale: 0,

      /** @private */
      constructor: function(name, viewport, gravity) {
         this.base(name);
         this.gravity = gravity || R.math.Vector2D.create(0, 10);
         this.worldAABB = new Box2D.Collision.b2AABB();

         // Get the maximum dimension for the viewport and determine the number of pixels per meter
         this.scale = Math.max(viewport.w, viewport.h) / R.physics.Simulation.WORLD_METERS;

         this.doSleep = true;
         this.integrations = R.physics.Simulation.DEFAULT_INTEGRATIONS;
         var grav = new Box2D.Common.Math.b2Vec2(this.gravity.x, this.gravity.y);

         // Create the world
         this.world = new Box2D.Dynamics.b2World(grav, this.doSleep);
      },

      destroy: function() {
         this.worldBoundary.destroy();
         this.gravity.destroy();
         this.base();
      },

      release: function() {
         this.worldAABB = null;
         this.gravity = null,
               this.worldBoundary = null;
         this.world = null;
         this.base();
      },

      update: function(renderContext, time, dt) {
         // TODO: This should probably be based on world and delta times... ?
         this.world.Step(1 / R.Engine.getFPS(), this.integrations, this.integrations);
         this.world.ClearForces();
      },

      /**
       * Support method to get the ground body for the world.
       * @return {b2Body} The world's ground body
       * @private
       */
      getGroundBody: function() {
         return this.world.GetGroundBody();
      },

      /**
       * Get the scale, which represents the number of pixels per meter given that
       * the physical world is a 10 by 10 meter rectangle.
       * @return {Number}
       */
      getScale: function() {
         return this.scale;
      },

      /**
       * Set the scaling parameter for your world.  Since a game's environment is
       * represented in pixels, and the physical world is represented in meters, it
       * becomes appropriate to use a scaling amount to adjust your game's world
       * to match the physical world.
       * <p/>
       * Typically, the physical world would be represented by a 100 by 100 meter rectangle.
       * Thus, your game's environment should be scaled to match.  Thus, if you have a
       * 600 pixel wide viewport, every 6 pixels would be about 1 meter.
       *
       * @param scale {Number} The number of pixels per meter
       */
      setScale: function(scale) {
         this.scale = scale;
      },

      /**
       * Query the world within the given rectangle returning all of the
       * bodies found.
       * @param rect {R.math.Rectangle2D} The area to query
       * @return {Array} An array of <tt>Box2D.Dynamics.b2Body</tt> objects
       */
      getBodiesInArea: function(rect) {
         var aabb = new Box2D.Collision.b2AABB(), bodies = [];
         aabb.lowerBound.Set(rect.x, rect.y);
         aabb.upperBound.Set(rect.w, rect.h);

         // Query the world
         this.world.QueryAABB(function(fixture) {
            if (fixture.GetBody().GetType() != Box2D.Dynamics.b2Body.b2_staticBody) {
               bodies.push(fixture.GetBody());
            }
            return true;
         }, aabb);

         return bodies;
      },

      /**
       * Query the world for the body that lies at the given point.
       * @param point {R.math.Point2D} The point to query
       * @return {Box2D.Dynamics.b2Body} The body found, or <tt>null</tt>
       */
      getBodyAtPoint: function(point) {
         var b2P = new Box2D.Common.Math.b2Vec2(point.x, point.y),
             aabb = new Box2D.Collision.b2AABB(), body = null;

         aabb.lowerBound.Set(point.x - 0.001, point.y - 0.001);
         aabb.upperBound.Set(point.x + 0.001, point.y + 0.001);

         // Query the world
         this.world.QueryAABB(function(fixture) {
            if (fixture.GetBody().GetType() != Box2D.Dynamics.b2Body.b2_staticBody &&
                  fixture.GetShape().TestPoint(fixture.GetBody().GetTransform(), b2P)) {
               body = fixture.GetBody();
               return false;
            }
            return true;
         }, aabb);

         return body;
      },

      /**
       * Support method to add a body to the simulation.  The body must be one of the
       * box2d-js body types.  This method is intended to be used by {@link R.components.BaseBody}.
       *
       * @param b2jsBodyDef {Box2D.Dynamics.b2BodyDef} A box2d-js Body definition object
       * @param b2jsFixtureDef {Box2D.Dynamics.b2FixtureDef} A box2d-js fixture definition object
       * @private
       */
      addBody: function(b2jsBodyDef, b2jsFixtureDef) {
         var b = this.world.CreateBody(b2jsBodyDef);
         b.CreateFixture(b2jsFixtureDef);
         return b;
      },

      /**
       * Support method to add a joint to the simulation.  The joint must be one of the
       * box2d-js joint types.  This method is intended to be used by {@link R.components.BaseJoint}.
       *
       * @param b2jsJointDef {Box2D.Dynamics.b2JointDef} A box2d-js Joint definition object
       * @private
       */
      addJoint: function(b2jsJointDef) {
         return this.world.CreateJoint(b2jsJointDef);
      },

      /**
       * Support method to remove a body from the simulation.  The body must be one of the
       * box2d-js body types.  This method is intended to be used by {@link R.components.BaseBody}.
       *
       * @param b2jsBody {Box2D.Dynamics.b2Body} A box2d-js Body object
       * @private
       */
      removeBody: function(b2jsBody) {
         this.world.DestroyBody(b2jsBody);
      },

      /**
       * Support method to remove a joint from the simulation.  The joint must be one of the
       * box2d-js joint types.  This method is intended to be used by {@link R.components.BaseJoint}.
       *
       * @param b2jsJoint {Box2D.Dynamics.b2Joint} A box2d-js Joint object
       * @private
       */
      removeJoint: function(b2jsJoint) {
         this.world.DestroyJoint(b2jsJoint);
      },

      /**
       * Set the number of integrations per frame.  A higher number will result
       * in more accurate collisions, but will result in slower performance.
       *
       * @param integrations {Number} The number of integrations per frame
       */
      setIntegrations: function(integrations) {
         this.integrations = integrations || R.physics.Simulation.DEFAULT_INTEGRATIONS;
      },

      /**
       * Get the number of integrations per frame.
       * @return {Number}
       */
      getIntegrations: function() {
         return this.integrations;
      },

      /**
       * Add a simple box body to the simulation.  The body doesn't have a visual
       * representation, but exists in the simulation and can be interacted with.
       *
       * @param pos {R.math.Point2D} The position where the body's top/left is located
       * @param extents {R.math.Point2D} The width and height of the body
       * @param properties {Object} An object with up to three properties: <ul>
       *       <li>restitution - The bounciness of the body</li>
       *         <li>friction - Friction against this body</li>
       *         <li>density - The density of the object (default: 0)</li>
       *         <li>isStatic - <tt>false</tt> for a dynamic body (default: <tt>true</tt>)</li></ul>
       *
       * @return {Box2D.Dynamics.b2Body} A Box2dWeb body definition object representing the box
       */
      addSimpleBoxBody: function(pos, extents, properties) {
         properties = $.extend({ isStatic: true }, properties);
         ;

         var bodyDef = R.physics.Simulation.BODY_DEF,
               fixDef = R.physics.Simulation.FIXTURE_DEF;

         bodyDef.type = properties.isStatic ? Box2D.Dynamics.b2Body.b2_staticBody : Box2D.Dynamics.b2Body.b2_dynamicBody;

         fixDef.shape = new Box2D.Collision.Shapes.b2PolygonShape();
         extents.div(this.scale);
         fixDef.shape.SetAsBox(extents.x / 2, extents.y / 2);	// Half-width and height

         // Set the properties
         fixDef.restitution = properties.restitution || R.components.physics.BaseBody.DEFAULT_RESTITUTION;
         fixDef.friction = properties.friction || R.components.physics.BaseBody.DEFAULT_FRICTION;
         fixDef.density = properties.density || 1.0;

         var scaled = R.math.Point2D.create(pos.x, pos.y).div(this.scale);

         bodyDef.position.x = scaled.x;
         bodyDef.position.y = scaled.y;
         scaled.destroy();
         return this.addBody(bodyDef, fixDef);
      },

      /**
       * Add a simple circle body to the simulation.  The body doesn't have a visual
       * representation, but exists in the simulation and can be interacted with.
       *
       * @param pos {Point2D} The position where the body's center is located
       * @param radius {Point2D} The radius of the circle body
       * @param properties {Object} An object with up to three properties: <ul>
       *       <li>restitution - The bounciness of the body</li>
       *         <li>friction - Friction against this body</li>
       *         <li>density - The density of the object (default: 0)</li>
       *         <li>isStatic - <tt>false</tt> for a dynamic body (default: <tt>true</tt>)</li></ul>
       *
       * @return {b2BodyDef} A Box2D-JS body definition object representing the circle
       */
      addSimpleCircleBody: function(pos, radius, properties) {
         properties = $.extend({ isStatic: true }, properties);
         ;

         var bodyDef = R.physics.Simulation.BODY_DEF,
               fixDef = R.physics.Simulation.FIXTURE_DEF;

         bodyDef.type = properties.isStatic ? Box2D.Dynamics.b2Body.b2_staticBody : Box2D.Dynamics.b2Body.b2_dynamicBody;

         radius /= this.scale;

         fixDef.shape = new Box2D.Collision.Shapes.b2CircleShape(radius);

         // Set the properties
         fixDef.restitution = properties.restitution || R.components.physics.BaseBody.DEFAULT_RESTITUTION;
         fixDef.friction = properties.friction || R.components.physics.BaseBody.DEFAULT_FRICTION;
         fixDef.density = properties.density || 1.0;

         var scaled = R.math.Point2D.create(pos.x, pos.y).div(this.scale);

         bodyDef.position.x = scaled.x;
         bodyDef.position.y = scaled.y;
         scaled.destroy();
         return this.addBody(bodyDef, fixDef);
      }

   }, /** @scope R.physics.Simulation.prototype */{

      /**
       * Get the class name as a string.
       * @return {String} "R.physics.Simulation"
       */
      getClassName: function() {
         return "R.physics.Simulation";
      },

      /**
       * Reusable definition for fixtures
       * @private
       */
      FIXTURE_DEF: null,

      /**
       * Reusable definition for bodies
       * @private
       */
      BODY_DEF: null,

      /**
       * @private
       */
      resolved: function() {
         // These are reusable, according to Box2d docs
         R.physics.Simulation.FIXTURE_DEF = new Box2D.Dynamics.b2FixtureDef();
         R.physics.Simulation.BODY_DEF = new Box2D.Dynamics.b2BodyDef();
      },

      /**
       * The default number of integrations per frame
       * @type {Number}
       */
      DEFAULT_INTEGRATIONS: 10,

      /**
       * The number of meters across the world in either dimension.
       * @type {Number}
       */
      WORLD_METERS: 100

   });
};
