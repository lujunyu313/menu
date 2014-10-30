/**
 * Created by lujunyu on 14-10-14.
 */

var ScrollViewMenu = (function () {
    return cc.Node.extend({
        _touchBeganPoint: null,
        _rect: null,
        _isScroll: false,
        _selectedItem: null,
        _state: -1,
        _touchListener: null,

        ctor: function (rect, menuItems) {
            cc.log("ScrollViewMenu ctor: " + rect);

            this._super();

            this._rect = rect;
            
            this._touchListener = cc.EventListener.create({
                event: cc.EventListener.TOUCH_ONE_BY_ONE,
                swallowTouches: false,
                onTouchBegan: this._onTouchBegan.bind(this),
                onTouchMoved: this._onTouchMoved.bind(this),
                onTouchEnded: this._onTouchEnded.bind(this),
                onTouchCancelled: this._onTouchCancelled
            });
            
            this.enabled = true;

            if ((arguments.length > 0) && (arguments[arguments.length - 1] == null))
                cc.log("parameters should not be ending with null in Javascript");

            var argc = arguments.length, items;
            if (argc == 1) {
                items = [];
            } else if (argc == 2) {
                if (menuItems instanceof Array) {
                    items = menuItems;
                }
                else items = [menuItems];
            }
            else if (argc > 2) {
                items = [];
                for (var i = 1; i < argc; i++) {
                    if (arguments[i])
                        items.push(arguments[i]);
                }
            }
            this.initWithArray(items);

            return true;
        },

        onEnter: function () {
        	this._super();
            var locListener = this._touchListener;
            cc.eventManager.addListener(locListener, this);
        },

        /**
         * initializes a cc.Menu with a Array of cc.MenuItem objects
         * @param {Array} array Of cc.MenuItem Items
         * @return {Boolean}
         */
        initWithArray: function (arrayOfItems) {
            if (cc.Node.prototype.init.call(this)) {
                this.enabled = true;

                // menu in the center of the screen
                var winSize = cc.winSize;
                this.setPosition(winSize.width / 2, winSize.height / 2);
                this.setContentSize(winSize);
                this.setAnchorPoint(0.5, 0.5);
                this.ignoreAnchorPointForPosition(true);

                if (arrayOfItems) {
                    for (var i = 0; i < arrayOfItems.length; i++)
                        this.addChild(arrayOfItems[i], i);
                }

                this._selectedItem = null;
                this._state = cc.MENU_STATE_WAITING;

                // enable cascade color and opacity on menus
                this.cascadeColor = true;
                this.cascadeOpacity = true;

                return true;
            }
            return false;
        },

        /**
         * add a child for  cc.Menu
         * @param {cc.Node} child
         * @param {Number|Null} [zOrder=] zOrder for the child
         * @param {Number|Null} [tag=] tag for the child
         */
        addChild: function (child, zOrder) {
        	if (!(child instanceof cc.MenuItem))
        		throw "cc.Menu.addChild() : Menu only supports MenuItem objects as children";

            zOrder = zOrder || 0;
            cc.Node.prototype.addChild.call(this, child, zOrder);
        },

        /**
         * remove a child from cc.Menu
         * @param {cc.Node} child the child you want to remove
         * @param {boolean} cleanup whether to cleanup
         */
        removeChild: function (child, cleanup) {
            if (child == null)
                return;
            if (!(child instanceof cc.MenuItem)) {
                cc.log("cc.Menu.removeChild():Menu only supports MenuItem objects as children");
                return;
            }

            if (this._selectedItem == child)
                this._selectedItem = null;

            cc.Node.prototype.removeChild.call(this, child, cleanup);
        },

        _onTouchBegan: function (touch, event) {
            this._touchBeganPoint = touch.getLocation();
            this._isScroll = false;

            var ret = cc.rectContainsPoint(this._rect, touch.getLocation());

            if (!ret) {
                return false;
            }
          
            if (this._state != cc.MENU_STATE_WAITING || !this.visible || !this.enabled)
                return false;

            for (var c = this.parent; c != null; c = c.parent) {
                if (!c.isVisible())
                    return false;
            }

            this._selectedItem = this._itemForTouch(touch);
            if (this._selectedItem) {
                this._state = cc.MENU_STATE_TRACKING_TOUCH;
                this._selectedItem.selected();
                return true;
            }
            return false;
        },

        _onTouchEnded: function (touch, event) {
            if (this._isScroll) {
                this._onTouchCancelled(touch, event);
            } else {
                if (this._state !== cc.MENU_STATE_TRACKING_TOUCH) {
                    cc.log("cc.Menu.onTouchEnded(): invalid state");
                    return;
                }
                if (this._selectedItem) {
                    this._selectedItem.unselected();
                    this._selectedItem.activate();
                }
                this._state = cc.MENU_STATE_WAITING;
            }

            this._touchBeganPoint = null;
            this._isScroll = false;
        },

        _onTouchMoved: function (touch, event) {
            if (this._touchBeganPoint) {
                var point = touch.getLocation();
                point = cc.p(point.x - this._touchBeganPoint.x, point.y - this._touchBeganPoint.y);
                var distance = point.x * point.x + point.y * point.y;

                if (distance > 100) {
                    this._isScroll = true;
                }
            }

            if (this._state !== cc.MENU_STATE_TRACKING_TOUCH) {
                cc.log("cc.Menu.onTouchMoved(): invalid state");
                return;
            }
            var currentItem = this._itemForTouch(touch);
            if (currentItem != this._selectedItem) {
                if (this._selectedItem)
                    this._selectedItem.unselected();
                this._selectedItem = currentItem;
                if (this._selectedItem)
                    this._selectedItem.selected();
            }
        },

        _onTouchCancelled: function (touch, event) {
            if (this._state !== cc.MENU_STATE_TRACKING_TOUCH) {
                cc.log("cc.Menu.onTouchCancelled(): invalid state");
                return;
            }
            if (this._selectedItem)
                this._selectedItem.unselected();
            this._state = cc.MENU_STATE_WAITING;
        },

        onExit: function () {
            if (this._state == cc.MENU_STATE_TRACKING_TOUCH) {
                if (this._selectedItem) {
                    this._selectedItem.unselected();
                    this._selectedItem = null;
                }
                this._state = cc.MENU_STATE_WAITING;
            }
            cc.Node.prototype.onExit.call(this);
        },

        _itemForTouch: function (touch) {
            var touchLocation = touch.getLocation();
            var itemChildren = this.getChildren(), locItemChild;
            if (itemChildren && itemChildren.length > 0) {
                for (var i = itemChildren.length - 1; i >= 0; i--) {
                    locItemChild = itemChildren[i];
                    if (locItemChild.isVisible() && locItemChild.isEnabled()) {
                        var local = locItemChild.convertToNodeSpace(touchLocation);
                        var r = locItemChild.rect();
                        r.x = 0;
                        r.y = 0;
                        if (cc.rectContainsPoint(r, local))
                            return locItemChild;
                    }
                }
            }
            return null;
        }
    })
})();