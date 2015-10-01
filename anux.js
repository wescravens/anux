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
    var _stores = [];

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

    function dispatch (storeName) {
        if (!_storeExists(storeName)) {
            create(storeName);
        }

        return function successHandler (response) {
            if (response.$promise) {
                response = response.toJSON();
            }

            flux.dispatch(_joinNamespace(storeName, SUCCESS), response);

            return response;
        };
    }

    function error (storeName) {
        return function (err) {
            flux.dispatch(_joinNamespace(storeName, ERROR), err);
            return err;
        };
    }

    function create (name) {
        var storeOptions,
            newStore;

        if (_storeExists(name)) {
            throw new Error('Store ' + name + ' already exists');
        }

        storeOptions = {
            value: null,
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
                }
            }
        };

        newStore = flux.createStore(name, storeOptions);

        _stores.push({
            name: name,
            store: newStore
        });

        return newStore;
    }

    function listenTo ($scope, storeName, notify) {
        var store;

        if (!$scope) {
            storeName = $scope;
            notify = storeName;
            $scope = $rootScope;
        }

        store = _getStore(storeName);

        $scope.$listenTo(store, _joinNamespace(storeName, SUCCESS), function () {
            return notify(store.value);
        });

        return this;
    }

    function onError ($scope, storeName, errorHandler) {
        var store;

        if (!$scope) {
            storeName = $scope;
            errorHandler = storeName;
            $scope = $rootScope;
        }

        store = _getStore(storeName);

        $scope.$listenTo(store, _joinNamespace(storeName, ERROR), errorHandler);

        return this;
    }

    function _storeExists (storeName) {
        return !!_getStore(storeName);
    }

    function _getStore (storeName) {
        var storeInfo = _.findWhere(_stores, {name: storeName});

        if (!storeInfo) {
            return;
        }

        return storeInfo.store;
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
