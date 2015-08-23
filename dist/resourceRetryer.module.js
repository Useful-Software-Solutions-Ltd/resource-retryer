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
                                strategy: 'progressiveBackSOff',
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

            function actionWrapper(a1, a2, a3, a4) {
                //this wrappper stores the arguments
                var args = getArgs(actionName, arguments),
                    deferred = $q.defer(),                  
                    returnObject = {
                    '$promise': deferred.promise,
                    '$resolved': false
                };
                
                retryer();
                                 
                return returnObject; 

                function retryer() {
                    var delay = calculateDelay(retryOptions, retried);
                    
                    originalAction.apply(resource, args.args)
                        .$promise
                        .then(function (result) {
                            returnObject.$resolved = true;
                            
                            //TODO need to go through and wrap/replace all $action functions on the return object with retryers
                            angular.extend(returnObject, result);

                            deferred.resolve(returnObject);

                            if (args.onResolve) {
                                //TODO: need to be calling these with the $http header getter function as well
                                args.onResolve.apply(resource, [returnObject]);
                            }
                        }, function (result) {
                            returnObject.$resolved = true;

                            if (retried < retryOptions.retries) {
                                retried = retried + 1;

                                if (angular.isFunction(retryOptions.retryCallback)) {
                                    retryOptions.retryCallback(result, retried);
                                }

                                $timeout(function () {
                                    retryer();
                                }, delay);
                            } else {
                                angular.extend(returnObject, result);
                                deferred.reject(returnObject);

                                if (args.onReject) {
                                    //TODO: need to be calling these with the $http header getter function as well
                                    args.onReject.apply(resource, [returnObject]);
                                }
                            }
                        });
                }
            }
        }
    }
    
    function getArgs(actionName, actionArgs ){
        //needs works
        var hasBody = /^(POST|PUT|PATCH)$/i.test(actionName),
            params = {},
            data,
            error,
            success,
            returnArgs ={};         
        
        switch (actionArgs.length) {
              case 4:
                error = actionArgs[3];
                success = actionArgs[2];
              //fallthrough
              case 3:
              case 2:
                if (angular.isFunction(actionArgs[1])) {
                  if (angular.isFunction(actionArgs[0])) {
                    success = actionArgs[0];
                    error = actionArgs[1];
                    break;
                  }

                  success = actionArgs[1];
                  error = actionArgs[2];
                  //fallthrough
                } else {
                  params = actionArgs[0];
                  data = actionArgs[1];
                  success = actionArgs[2];
                  break;
                }
              case 1:
                if (angular.isFunction(actionArgs[0])) success = actionArgs[0];
                else if (hasBody) data = actionArgs[0];
                else params = actionArgs[0];
                break;
              case 0: break;
              default:
                throw { code: 'badargs',
                  message: "Expected up to 4 arguments [params, data, success, error], got {0} arguments" + actionArgs.length};
            }
            
            returnArgs.onResolve = angular.isFunction(success) ? success : null; 
            returnArgs.onReject = angular.isFunction(error) ? error : null; 
            returnArgs.args = [params];                
            
            if(data) {
                returnArgs.args.push(data);
            }
            
            return returnArgs;
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
