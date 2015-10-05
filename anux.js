'use strict';

/**
 * Example service/action: myResource.service.js
 *
 * service.get = function (id) {
 *   MyResource.get({id: id}).$promise
 *     .then(anux.dispatch('MyResource'))
 *     .catch(anux.error('MyResource'));
 * };
 *
 * Example consumer: myResourceDisplay.controller.js
 *
 * // call service (action) to request data
 * myResourceService.get(id);
 *
 * anux($scope) // wraps scope to remove listeners on $destroy
 *   .listenTo('MyResource', function (updatedResource) {
 *      vm.myResource = updatedResource;
 *   })
 *   .catch(function (err) {
 *     $log.error(err);
 *   });
 **/

var MODULE_NAME = module.exports = 'anux',
    _ = require('lodash');

require('flux-angular');

angular.module(MODULE_NAME, ['flux'])
    .factory('anux', Anux);

Anux.$inject = ['$log', '$rootScope', 'flux'];
function Anux ($log, $rootScope, flux) {
    var _stores = [],
        SUCCESS = 'success',
        ERROR = 'error';

    function storesWrapper ($scope) {
        var listeners = [];

        return {
            listenTo: wrappedListener,
            onError: wrappedError,
            logErrors: wrappedLogErrors
        };

        function wrappedListener (storeName, notify) {
            if (!_.contains(listeners, storeName)) {
                listeners.push(storeName);
            }

            listenTo($scope, storeName, notify);

            return this;
        }

        function wrappedError (notify) {
            _.forEach(listeners, function (storeName) {
                onError($scope, storeName, notify);
            });

            return this;
        }

        function wrappedLogErrors (message) {
            message = message || 'store_error';
            _.forEach(listeners, function (storeName) {
                onError($scope, storeName, function (err) {
                    $log.error('%s %s: %s', storeName, message, err);
                });
            });

            return this;
        }
    }

    storesWrapper.create = create;
    storesWrapper.dispatch = dispatch;
    storesWrapper.error = error;
    storesWrapper.listenTo = listenTo;
    storesWrapper.onError = onError;

    storesWrapper.stores = flux.stores;
    storesWrapper.dispatcher = flux.dispatcher;
    storesWrapper.reset = flux.reset;

    function dispatch (storeName, immediateResponse) {
        if (!_storeExists(storeName)) {
            create(storeName);
        }

        if (immediateResponse) {
            successHandler(immediateResponse);
            return this;
        }

        return successHandler;

        function successHandler (response) {
            flux.dispatch(_joinNamespace(storeName, SUCCESS), response);
            return response;
        }
    }

    function error (storeName, immediateError) {
        if (immediateError) {
            errorHandler(immediateError);
            return this;
        }

        return errorHandler;

        function errorHandler (err) {
            flux.dispatch(_joinNamespace(storeName, ERROR), err);
            return err;
        }
    }

    function create (name) {
        var store = _getStore(name);

        if (store) {
            return store;
        }

        store = flux.createStore(name, {
            value: null,
            name: name,
            handlers: _createHandlers(name),
            success: function (response) {
                this.value = response;
                this.emit(_joinNamespace(name, SUCCESS));
            },
            error: function (err) {
                this.emit(_joinNamespace(name, ERROR), err);
            },
            exports: {
                get value() {
                    return this.value;
                },
                get name() {
                    return this.name;
                }
            }
        });

        _stores.push(store);

        return store;
    }

    function listenTo ($scope, storeName, notify) {
        _bindListener($scope, storeName, SUCCESS, notify);
        return this;
    }

    function onError ($scope, storeName, errorHandler) {
        _bindListener($scope, storeName, ERROR, errorHandler);
        return this;
    }

    function _bindListener ($scope, storeName, event, handler) {
        var store;

        if (!$scope) {
            storeName = $scope;
            handler = storeName;
            $scope = $rootScope;
        }

        store = _getStore(storeName);

        if (!store) {
            store = create(storeName);
        }

        // call the handler if the store has a value
        //if (store.value && event !== ERROR) {
        //    handler(store.value);
        //}

        $scope.$listenTo(store, _joinNamespace(storeName, event), function (err) {
            if (err && _.isError(err)) {
                handler(err);
                return err;
            }

            handler(store.value);
            return store.value;
        });
    }

    function _storeExists (storeName) {
        return !!_.findWhere(_stores, {name: storeName});
    }

    function _getStore (storeName) {
        if (!_storeExists(storeName)) {
            return;
        }

        return _.findWhere(_stores, {name: storeName});
    }

    function _createHandlers (handler) {
        var handlers = {};

        handlers[_joinNamespace(handler, SUCCESS)] = SUCCESS;
        handlers[_joinNamespace(handler, ERROR)] = ERROR;

        return handlers;
    }

    function _joinNamespace () {
        return _.toArray(arguments).join('.');
    }

    return storesWrapper;
}
