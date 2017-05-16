'use strict';

module.exports = function(Chart) {

	var globalOpts = Chart.defaults.global;

	globalOpts.elements.rectangle = {
		backgroundColor: globalOpts.defaultColor,
		borderWidth: 0,
		borderColor: globalOpts.defaultColor,
		borderSkipped: 'bottom'
	};

	function isVertical(bar) {
		return bar._view.width !== undefined;
	}

	/**
	 * Helper function to get the bounds of the bar regardless of the orientation
	 * @private
	 * @param bar {Chart.Element.Rectangle} the bar
	 * @return {Bounds} bounds of the bar
	 */
	function getBarBounds(bar) {
		var vm = bar._view;
		var x1, x2, y1, y2;

		if (isVertical(bar)) {
			// vertical
			var halfWidth = vm.width / 2;
			x1 = vm.x - halfWidth;
			x2 = vm.x + halfWidth;
			y1 = Math.min(vm.y, vm.base);
			y2 = Math.max(vm.y, vm.base);
		} else {
			// horizontal bar
			var halfHeight = vm.height / 2;
			x1 = Math.min(vm.x, vm.base);
			x2 = Math.max(vm.x, vm.base);
			y1 = vm.y - halfHeight;
			y2 = vm.y + halfHeight;
		}

		return {
			left: x1,
			top: y1,
			right: x2,
			bottom: y2
		};
	}

	Chart.elements.Rectangle = Chart.Element.extend({
		draw: function() {
			var ctx = this._chart.ctx;
			var vm = this._view;
			var left, right, top, bottom, signX, signY;

			// Like CSS:
			// - one border to rule them all
			// - top-bottom + left-right
			// - top + right + bottom + left
			var borderWidth = !vm.borderWidth ? [] : vm.borderWidth instanceof Array ? vm.borderWidth : [ vm.borderWidth ];

			// Define which borders will be skipped. Esentially the same as setting borderWidth to 0
			var borderSkipped = !vm.borderSkipped ? [] : vm.borderSkipped instanceof Array ? vm.borderSkipped : [ vm.borderSkipped ];

			if (!vm.horizontal) {
				// bar
				left = vm.x - vm.width / 2;
				right = vm.x + vm.width / 2;
				top = vm.y;
				bottom = vm.base;
				signX = 1;
				signY = bottom > top? 1: -1;
				borderSkipped = vm.borderSkipped || ['bottom'];
			} else {
				// horizontal bar
				left = vm.base;
				right = vm.x;
				top = vm.y - vm.height / 2;
				bottom = vm.y + vm.height / 2;
				signX = right > left? 1: -1;
				signY = 1;
				borderSkipped = vm.borderSkipped || ['left'];
			}


			// borderWidth shold be less than bar width and bar height.
			// ..,maximum border width for left-right borders
			var barSizeLeftRight = Math.abs(left - right);
			// ...maximum border width for top-bottom borders
			var barSizeTopBottom = Math.abs(top - bottom);
		  function getBorderWidth(border) {
				if(borderWidth.length == 1) {
					if(border == 'top' || border == 'bottom') {
						return borderWidth[0] > barSizeTopBottom ? barSizeTopBottom : borderWidth[0];
					} else {
						return borderWidth[0] > barSizeLeftRight ? barSizeLeftRight : borderWidth[0];
					}
				} else if(borderWidth.length == 2) {
					if(border == 'top' || border == 'bottom') {
						return borderWidth[0] > barSizeTopBottom ? barSizeTopBottom : borderWidth[0];
					} else {
						return borderWidth[1] > barSizeLeftRight ? barSizeLeftRight : borderWidth[1];
					}
				} else if(border == 'top') {
					return borderWidth[0] > barSizeTopBottom ? barSizeTopBottom : borderWidth[0];
				} else if(border == 'right') {
					return borderWidth[1] > barSizeLeftRight ? barSizeLeftRight : borderWidth[1];
				} else if(border == 'bottom') {
					return borderWidth[2] > barSizeTopBottom ? barSizeTopBottom : borderWidth[2];
				} else {
					return borderWidth[3] > barSizeLeftRight ? barSizeLeftRight : borderWidth[3];
				}
			}

			// Canvas doesn't allow us to stroke inside the width so we can
			// adjust the sizes to fit if we're setting a stroke on the line
			if (borderWidth.length > 0) {
				// Adjust borderWidth when bar top position is near vm.base(zero).
				var borderLeft = left + (!borderSkipped.includes('left') ? (getBorderWidth('left') / 2) * signX : 0);
				var borderRight = right + (!borderSkipped.includes('right') ? (-getBorderWidth('right') / 2) * signX : 0);
				var borderTop = top + (!borderSkipped.includes('top') ? (getBorderWidth('top') / 2) * signY : 0);
				var borderBottom = bottom + (!borderSkipped.includes('bottom') ? (-getBorderWidth('bottom') / 2) * signY : 0);
				// not become a vertical line?
				if (borderLeft !== borderRight) {
					top = borderTop;
					bottom = borderBottom;
				}
				// not become a horizontal line?
				if (borderTop !== borderBottom) {
					left = borderLeft;
					right = borderRight;
				}
			}

			// Draw the inside first...
			ctx.beginPath();
			ctx.fillStyle = vm.backgroundColor;

			var borders = {
				'bottom': [ [ left, bottom ], [ right, bottom ] ],
				'right': [ [ right, bottom ], [ right, top ] ],
				'top': [ [ right, top ], [ left, top ]],
				'left': [ [ left, top ], [ left, bottom ] ],
			};
			ctx.strokeStyle = "rgba(0,0,0,0)";
			ctx.lineWidth = 0;
			ctx.moveTo(left, bottom);
			for(var i in borders) {
				var border = borders[i];
				ctx.lineTo(border[1][0], border[1][1]);
			}
			ctx.lineTo(left, bottom);
			ctx.fill();

			// ...and draw the borders second

			// Make sure border lengths are adjusted for border with
			if(!borderSkipped.includes("top") && getBorderWidth("top") > 0) {
				borders['left'] = [ [ borders['left'][0][0], borders['left'][0][1] - getBorderWidth("top")/2 ], borders['left'][1] ];
				borders['right'] = [ borders['right'][0], [ borders['right'][1][0], borders['right'][1][1] - getBorderWidth("top")/2 ] ];
			}
			if(!borderSkipped.includes("bottom") && getBorderWidth("bottom") > 0) {
				borders['left'] = [ borders['left'][0], [ borders['left'][1][0], borders['left'][1][1] + getBorderWidth("bottom")/2 ] ];
				borders['right'] = [ [ borders['right'][0][0], borders['right'][0][1] + getBorderWidth("bottom")/2 ], borders['right'][1] ];
			}

			// Draw the borders. Since canvas doesn't allow drawing the borders with
			// different widths, draw each line individually.
			ctx.strokeStyle = vm.borderColor;
			for(var i in borders) {
				var border = borders[i];
				ctx.lineWidth = getBorderWidth(i);
				if(borderSkipped.includes(i) || !ctx.lineWidth || ctx.lineWidth == 0) {
					// Skip drawing the border
					continue;
				}
				ctx.beginPath();
				ctx.moveTo(border[0][0], border[0][1]);
				ctx.lineTo(border[1][0], border[1][1]);
				ctx.stroke();
			}
		},
		height: function() {
			var vm = this._view;
			return vm.base - vm.y;
		},
		inRange: function(mouseX, mouseY) {
			var inRange = false;

			if (this._view) {
				var bounds = getBarBounds(this);
				inRange = mouseX >= bounds.left && mouseX <= bounds.right && mouseY >= bounds.top && mouseY <= bounds.bottom;
			}

			return inRange;
		},
		inLabelRange: function(mouseX, mouseY) {
			var me = this;
			if (!me._view) {
				return false;
			}

			var inRange = false;
			var bounds = getBarBounds(me);

			if (isVertical(me)) {
				inRange = mouseX >= bounds.left && mouseX <= bounds.right;
			} else {
				inRange = mouseY >= bounds.top && mouseY <= bounds.bottom;
			}

			return inRange;
		},
		inXRange: function(mouseX) {
			var bounds = getBarBounds(this);
			return mouseX >= bounds.left && mouseX <= bounds.right;
		},
		inYRange: function(mouseY) {
			var bounds = getBarBounds(this);
			return mouseY >= bounds.top && mouseY <= bounds.bottom;
		},
		getCenterPoint: function() {
			var vm = this._view;
			var x, y;
			if (isVertical(this)) {
				x = vm.x;
				y = (vm.y + vm.base) / 2;
			} else {
				x = (vm.x + vm.base) / 2;
				y = vm.y;
			}

			return {x: x, y: y};
		},
		getArea: function() {
			var vm = this._view;
			return vm.width * Math.abs(vm.y - vm.base);
		},
		tooltipPosition: function() {
			var vm = this._view;
			return {
				x: vm.x,
				y: vm.y
			};
		}
	});

};
