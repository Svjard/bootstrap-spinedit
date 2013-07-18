jQuery.fn.mousehold = function (f) {
    var timeout = 100;
    if (f && typeof f == 'function') {
        var intervalId = 0;
        var firstStep = false;
        var clearMousehold = undefined;
        return this.each(function () {
            $(this).mousedown(function () {
                firstStep = true;
                var ctr = 0;
                var t = this;
                intervalId = setInterval(function () {
                    ctr++;
                    f.call(t, ctr);
                    firstStep = false;
                }, timeout);
            });

            clearMousehold = function () {
                clearInterval(intervalId);
                if (firstStep) f.call(this, 1);
                firstStep = false;
            };

            $(this).mouseout(clearMousehold);
            $(this).mouseup(clearMousehold);
        });
    }
};

$(function () {
    $.extend($.fn.disableTextSelect = function () {
        return this.each(function () {
            $(this).bind('selectstart click mousedown', function () { return false; });
        });
    });
});

!function ($) {

    var SpinEdit = function (element, options) {
        this.element = $(element);
        this.element.addClass("spinedit");
        this.element.addClass("noSelect");
        this.intervalId = undefined;

        var hasOptions = typeof options == 'object';

        this.minimum = $.fn.spinedit.defaults.minimum;
        if (hasOptions && typeof options.minimum == 'number') {
            this.setMinimum(options.minimum);
        }
        else if (this.element.attr('min') && !isNaN(parseFloat(this.element.attr('min')))) {
            this.setMinimum(parseFloat(this.element.attr('min')));
        }

        this.maximum = $.fn.spinedit.defaults.maximum;
        if (hasOptions && typeof options.maximum == 'number') {
            this.setMaximum(options.maximum);
        }
        else if (this.element.attr('max') && !isNaN(parseFloat(this.element.attr('max')))) {
           this.setMaximum(parseFloat(this.element.attr('max'))); 
        }

        this.numberOfDecimals = $.fn.spinedit.defaults.numberOfDecimals;
        if (hasOptions && typeof options.numberOfDecimals == 'number') {
            this.setNumberOfDecimals(options.numberOfDecimals);
        }
        else if (this.element.attr('precision') && !isNaN(parseInt(this.element.attr('precision')))) {
           this.setNumberOfDecimals(parseInt(this.element.attr('precision'))); 
        }
		
		var value = $.fn.spinedit.defaults.value;
        if (hasOptions && typeof options.value == 'number') {
            value = options.value;
        } else {			
			if (this.element.val()) {
				var initialValue = parseFloat(this.element.val());
				if (!isNaN(initialValue)) value = initialValue.toFixed(this.numberOfDecimals);				
			}
		}		
        this.setValue(value);		

        this.list = $.fn.spinedit.defaults.list;
        if (hasOptions && $.isArray(options.list)) {
            this.setList(options.list);
            this.listIndex = this.list.indexOf(this.value);
        }

        this.step = $.fn.spinedit.defaults.step;
        if (hasOptions && typeof options.step == 'number') {
            this.setStep(options.step);
        }
        else if (this.element.attr('step') && !isNaN(parseFloat(this.element.attr('step')))) {
           this.setStep(parseFloat(this.element.attr('step'))); 
        }

        var template = $(DRPGlobal.template);
        this.element.after(template);
        template.disableTextSelect();

        template.find('.icon-chevron-up').mousehold($.proxy(this.increase, this));
        template.find('.icon-chevron-down').mousehold($.proxy(this.decrease, this));
        this.element.on('keypress', $.proxy(this._keypress, this));
        var toFix = ['wheel', 'mousewheel', 'DOMMouseScroll', 'MozMousePixelScroll'];
        var toBind = ('onwheel' in document || document.documentMode >= 9) ? ['wheel'] : ['mousewheel', 'DomMouseScroll', 'MozMousePixelScroll'];
        for ( var i = toBind.length - 1; i >= 0; i-- ) {
            this.element.on(toBind[i], $.proxy(this._mousewheel, this));
        }
        this.element.on('blur', $.proxy(this._checkConstraints, this));
    };

    SpinEdit.prototype = {
        constructor: SpinEdit,

        setMinimum: function (value) {
            this.minimum = parseFloat(value);
        },

        setMaximum: function (value) {
            this.maximum = parseFloat(value);
        },

        setStep: function (value) {
            this.step = parseFloat(value);
        },

        setNumberOfDecimals: function (value) {
            this.numberOfDecimals = parseInt(value);
        },

        setList: function(list) {
            this.list = [];
            for (var i = 0; i < list.length; i++) {
                this.list[i] = list[i];
            }
        },

        setValue: function (value) {
            value = parseFloat(value);
            if (isNaN(value))
                value = this.minimum;
            if (this.value == value)
                return;
            if (this.list && this.list.indexOf(value) === -1)
                value = this.value;
            else {
                if (value < this.minimum)
                    value = this.minimum;
                if (value > this.maximum)
                    value = this.maximum;
            }
            this.value = value;
            this.element.val(this.value.toFixed(this.numberOfDecimals));
            this.element.change();

            this.element.trigger({
                type: "valueChanged",
                value: parseFloat(this.value.toFixed(this.numberOfDecimals))
            });
        },

        increase: function () {
            var newValue;
            if (this.list)
                newValue = this.list[++this.listIndex];
            else 
                newValue = this.value + this.step;
            this.setValue(newValue);
        },

        decrease: function () {
            var newValue;
            if (this.list)
                newValue = this.list[--this.listIndex];
            else 
                newValue = this.value - this.step;
            this.setValue(newValue);
        },

        _keypress: function (event) {
            // Allow: -
            if (event.keyCode == 45) {
                return;
            }
            // Allow decimal separator (.)
            if (this.numberOfDecimals > 0 && event.keyCode == 46) {
                return;
            }
            // Ensure that it is a number and stop the keypress
            var a = [];
            for (var i = 48; i < 58; i++)
                a.push(i);
            var k = event.keyCode;
            if (!(a.indexOf(k) >= 0))
                event.preventDefault();
        },

        _mousewheel : function() {
            var orgEvent = event || window.event,
                args = [].slice.call(arguments, 1),
                delta = 0,
                deltaX = 0,
                deltaY = 0,
                absDelta = 0,
                absDeltaXY = 0,
                fn;
            event = $.event.fix(orgEvent);
            event.type = "mousewheel";

            // Old school scrollwheel delta
            if ( orgEvent.wheelDelta ) { delta = orgEvent.wheelDelta; }
            if ( orgEvent.detail )     { delta = orgEvent.detail * -1; }

            // New school wheel delta (wheel event)
            if ( orgEvent.deltaY ) {
                deltaY = orgEvent.deltaY * -1;
                delta  = deltaY;
            }
            if ( orgEvent.deltaX ) {
                deltaX = orgEvent.deltaX;
                delta  = deltaX * -1;
            }

            // Webkit
            if ( orgEvent.wheelDeltaY !== undefined ) { deltaY = orgEvent.wheelDeltaY; }
            if ( orgEvent.wheelDeltaX !== undefined ) { deltaX = orgEvent.wheelDeltaX * -1; }

            // Look for lowest delta to normalize the delta values
            absDelta = Math.abs(delta);
            if ( !this.lowestDelta || absDelta < this.lowestDelta ) { this.lowestDelta = absDelta; }
            absDeltaXY = Math.max(Math.abs(deltaY), Math.abs(deltaX));
            if ( !this.lowestDeltaXY || absDeltaXY < this.lowestDeltaXY ) { this.lowestDeltaXY = absDeltaXY; }

            // Get a whole value for the deltas
            fn = delta > 0 ? 'floor' : 'ceil';
            delta  = Math[fn](delta / this.lowestDelta);
            deltaX = Math[fn](deltaX / this.lowestDeltaXY);
            deltaY = Math[fn](deltaY / this.lowestDeltaXY);

            // Add event and delta to the front of the arguments
            args.unshift(event, delta, deltaX, deltaY);

            if (delta > 0)
                this.increase();
            else
                this.decrease();
        },

        _checkConstraints: function (e) {
            var target = $(e.target);
            this.setValue(target.val());
        }
    };

    $.fn.spinedit = function (option) {
        var args = Array.apply(null, arguments);
        args.shift();
        return this.each(function () {
            var $this = $(this),
				data = $this.data('spinedit'),
				options = typeof option == 'object' && option;

            if (!data) {
                $this.data('spinedit', new SpinEdit(this, $.extend({}, $.fn.spinedit().defaults, options)));
            }
            if (typeof option == 'string' && typeof data[option] == 'function') {
                data[option].apply(data, args);
            }
        });
    };

    $.fn.spinedit.defaults = {
        value: 0,
        minimum: 0,
        maximum: 100,
        step: 1,
        numberOfDecimals: 0,
        list: undefined
    };

    $.fn.spinedit.Constructor = SpinEdit;

    var DRPGlobal = {};

    DRPGlobal.template =
	'<div class="spinedit">' +
	'<i class="icon-chevron-up"></i>' +
	'<i class="icon-chevron-down"></i>' +
	'</div>';

}(window.jQuery);