(function () {
    'use strict';

    var resourceRetryer = angular.module('resourceRetryer', ['ngResource']),
        retryApproach = ["randomizedRetry", "progressiveBackOff", "custom"];

    resourceRetryer.config(['$provide', function ($provide) {
        $provide.decorator("$resource",['$delegate','$q','$timeout', resourceDecorator]);
    }]);

    function resourceDecorator($delegate, $q, $timeout){
        var defaultActions = ['get', 'save', 'query', 'remove', 'delete'],
            defaults = {
                                strategy: 'progressiveBackOff',
                                minWait: 50,
                                maxWait: 500,
                                retries: 5,
                                base: 2,
                                startSequenceAfter: 1                                
                            };

        return retryerFactory;

        function retryerFactory(url, paramDefaults, actions, options) {
            if (options && options.retry) {
                var retryOptions = angular.extend({},defaults,options.retry);
                
                validateRetryOptions(retryOptions);                
                                               
                //add retry options to options, approach: {options}                        
                var resource = $delegate(url, paramDefaults, actions, options),
                    allActions = actions ? defaultActions.concat(Object.getOwnPropertyNames(actions)) : defaultActions;

                //use the list of action names allActions to go through the resource properties and wrap them
                wrapActions(resource, allActions, retryOptions);
                
                return resource;
            } else {
                return $delegate(url, paramDefaults, actions, options);
            }
        }
        
        function wrapActions(resource, allActions, retryOptions){
            allActions.forEach(function(action){
                addWrapper(resource,action,retryOptions);
            });
        }

        function addWrapper(resource, actionName, retryOptions) {
            var originalAction = resource[actionName],
                retried = 0;

            resource[actionName] = actionWrapper;

            function actionWrapper() {
                //this wrappper stores the arguments
                var args = arguments,
                    retryPromise = $q(function (resolve, reject) {
                        retryer(resolve, reject);
                    }),
                    returnObject = {
                    '$promise': retryPromise,
                    '$resolved': false
                };
                                 
                return returnObject; 

                function retryer(resolve, reject) {
                    var delay = calculateDelay(retryOptions, retried);

                    originalAction.apply(resource, args)
                        .$promise
                        .then(function (result) {
                            returnObject.$resolved = true;                            
                            resolve(result);
                        }, function (result) {
                            returnObject.$resolved = true;                            
                            if (retried < retryOptions.retries) {                                                                
                                retried = retried + 1;                                
                                
                                if (angular.isFunction(retryOptions.retryCallback)) {
                                    retryOptions.retryCallback(result, retried);
                                }
                                
                                $timeout(function () {
                                    retryer(resolve,reject);
                                }, delay);
                            } else {
                                reject(result);
                            }
                        });
                }                
            }
        }
    }

    function calculateDelay(retryOptions, retried) {
        if (retryOptions.strategy === "custom") {
            return retryOptions.delayCalculator(retryOptions, retried);
        } else if (retryOptions.strategy === "randomizedRetry") {
            return Math.floor(Math.random() * (retryOptions.maxWait - retryOptions.minWait + 1)) + retryOptions.minWait;
        } else if (retryOptions.strategy === "progressiveBackOff") {
            var exponent = retried + (retryOptions.startSequenceAfter - 1),
                delay = Math.pow(retryOptions.base, exponent);

            if (delay < retryOptions.minWait) {
                return retryOptions.minWait;
            } else if (delay > retryOptions.maxWait) {
                return retryOptions.maxWait;
            } else {
                return delay;
            }
        }
    }
                
    function validateRetryOptions(retryOptions) {
        if (retryOptions.strategy && retryApproach.indexOf(retryOptions.strategy) < 0) {
            throw { name: "error",
                    message: "Unknown retry approach. Acceptable options are: " + retryApproach.toString()
            }
        }
    }
})();
