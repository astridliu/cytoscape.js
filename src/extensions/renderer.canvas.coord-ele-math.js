;(function($$){ "use strict";

	var CanvasRenderer = $$('renderer', 'canvas');

	// Project mouse
	CanvasRenderer.prototype.projectIntoViewport = function(pageX, pageY) {
		
		var n = this.data.container;
			
		var offsets = this.findContainerPageCoords();
		var offsetLeft = offsets[0];
		var offsetTop = offsets[1];
		
//		console.log("calce");
		
		// By here, offsetLeft and offsetTop represent the "pageX/pageY" of the top-left corner of the div. So, do subtraction to find relative position.
		var x = pageX - offsetLeft; 
		var y = pageY - offsetTop;
		
		x -= this.data.cy.pan().x; y -= this.data.cy.pan().y; x /= this.data.cy.zoom(); y /= this.data.cy.zoom();
		return [x, y];
	}

	CanvasRenderer.prototype.findContainerPageCoords = function() {
		var offsetLeft = 0;
		var offsetTop = 0;
		var container = this.data.container;
		var n = container;
				
		while (n != null) {
			var style = window.getComputedStyle(n); 
			if (typeof(n.offsetLeft) === "number") {
				var position = style.getPropertyValue("position").toLowerCase();
				var borderLeft = parseFloat( style.getPropertyValue("border-left-width") );
				var borderTop = parseFloat( style.getPropertyValue("border-top-width") );

				offsetLeft += n.offsetLeft;
				offsetTop += n.offsetTop;

				if( position !== "static" || n === container ){
					offsetLeft += borderLeft;
					offsetTop += borderTop;
				}

				if( position === "fixed" ){
					offsetLeft += window.scrollX;
					offsetTop += window.scrollY;
					
					break; // don't want to check any more parents after position:fixed
				}
				
				if (n == document.body || n == document.header) {
					// offsetLeft -= n.scrollLeft;
					// offsetTop -= n.scrollTop;

					break;
				}
			}

			if( n ){ n = n.offsetParent };
		}
		
		// By here, offsetLeft and offsetTop represent the "pageX/pageY" of the top-left corner of the div.
		return [offsetLeft, offsetTop];
	}

	// Find nearest element
	CanvasRenderer.prototype.findNearestElement = function(x, y, visibleElementsOnly) {
		var data = this.data; var nodes = this.getCachedNodes(); var edges = this.getCachedEdges(); var near = [];
		var isTouch = CanvasRenderer.isTouch;
		
		var zoom = this.data.cy.zoom();
		var edgeThreshold = (isTouch ? 256 : 32) / zoom;
		var nodeThreshold = (isTouch ? 16 : 0) /  zoom;
		
		// Check nodes
		for (var i = 0; i < nodes.length; i++) {
			if (CanvasRenderer.nodeShapes[this.getNodeShape(nodes[i])].checkPointRough(x, y,
					nodes[i]._private.style["border-width"].pxValue / 2,
					this.getNodeWidth(nodes[i]) + nodeThreshold, this.getNodeHeight(nodes[i]) + nodeThreshold,
					nodes[i]._private.position.x, nodes[i]._private.position.y)
				&&
				CanvasRenderer.nodeShapes[this.getNodeShape(nodes[i])].checkPoint(x, y,
					nodes[i]._private.style["border-width"].pxValue / 2,
					(this.getNodeWidth(nodes[i]) + nodeThreshold), (this.getNodeHeight(nodes[i]) + nodeThreshold),
					nodes[i]._private.position.x, nodes[i]._private.position.y)) {
				
				if (visibleElementsOnly) {
					if (nodes[i]._private.style["opacity"].value != 0
						&& nodes[i]._private.style["visibility"].value == "visible"
						&& nodes[i]._private.style["display"].value == "element") {
						
						near.push(nodes[i]);	
					}
				} else {
					near.push(nodes[i]);
				}
			}
		}
		
		// Check edges
		var addCurrentEdge;
		for (var i = 0; i < edges.length; i++) {
			var edge = edges[i];
			var rs = edge._private.rscratch;

			addCurrentEdge = false;

			if (rs.edgeType == "self") {
				if (($$.math.inBezierVicinity(x, y,
						rs.startX,
						rs.startY,
						rs.cp2ax,
						rs.cp2ay,
						rs.selfEdgeMidX,
						rs.selfEdgeMidY,
						Math.pow(edge._private.style["width"].pxValue/2, 2))
							&&
					(Math.pow(edges[i]._private.style["width"].pxValue/2, 2) + edgeThreshold > 
						$$.math.sqDistanceToQuadraticBezier(x, y,
							rs.startX,
							rs.startY,
							rs.cp2ax,
							rs.cp2ay,
							rs.selfEdgeMidX,
							rs.selfEdgeMidY)))
					||
					($$.math.inBezierVicinity(x, y,
						rs.selfEdgeMidX,
						rs.selfEdgeMidY,
						rs.cp2cx,
						rs.cp2cy,
						rs.endX,
						rs.endY,
						Math.pow(edges[i]._private.style["width"].pxValue/2, 2))
							&&
					(Math.pow(edges[i]._private.style["width"].pxValue/2, 2) + edgeThreshold > 
						$$.math.sqDistanceToQuadraticBezier(x, y,
							rs.selfEdgeMidX,
							rs.selfEdgeMidY,
							rs.cp2cx,
							rs.cp2cy,
							rs.endX,
							rs.endY))))
					 { addCurrentEdge = true; }
			
			} else if (rs.edgeType == "straight") {
				if ($$.math.inLineVicinity(x, y, rs.startX, rs.startY, rs.endX, rs.endY, edges[i]._private.style["width"].pxValue * 2)
						&&
					Math.pow(edges[i]._private.style["width"].pxValue / 2, 2) + edgeThreshold >
					$$.math.sqDistanceToFiniteLine(x, y,
						rs.startX,
						rs.startY,
						rs.endX,
						rs.endY))
					{ addCurrentEdge = true; }
			
			} else if (rs.edgeType == "bezier") {
				if ($$.math.inBezierVicinity(x, y,
					rs.startX,
					rs.startY,
					rs.cp2x,
					rs.cp2y,
					rs.endX,
					rs.endY,
					Math.pow(edges[i]._private.style["width"].pxValue / 2, 2))
						&&
					(Math.pow(edges[i]._private.style["width"].pxValue / 2 , 2) + edgeThreshold >
						$$.math.sqDistanceToQuadraticBezier(x, y,
							rs.startX,
							rs.startY,
							rs.cp2x,
							rs.cp2y,
							rs.endX,
							rs.endY)))
					{ addCurrentEdge = true; }
			}
			
			if (!near.length || near[near.length - 1] != edges[i]) {
				if ((CanvasRenderer.arrowShapes[edges[i]._private.style["source-arrow-shape"].value].roughCollide(x, y,
						edges[i]._private.rscratch.arrowStartX, edges[i]._private.rscratch.arrowStartY,
						this.getArrowWidth(edges[i]._private.style["width"].pxValue),
						this.getArrowHeight(edges[i]._private.style["width"].pxValue),
						[edges[i]._private.rscratch.arrowStartX - edges[i].source()[0]._private.position.x,
							edges[i]._private.rscratch.arrowStartY - edges[i].source()[0]._private.position.y], 0)
						&&
					CanvasRenderer.arrowShapes[edges[i]._private.style["source-arrow-shape"].value].collide(x, y,
						edges[i]._private.rscratch.arrowStartX, edges[i]._private.rscratch.arrowStartY,
						this.getArrowWidth(edges[i]._private.style["width"].pxValue),
						this.getArrowHeight(edges[i]._private.style["width"].pxValue),
						[edges[i]._private.rscratch.arrowStartX - edges[i].source()[0]._private.position.x,
							edges[i]._private.rscratch.arrowStartY - edges[i].source()[0]._private.position.y], 0))
					||
					(CanvasRenderer.arrowShapes[edges[i]._private.style["target-arrow-shape"].value].roughCollide(x, y,
						edges[i]._private.rscratch.arrowEndX, edges[i]._private.rscratch.arrowEndY,
						this.getArrowWidth(edges[i]._private.style["width"].pxValue),
						this.getArrowHeight(edges[i]._private.style["width"].pxValue),
						[edges[i]._private.rscratch.arrowEndX - edges[i].target()[0]._private.position.x,
							edges[i]._private.rscratch.arrowEndY - edges[i].target()[0]._private.position.y], 0)
						&&
					CanvasRenderer.arrowShapes[edges[i]._private.style["target-arrow-shape"].value].collide(x, y,
						edges[i]._private.rscratch.arrowEndX, edges[i]._private.rscratch.arrowEndY,
						this.getArrowWidth(edges[i]._private.style["width"].pxValue),
						this.getArrowHeight(edges[i]._private.style["width"].pxValue),
						[edges[i]._private.rscratch.arrowEndX - edges[i].target()[0]._private.position.x,
							edges[i]._private.rscratch.arrowEndY - edges[i].target()[0]._private.position.y], 0)))
					{ addCurrentEdge = true; }
			}
			
			if (addCurrentEdge) {
				if (visibleElementsOnly) {
					// For edges, make sure the edge is visible/has nonzero opacity,
					// then also make sure both source and target nodes are visible/have
					// nonzero opacity
					var source = data.cy.getElementById(edges[i]._private.data.source)
					var target = data.cy.getElementById(edges[i]._private.data.target)
					
					if (edges[i]._private.style["opacity"].value != 0
						&& edges[i]._private.style["visibility"].value == "visible"
						&& edges[i]._private.style["display"].value == "element"
						&& source._private.style["opacity"].value != 0
						&& source._private.style["visibility"].value == "visible"
						&& source._private.style["display"].value == "element"
						&& target._private.style["opacity"].value != 0
						&& target._private.style["visibility"].value == "visible"
						&& target._private.style["display"].value == "element") {
						
						near.push(edges[i]);	
					}
				} else {
					near.push(edges[i]);
				}
			}
		} 
		
		near.sort( this.zOrderSort );
		
		if (near.length > 0) { return near[ near.length - 1 ]; } else { return null; }
	}

	// "Give me everything from this box"
	CanvasRenderer.prototype.getAllInBox = function(x1, y1, x2, y2) {
		var data = this.data; var nodes = this.getCachedNodes(); var edges = this.getCachedEdges(); var box = [];
		
		var x1c = Math.min(x1, x2); var x2c = Math.max(x1, x2); var y1c = Math.min(y1, y2); var y2c = Math.max(y1, y2); x1 = x1c; x2 = x2c; y1 = y1c; y2 = y2c; var heur;
		
		for (var i=0;i<nodes.length;i++) {
			if (CanvasRenderer.nodeShapes[this.getNodeShape(nodes[i])].intersectBox(x1, y1, x2, y2,
				this.getNodeWidth(nodes[i]), this.getNodeHeight(nodes[i]),
				nodes[i]._private.position.x, nodes[i]._private.position.y, nodes[i]._private.style["border-width"].pxValue / 2))
			{ box.push(nodes[i]); }
		}
		
		for (var i=0;i<edges.length;i++) {
			if (edges[i]._private.rscratch.edgeType == "self") {
				if ((heur = $$.math.boxInBezierVicinity(x1, y1, x2, y2,
						edges[i]._private.rscratch.startX, edges[i]._private.rscratch.startY,
						edges[i]._private.rscratch.cp2ax, edges[i]._private.rscratch.cp2ay,
						edges[i]._private.rscratch.endX, edges[i]._private.rscratch.endY, edges[i]._private.style["width"].pxValue))
							&&
						(heur == 2 || (heur == 1 && $$.math.checkBezierInBox(x1, y1, x2, y2,
							edges[i]._private.rscratch.startX, edges[i]._private.rscratch.startY,
							edges[i]._private.rscratch.cp2ax, edges[i]._private.rscratch.cp2ay,
							edges[i]._private.rscratch.endX, edges[i]._private.rscratch.endY, edges[i]._private.style["width"].pxValue)))
								||
					(heur = $$.math.boxInBezierVicinity(x1, y1, x2, y2,
						edges[i]._private.rscratch.startX, edges[i]._private.rscratch.startY,
						edges[i]._private.rscratch.cp2cx, edges[i]._private.rscratch.cp2cy,
						edges[i]._private.rscratch.endX, edges[i]._private.rscratch.endY, edges[i]._private.style["width"].pxValue))
							&&
						(heur == 2 || (heur == 1 && $$.math.checkBezierInBox(x1, y1, x2, y2,
							edges[i]._private.rscratch.startX, edges[i]._private.rscratch.startY,
							edges[i]._private.rscratch.cp2cx, edges[i]._private.rscratch.cp2cy,
							edges[i]._private.rscratch.endX, edges[i]._private.rscratch.endY, edges[i]._private.style["width"].pxValue)))
					)
				{ box.push(edges[i]); }
			}
			
			if (edges[i]._private.rscratch.edgeType == "bezier" &&
				(heur = $$.math.boxInBezierVicinity(x1, y1, x2, y2,
						edges[i]._private.rscratch.startX, edges[i]._private.rscratch.startY,
						edges[i]._private.rscratch.cp2x, edges[i]._private.rscratch.cp2y,
						edges[i]._private.rscratch.endX, edges[i]._private.rscratch.endY, edges[i]._private.style["width"].pxValue))
							&&
						(heur == 2 || (heur == 1 && $$.math.checkBezierInBox(x1, y1, x2, y2,
							edges[i]._private.rscratch.startX, edges[i]._private.rscratch.startY,
							edges[i]._private.rscratch.cp2x, edges[i]._private.rscratch.cp2y,
							edges[i]._private.rscratch.endX, edges[i]._private.rscratch.endY, edges[i]._private.style["width"].pxValue))))
				{ box.push(edges[i]); }
		
			if (edges[i]._private.rscratch.edgeType == "straight" &&
				(heur = $$.math.boxInBezierVicinity(x1, y1, x2, y2,
						edges[i]._private.rscratch.startX, edges[i]._private.rscratch.startY,
						edges[i]._private.rscratch.startX * 0.5 + edges[i]._private.rscratch.endX * 0.5, 
						edges[i]._private.rscratch.startY * 0.5 + edges[i]._private.rscratch.endY * 0.5, 
						edges[i]._private.rscratch.endX, edges[i]._private.rscratch.endY, edges[i]._private.style["width"].pxValue))
							&& /* console.log("test", heur) == undefined && */
						(heur == 2 || (heur == 1 && $$.math.checkStraightEdgeInBox(x1, y1, x2, y2,
							edges[i]._private.rscratch.startX, edges[i]._private.rscratch.startY,
							edges[i]._private.rscratch.endX, edges[i]._private.rscratch.endY, edges[i]._private.style["width"].pxValue))))
				{ box.push(edges[i]); }
			
		}
		
		return box;
	}


	/**
	 * Returns the width of the given node. If the width is set to auto,
	 * returns the value of the autoWidth field.
	 *
	 * @param node          a node
	 * @return {number}     width of the node
	 */
	CanvasRenderer.prototype.getNodeWidth = function(node)
	{
		return node.width();
	};

	/**
	 * Returns the height of the given node. If the height is set to auto,
	 * returns the value of the autoHeight field.
	 *
	 * @param node          a node
	 * @return {number}     width of the node
	 */
	CanvasRenderer.prototype.getNodeHeight = function(node)
	{
		return node.height();
	};

	/**
	 * Returns the shape of the given node. If the height or width of the given node
	 * is set to auto, the node is considered to be a compound.
	 *
	 * @param node          a node
	 * @return {String}     shape of the node
	 */
	CanvasRenderer.prototype.getNodeShape = function(node)
	{
		// TODO only allow rectangle for a compound node?
//		if (node._private.style["width"].value == "auto" ||
//		    node._private.style["height"].value == "auto")
//		{
//			return "rectangle";
//		}

		var shape = node._private.style["shape"].value;

		if( node.isParent() ){
			if( shape === 'rectangle' || shape === 'roundrectangle' ){
				return shape;
			} else {
				return 'rectangle';
			}
		}

		return shape;
	};


	CanvasRenderer.prototype.getNodePadding = function(node)
	{
		var left = node._private.style["padding-left"].pxValue;
		var right = node._private.style["padding-right"].pxValue;
		var top = node._private.style["padding-top"].pxValue;
		var bottom = node._private.style["padding-bottom"].pxValue;

		if (isNaN(left))
		{
			left = 0;
		}

		if (isNaN(right))
		{
			right = 0;
		}

		if (isNaN(top))
		{
			top = 0;
		}

		if (isNaN(bottom))
		{
			bottom = 0;
		}

		return {left : left,
			right : right,
			top : top,
			bottom : bottom};
	};

	CanvasRenderer.prototype.zOrderSort = $$.Collection.zIndexSort;

	CanvasRenderer.prototype.updateCachedZSortedEles = function(){
		this.getCachedZSortedEles( true );
	};

	CanvasRenderer.prototype.getCachedZSortedEles = function( forceRecalc ){
		var lastNodes = this.lastZOrderCachedNodes;
		var lastEdges = this.lastZOrderCachedEdges;
		var nodes = this.getCachedNodes();
		var edges = this.getCachedEdges();
		var eles = [];

		if( forceRecalc || !lastNodes || !lastEdges || lastNodes !== nodes || lastEdges !== edges ){ 
			//console.time('cachezorder')
			
			for( var i = 0; i < nodes.length; i++ ){
				eles.push( nodes[i] );
			}

			for( var i = 0; i < edges.length; i++ ){
				eles.push( edges[i] );
			}

			eles.sort( this.zOrderSort );
			this.cachedZSortedEles = eles;
			//console.log('make cache')

			//console.timeEnd('cachezorder')
		} else {
			eles = this.cachedZSortedEles;
			//console.log('read cache')
		}

		this.lastZOrderCachedNodes = nodes;
		this.lastZOrderCachedEdges = edges;

		return eles;
	};

	CanvasRenderer.prototype.projectBezier = function(edge){
		var qbezierAt = $$.math.qbezierAt;
		var rs = edge._private.rscratch;
		var bpts = edge._private.rstyle.bezierPts = [];

		function pushBezierPts(pts){
			bpts.push({
				x: qbezierAt( pts[0], pts[2], pts[4], 0.05 ),
				y: qbezierAt( pts[1], pts[3], pts[5], 0.05 )
			});

			bpts.push({
				x: qbezierAt( pts[0], pts[2], pts[4], 0.25 ),
				y: qbezierAt( pts[1], pts[3], pts[5], 0.25 )
			});

			bpts.push({
				x: qbezierAt( pts[0], pts[2], pts[4], 0.4 ),
				y: qbezierAt( pts[1], pts[3], pts[5], 0.4 )
			});

			bpts.push({
				x: qbezierAt( pts[0], pts[2], pts[4], 0.5 ),
				y: qbezierAt( pts[1], pts[3], pts[5], 0.5 )
			});

			bpts.push({
				x: qbezierAt( pts[0], pts[2], pts[4], 0.6 ),
				y: qbezierAt( pts[1], pts[3], pts[5], 0.6 )
			});

			bpts.push({
				x: qbezierAt( pts[0], pts[2], pts[4], 0.75 ),
				y: qbezierAt( pts[1], pts[3], pts[5], 0.75 )
			});

			bpts.push({
				x: qbezierAt( pts[0], pts[2], pts[4], 0.95 ),
				y: qbezierAt( pts[1], pts[3], pts[5], 0.95 )
			});
		}

		if( rs.edgeType === "self" ){
			pushBezierPts( [rs.startX, rs.startY, rs.cp2ax, rs.cp2ay, rs.selfEdgeMidX, rs.selfEdgeMidY] );
			pushBezierPts( [rs.selfEdgeMidX, rs.selfEdgeMidY, rs.cp2cx, rs.cp2cy, rs.endX, rs.endY] );
		} else if( rs.edgeType === "bezier" ){
			pushBezierPts( [rs.startX, rs.startY, rs.cp2x, rs.cp2y, rs.endX, rs.endY] );
		}
	};

	CanvasRenderer.prototype.recalculateNodeLabelProjection = function( node ){
		var textX, textY;
		var nodeWidth = node.outerWidth();
		var nodeHeight = node.outerHeight();
		var nodePos = node._private.position;
		var textHalign = node._private.style["text-halign"].strValue;
		var textValign = node._private.style["text-valign"].strValue;
		var rs = node._private.rscratch;
		var rstyle = node._private.rstyle;

		switch( textHalign ){
			case "left":
				textX = nodePos.x - nodeWidth / 2;
				break;

			case "right":
				textX = nodePos.x + nodeWidth / 2;
				break;

			case "center":
			default:
				textX = nodePos.x;
		}

		switch( textValign ){
			case "top":
				textY = nodePos.y - nodeHeight / 2;
				break;

			case "bottom":
				textY = nodePos.y + nodeHeight / 2;
				break;

			case "middle":
			default:
				textY = nodePos.y;
		}
	
		rs.labelX = textX;
		rs.labelY = textY;
		rstyle.labelX = textX;
		rstyle.labelY = textY;

		var context = this.data.bufferCanvases[0].getContext("2d");
		var text = this.setupTextStyle( context, node );
		//var labelWidth = context.measureText( text ).width;

		var labelDims = this.calculateLabelDimensions( node, text );

		rstyle.labelWidth = labelDims.width;
		rs.labelWidth = labelDims.width;

		rstyle.labelHeight = labelDims.height;
		rs.labelHeight = labelDims.height;
	};

	CanvasRenderer.prototype.recalculateEdgeLabelProjection = function( edge ){
		var textX, textY;	
		var edgeCenterX, edgeCenterY;
		var rs = edge._private.rscratch;
		var rstyle = edge._private.rstyle;
		
		if (rs.edgeType == "self") {
			edgeCenterX = rs.selfEdgeMidX;
			edgeCenterY = rs.selfEdgeMidY;
		} else if (rs.edgeType == "straight") {
			edgeCenterX = (rs.startX + rs.endX) / 2;
			edgeCenterY = (rs.startY + rs.endY) / 2;
		} else if (rs.edgeType == "bezier") {
			edgeCenterX = $$.math.qbezierAt( rs.startX, rs.cp2x, rs.endX, 0.5 );
			edgeCenterY = $$.math.qbezierAt( rs.startY, rs.cp2y, rs.endY, 0.5 );
		}
		
		textX = edgeCenterX;
		textY = edgeCenterY;

		// add center point to style so bounding box calculations can use it
		rs.labelX = textX;
		rs.labelY = textY;
		rstyle.labelX = textX;
		rstyle.labelY = textY;

		var context = this.data.bufferCanvases[0].getContext("2d");
		var text = this.setupTextStyle( context, edge );
		//var labelWidth = context.measureText( text ).width;

		var labelDims = this.calculateLabelDimensions( edge, text );

		rstyle.labelWidth = labelDims.width;
		rs.labelWidth = labelDims.width;

		rstyle.labelHeight = labelDims.height;
		rs.labelHeight = labelDims.height;
	};

	CanvasRenderer.prototype.calculateLabelDimensions = function( ele, text ){
		var style = ele._private.style;
		var fStyle = style["font-style"].strValue;
		var size = style["font-size"].pxValue + "px";
		var family = style["font-family"].strValue;
		var variant = style["font-variant"].strValue;
		var weight = style["font-weight"].strValue;

		var div = this.labelCalcDiv;

		if( !div ){
			div = this.labelCalcDiv = document.createElement("div");
			document.body.appendChild( div );
		}

		var ds = div.style;

		// from ele style
		ds.fontFamily = family;
		ds.fontStyle = fStyle;
		ds.fontSize = size;
		ds.fontVariant = variant;
		ds.fontWeight = weight;

		// forced style
		ds.position = "absolute";
		ds.left = "-9999px";
		ds.top = "-9999px";
		ds.zIndex = "-1";
		ds.visibility = "hidden";
		ds.padding = "0";
		ds.lineHeight = "1";

		// put label content in div
		div.innerText = text;

		return {
			width: div.clientWidth,
			height: div.clientHeight
		};
	};	

	CanvasRenderer.prototype.recalculateRenderedStyle = function(){
		this.recalculateEdgeProjections();
		this.recalculateLabelProjections();
	};

	CanvasRenderer.prototype.recalculateLabelProjections = function(){
		var nodes = this.getCachedNodes();
		for( var i = 0; i < nodes.length; i++ ){
			this.recalculateNodeLabelProjection( nodes[i] );
		}

		var edges = this.getCachedEdges();
		for( var i = 0; i < edges.length; i++ ){
			this.recalculateEdgeLabelProjection( edges[i] );
		}
	};

	CanvasRenderer.prototype.recalculateEdgeProjections = function(){
		var edges = this.getCachedEdges();

		this.findEdgeControlPoints( edges );
	};


	// Find edge control points
	CanvasRenderer.prototype.findEdgeControlPoints = function(edges) {
		var hashTable = {}; var cy = this.data.cy;
		var pairIds = [];
		
		// create a table of edge (src, tgt) => list of edges between them
		var pairId;
		for (var i = 0; i < edges.length; i++){
			var edge = edges[i];

			// ignore edges who are not to be displayed
			// they shouldn't take up space
			if( edge._private.style.display.value === 'none' ){
				continue;
			}

			var srcId = edge._private.data.source;
			var tgtId = edge._private.data.target;

			pairId = srcId > tgtId ?
				tgtId + '-' + srcId :
				srcId + '-' + tgtId ;

			if (hashTable[pairId] == undefined) {
				hashTable[pairId] = [];
			}
			
			hashTable[pairId].push( edge );
			pairIds.push( pairId );
		}

		var src, tgt, srcPos, tgtPos, srcW, srcH, tgtW, tgtH, srcShape, tgtShape, srcBorder, tgtBorder;
		var midpt;
		var vectorNormInverse;
		var badBezier;
		
		// for each pair (src, tgt), create the ctrl pts
		// Nested for loop is OK; total number of iterations for both loops = edgeCount	
		for (var p = 0; p < pairIds.length; p++) {
			pairId = pairIds[p];
		
			src = cy.getElementById( hashTable[pairId][0]._private.data.source );
			tgt = cy.getElementById( hashTable[pairId][0]._private.data.target );

			srcPos = src._private.position;
			tgtPos = tgt._private.position;

			srcW = this.getNodeWidth(src);
			srcH = this.getNodeHeight(src);

			tgtW = this.getNodeWidth(tgt);
			tgtH = this.getNodeHeight(tgt);

			srcShape = CanvasRenderer.nodeShapes[ this.getNodeShape(src) ];
			tgtShape = CanvasRenderer.nodeShapes[ this.getNodeShape(tgt) ];

			srcBorder = src._private.style["border-width"].pxValue;
			tgtBorder = tgt._private.style["border-width"].pxValue;

			badBezier = false;
			

			if (hashTable[pairId].length > 1) {

				// pt outside src shape to calc distance/displacement from src to tgt
				var srcOutside = srcShape.intersectLine(
					srcPos.x,
					srcPos.y,
					srcW,
					srcH,
					tgtPos.x,
					tgtPos.y,
					srcBorder / 2
				);

				// pt outside tgt shape to calc distance/displacement from src to tgt
				var tgtOutside = tgtShape.intersectLine(
					tgtPos.x,
					tgtPos.y,
					tgtW,
					tgtH,
					srcPos.x,
					srcPos.y,
					tgtBorder / 2
				);

				var midpt = {
					x: ( srcOutside[0] + tgtOutside[0] )/2,
					y: ( srcOutside[1] + tgtOutside[1] )/2
				};

				var dy = ( tgtOutside[1] - srcOutside[1] );
				var dx = ( tgtOutside[0] - srcOutside[0] );
				var l = Math.sqrt( dx*dx + dy*dy );

				var vector = {
					x: dx,
					y: dy
				};
				
				var vectorNorm = {
					x: vector.x/l,
					y: vector.y/l
				};
				vectorNormInverse = {
					x: -vectorNorm.y,
					y: vectorNorm.x
				};

				// if src intersection is inside tgt or tgt intersection is inside src, then no ctrl pts to draw
				if( 
					tgtShape.checkPoint( srcOutside[0], srcOutside[1], tgtBorder/2, tgtW, tgtH, tgtPos.x, tgtPos.y )  ||
					srcShape.checkPoint( tgtOutside[0], tgtOutside[1], srcBorder/2, srcW, srcH, srcPos.x, srcPos.y ) 
				){
					vectorNormInverse = {};
					badBezier = true;
				}
				
			}
			
			var edge;
			var rs;
			
			for (var i = 0; i < hashTable[pairId].length; i++) {
				edge = hashTable[pairId][i];
				rs = edge._private.rscratch;
				
				var edgeIndex1 = rs.lastEdgeIndex;
				var edgeIndex2 = i;

				var numEdges1 = rs.lastNumEdges;
				var numEdges2 = hashTable[pairId].length;

				var srcX1 = rs.lastSrcCtlPtX;
				var srcX2 = srcPos.x;
				var srcY1 = rs.lastSrcCtlPtY;
				var srcY2 = srcPos.y;
				var srcW1 = rs.lastSrcCtlPtW;
				var srcW2 = src.outerWidth();
				var srcH1 = rs.lastSrcCtlPtH;
				var srcH2 = src.outerHeight();

				var tgtX1 = rs.lastTgtCtlPtX;
				var tgtX2 = tgtPos.x;
				var tgtY1 = rs.lastTgtCtlPtY;
				var tgtY2 = tgtPos.y;
				var tgtW1 = rs.lastTgtCtlPtW;
				var tgtW2 = tgt.outerWidth();
				var tgtH1 = rs.lastTgtCtlPtH;
				var tgtH2 = tgt.outerHeight();

				if( badBezier ){
					rs.badBezier = true;
				} else {
					rs.badBezier = false;
				}

				if( srcX1 === srcX2 && srcY1 === srcY2 && srcW1 === srcW2 && srcH1 === srcH2
				&&  tgtX1 === tgtX2 && tgtY1 === tgtY2 && tgtW1 === tgtW2 && tgtH1 === tgtH2
				&&  edgeIndex1 === edgeIndex2 && numEdges1 === numEdges2 ){
					// console.log('edge ctrl pt cache HIT')
					continue; // then the control points haven't changed and we can skip calculating them
				} else {
					rs.lastSrcCtlPtX = srcX2;
					rs.lastSrcCtlPtY = srcY2;
					rs.lastSrcCtlPtW = srcW2;
					rs.lastSrcCtlPtH = srcH2;
					rs.lastTgtCtlPtX = tgtX2;
					rs.lastTgtCtlPtY = tgtY2;
					rs.lastTgtCtlPtW = tgtW2;
					rs.lastTgtCtlPtH = tgtH2;
					rs.lastEdgeIndex = edgeIndex2;
					rs.lastNumEdges = numEdges2;
					// console.log('edge ctrl pt cache MISS')
				}

				var stepSize = edge._private.style["control-point-step-size"].value;

				// Self-edge
				if ( src.id() == tgt.id() ) {
						
					rs.edgeType = "self";
					
					// New -- fix for large nodes
					rs.cp2ax = srcPos.x;
					rs.cp2ay = srcPos.y - (1 + Math.pow(srcH, 1.12) / 100) * stepSize * (i / 3 + 1);
					
					rs.cp2cx = src._private.position.x - (1 + Math.pow(srcW, 1.12) / 100) * stepSize * (i / 3 + 1);
					rs.cp2cy = srcPos.y;
					
					rs.selfEdgeMidX = (rs.cp2ax + rs.cp2cx) / 2.0;
					rs.selfEdgeMidY = (rs.cp2ay + rs.cp2cy) / 2.0;
					
				// Straight edge
				} else if (hashTable[pairId].length % 2 == 1
					&& i == Math.floor(hashTable[pairId].length / 2)) {
					
					rs.edgeType = "straight";
					
				// Bezier edge
				} else {
					var distanceFromMidpoint = (0.5 - hashTable[pairId].length / 2 + i) * stepSize;
					
					rs.edgeType = "bezier";
					
					rs.cp2x = midpt.x + vectorNormInverse.x * distanceFromMidpoint;
					rs.cp2y = midpt.y + vectorNormInverse.y * distanceFromMidpoint;
					
					// console.log(edge, midPointX, displacementX, distanceFromMidpoint);
				}

				// find endpts for edge
				this.findEndpoints( edge );

				var badStart = !$$.is.number( rs.startX ) || !$$.is.number( rs.startY );
				var badAStart = !$$.is.number( rs.arrowStartX ) || !$$.is.number( rs.arrowStartY );
				var badEnd = !$$.is.number( rs.endX ) || !$$.is.number( rs.endY );
				var badAEnd = !$$.is.number( rs.arrowEndX ) || !$$.is.number( rs.arrowEndY );

				var minCpADistFactor = 3;
				var arrowW = this.getArrowWidth( edge._private.style['width'].pxValue ) * CanvasRenderer.arrowShapeHeight;
				var minCpADist = minCpADistFactor * arrowW;
				var startACpDist = $$.math.distance( { x: rs.cp2x, y: rs.cp2y }, { x: rs.startX, y: rs.startY } );
				var closeStartACp = startACpDist < minCpADist;
				var endACpDist = $$.math.distance( { x: rs.cp2x, y: rs.cp2y }, { x: rs.endX, y: rs.endY } );
				var closeEndACp = endACpDist < minCpADist;

				if( rs.edgeType === "bezier" ){
					var overlapping = false;

					if( badStart || badAStart || closeStartACp ){
						overlapping = true;

						// project control point along line from src centre to outside the src shape
						// (otherwise intersection will yield nothing)
						var cpD = { // delta
							x: rs.cp2x - srcPos.x,
							y: rs.cp2y - srcPos.y
						};
						var cpL = Math.sqrt( cpD.x*cpD.x + cpD.y*cpD.y ); // length of line
						var cpM = { // normalised delta
							x: cpD.x / cpL,
							y: cpD.y / cpL
						};
						var radius = Math.max(srcW, srcH);
						var cpProj = { // *2 radius guarantees outside shape
							x: rs.cp2x + cpM.x * 2 * radius,
							y: rs.cp2y + cpM.y * 2 * radius
						};

						var srcCtrlPtIntn = srcShape.intersectLine(
							srcPos.x,
							srcPos.y,
							srcW,
							srcH,
							cpProj.x,
							cpProj.y,
							srcBorder / 2
						);

						if( closeStartACp ){
							rs.cp2x = rs.cp2x + cpM.x * (minCpADist - startACpDist); 
							rs.cp2y = rs.cp2y + cpM.y * (minCpADist - startACpDist)
						} else {
							rs.cp2x = srcCtrlPtIntn[0] + cpM.x * minCpADist; 
							rs.cp2y = srcCtrlPtIntn[1] + cpM.y * minCpADist;
						}
					}

					if( badEnd || badAEnd || closeEndACp ){
						overlapping = true;

						// project control point along line from tgt centre to outside the tgt shape
						// (otherwise intersection will yield nothing)
						var cpD = { // delta
							x: rs.cp2x - tgtPos.x,
							y: rs.cp2y - tgtPos.y
						};
						var cpL = Math.sqrt( cpD.x*cpD.x + cpD.y*cpD.y ); // length of line
						var cpM = { // normalised delta
							x: cpD.x / cpL,
							y: cpD.y / cpL
						};
						var radius = Math.max(srcW, srcH);
						var cpProj = { // *2 radius guarantees outside shape
							x: rs.cp2x + cpM.x * 2 * radius,
							y: rs.cp2y + cpM.y * 2 * radius
						};

						var tgtCtrlPtIntn = tgtShape.intersectLine(
							tgtPos.x,
							tgtPos.y,
							tgtW,
							tgtH,
							cpProj.x,
							cpProj.y,
							tgtBorder / 2
						);

						if( closeEndACp ){
							rs.cp2x = rs.cp2x + cpM.x * (minCpADist - endACpDist); 
							rs.cp2y = rs.cp2y + cpM.y * (minCpADist - endACpDist);
						} else {
							rs.cp2x = tgtCtrlPtIntn[0] + cpM.x * minCpADist; 
							rs.cp2y = tgtCtrlPtIntn[1] + cpM.y * minCpADist;
						}
						
					}

					if( overlapping ){
						// recalc endpts
						this.findEndpoints( edge );
					}
				}

				// project the edge into rstyle
				this.projectBezier( edge );

			}
		}
		
		return hashTable;
	}

	CanvasRenderer.prototype.findEndpoints = function(edge) {
		var intersect;

		var source = edge.source()[0];
		var target = edge.target()[0];
		
		var srcPos = source._private.position;
		var tgtPos = target._private.position;

		var tgtArShape = edge._private.style["target-arrow-shape"].value;
		var srcArShape = edge._private.style["source-arrow-shape"].value;

		var tgtBorderW = target._private.style["border-width"].pxValue;
		var srcBorderW = source._private.style["border-width"].pxValue;

		var rs = edge._private.rscratch;
		
		if (edge._private.rscratch.edgeType == "self") {
			
			var cp = [rs.cp2cx, rs.cp2cy];
			
			intersect = CanvasRenderer.nodeShapes[this.getNodeShape(target)].intersectLine(
				target._private.position.x,
				target._private.position.y,
				this.getNodeWidth(target),
				this.getNodeHeight(target),
				cp[0],
				cp[1], 
				tgtBorderW / 2
			);
			
			var arrowEnd = $$.math.shortenIntersection(intersect, cp,
				CanvasRenderer.arrowShapes[tgtArShape].spacing(edge));
			var edgeEnd = $$.math.shortenIntersection(intersect, cp,
				CanvasRenderer.arrowShapes[tgtArShape].gap(edge));
			
			rs.endX = edgeEnd[0];
			rs.endY = edgeEnd[1];
			
			rs.arrowEndX = arrowEnd[0];
			rs.arrowEndY = arrowEnd[1];
			
			var cp = [rs.cp2ax, rs.cp2ay];

			intersect = CanvasRenderer.nodeShapes[this.getNodeShape(source)].intersectLine(
				source._private.position.x,
				source._private.position.y,
				this.getNodeWidth(source),
				this.getNodeHeight(source),
				cp[0], //halfPointX,
				cp[1], //halfPointY
				srcBorderW / 2
			);
			
			var arrowStart = $$.math.shortenIntersection(intersect, cp,
				CanvasRenderer.arrowShapes[srcArShape].spacing(edge));
			var edgeStart = $$.math.shortenIntersection(intersect, cp,
				CanvasRenderer.arrowShapes[srcArShape].gap(edge));
			
			rs.startX = edgeStart[0];
			rs.startY = edgeStart[1];


			rs.arrowStartX = arrowStart[0];
			rs.arrowStartY = arrowStart[1];
			
		} else if (rs.edgeType == "straight") {
		
			intersect = CanvasRenderer.nodeShapes[this.getNodeShape(target)].intersectLine(
				target._private.position.x,
				target._private.position.y,
				this.getNodeWidth(target),
				this.getNodeHeight(target),
				source.position().x,
				source.position().y,
				tgtBorderW / 2);
				
			if (intersect.length == 0) {
				rs.noArrowPlacement = true;
	//			return;
			} else {
				rs.noArrowPlacement = false;
			}
			
			var arrowEnd = $$.math.shortenIntersection(intersect,
				[source.position().x, source.position().y],
				CanvasRenderer.arrowShapes[tgtArShape].spacing(edge));
			var edgeEnd = $$.math.shortenIntersection(intersect,
				[source.position().x, source.position().y],
				CanvasRenderer.arrowShapes[tgtArShape].gap(edge));

			rs.endX = edgeEnd[0];
			rs.endY = edgeEnd[1];
			
			rs.arrowEndX = arrowEnd[0];
			rs.arrowEndY = arrowEnd[1];
		
			intersect = CanvasRenderer.nodeShapes[this.getNodeShape(source)].intersectLine(
				source._private.position.x,
				source._private.position.y,
				this.getNodeWidth(source),
				this.getNodeHeight(source),
				target.position().x,
				target.position().y,
				srcBorderW / 2);
			
			if (intersect.length == 0) {
				rs.noArrowPlacement = true;
	//			return;
			} else {
				rs.noArrowPlacement = false;
			}
			
			/*
			console.log("1: "
				+ CanvasRenderer.arrowShapes[srcArShape],
					srcArShape);
			*/
			var arrowStart = $$.math.shortenIntersection(intersect,
				[target.position().x, target.position().y],
				CanvasRenderer.arrowShapes[srcArShape].spacing(edge));
			var edgeStart = $$.math.shortenIntersection(intersect,
				[target.position().x, target.position().y],
				CanvasRenderer.arrowShapes[srcArShape].gap(edge));

			rs.startX = edgeStart[0];
			rs.startY = edgeStart[1];
			
			rs.arrowStartX = arrowStart[0];
			rs.arrowStartY = arrowStart[1];
						
		} else if (rs.edgeType == "bezier") {
			// if( window.badArrow) debugger;
			var cp = [rs.cp2x, rs.cp2y];
			
			intersect = CanvasRenderer.nodeShapes[
				this.getNodeShape(target)].intersectLine(
				target._private.position.x,
				target._private.position.y,
				this.getNodeWidth(target),
				this.getNodeHeight(target),
				cp[0], //halfPointX,
				cp[1], //halfPointY
				tgtBorderW / 2
			);
			
			/*
			console.log("2: "
				+ CanvasRenderer.arrowShapes[srcArShape],
					srcArShape);
			*/
			var arrowEnd = $$.math.shortenIntersection(intersect, cp,
				CanvasRenderer.arrowShapes[tgtArShape].spacing(edge));
			var edgeEnd = $$.math.shortenIntersection(intersect, cp,
				CanvasRenderer.arrowShapes[tgtArShape].gap(edge));
			
			rs.endX = edgeEnd[0];
			rs.endY = edgeEnd[1];
			
			rs.arrowEndX = arrowEnd[0];
			rs.arrowEndY = arrowEnd[1];
			
			intersect = CanvasRenderer.nodeShapes[
				this.getNodeShape(source)].intersectLine(
				source._private.position.x,
				source._private.position.y,
				this.getNodeWidth(source),
				this.getNodeHeight(source),
				cp[0], //halfPointX,
				cp[1], //halfPointY
				srcBorderW / 2
			);
			
			var arrowStart = $$.math.shortenIntersection(
				intersect, 
				cp,
				CanvasRenderer.arrowShapes[srcArShape].spacing(edge)
			);
			var edgeStart = $$.math.shortenIntersection(
				intersect, 
				cp,
				CanvasRenderer.arrowShapes[srcArShape].gap(edge)
			);
		
			rs.startX = edgeStart[0];
			rs.startY = edgeStart[1];
			
			rs.arrowStartX = arrowStart[0];
			rs.arrowStartY = arrowStart[1];
			
			// if( isNaN(rs.startX) || isNaN(rs.startY) ){
			// 	debugger;
			// }

		} else if (rs.isArcEdge) {
			return;
		}
	}

	// Find adjacent edges
	CanvasRenderer.prototype.findEdges = function(nodeSet) {
		
		var edges = this.getCachedEdges();
		
		var hashTable = {};
		var adjacentEdges = [];
		
		for (var i = 0; i < nodeSet.length; i++) {
			hashTable[nodeSet[i]._private.data.id] = nodeSet[i];
		}
		
		for (var i = 0; i < edges.length; i++) {
			if (hashTable[edges[i]._private.data.source]
				|| hashTable[edges[i]._private.data.target]) {
				
				adjacentEdges.push(edges[i]);
			}
		}
		
		return adjacentEdges;
	}

	CanvasRenderer.prototype.getArrowWidth = function(edgeWidth) {
		return Math.max(Math.pow(edgeWidth * 13.37, 0.9), 29);
	}
	
	CanvasRenderer.prototype.getArrowHeight = function(edgeWidth) {
		return Math.max(Math.pow(edgeWidth * 13.37, 0.9), 29);
	}


})( cytoscape );
