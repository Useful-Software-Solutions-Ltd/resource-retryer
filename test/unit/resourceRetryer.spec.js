/// <reference path="../../typings/tsd.d.ts" />

'use strict';

describe('resourceRetryer', function () {
	var $httpBackend,
		$timeout,
		mockTimeout,
		getRequestHandler,
		queryRequestHandler,
		postRequestHandler,
		delays,
		retryOptions,
		requestCounter,
		respondSuccessAfter,
		response = { message: 'todo bien' },
		postData,
		requestUrl;
		
	//resourceRetryer decorates $resource so get that and test against it.
	//use $httpBackend 
	
	beforeEach(module('resourceRetryer'));

	beforeEach(module(function ($provide) {
		$provide.value('$timeout', mockTimeout);
		delays = [];
		retryOptions = {
			strategy: 'randomizedRetry',
			minWait: 50,
			maxWait: 500,
			retries: 5,
			base: 2,
			startSequenceAfter: 4
		};
		respondSuccessAfter = 1;

		mockTimeout = function (fn, delay, invokeApply, pass) {
			delays.push(delay);
			return fn();
		}

	}));

	beforeEach(inject(function ($injector) {
		requestCounter = 0;
		$httpBackend = $injector.get('$httpBackend');
		$timeout = $injector.get('$timeout');


		getRequestHandler = $httpBackend.when('GET', 'api/test')
			.respond(function (method, url, data, headers) {
				requestCounter = requestCounter + 1;
				if (requestCounter >= respondSuccessAfter) {
					return [200, response];
				} else {
					return [401];
				}
												});

		queryRequestHandler = $httpBackend.when('GET', 'api/test?query=1')
			.respond(function (method, url, data, headers) {
				requestCounter = requestCounter + 1;
				if (requestCounter >= respondSuccessAfter) {
					return [200, [response, response, response, response]];
				} else {
					return [401];
				}
												});

		postRequestHandler = $httpBackend.when('POST', 'api/test?id=99')
			.respond(function (method, url, data, headers) {
				requestCounter = requestCounter + 1;
				postData = data;
				requestUrl = url;

				if (requestCounter >= respondSuccessAfter) {
					return [200, response];
				} else {
					return [401];
				}
												});
	}));

	describe('decorated resource', function () {
		it('should throw and exception if option.retry.strategy string is unknown', inject(function ($resource) {
			expect(function () {
				$resource('api/test', null, null, { retry: { strategy: 'unknownString' } });
			}).toThrow();
		}));

		/*it('should call retryOptions.retryCallback on each retry if the property has been set as a function', inject(function ($resource) {
			var callback = sinon.spy();

			retryOptions.retryCallback = callback;

			var resource = $resource('api/test', null, null, { retry: retryOptions });

			resource.get().$promise
				.then(function () {
					//console.log("call succeeded counter: " + requestCounter);
				}, function () {
					//console.log("call failed counter: " + requestCounter);
				});

			$httpBackend.flush();

			expect(callback.callCount).toEqual(4);
		}));

		it('should on failure retry retryOptions.retries number of times (5)', inject(function ($resource) {
			var resource = $resource('api/test', null, null, { retry: retryOptions });

			resource.get().$promise
				.then(function () {
					//console.log("call succeeded counter: " + requestCounter);
				}, function () {
					//console.log("call failed counter: " + requestCounter);
				});

			$httpBackend.flush();

			expect(requestCounter).toEqual(5);
		}));

		it('should not retry once a try has succeeded', inject(function ($resource) {
			//success will happen on 5th try so set retires higher and make sure that only tries 5 happen
			retryOptions.retries = 10;
			var resource = $resource('api/test', null, null, { retry: retryOptions });

			resource.get().$promise
				.then(function () { }, function () { });

			$httpBackend.flush();

			expect(requestCounter).toEqual(5);
		}));

		it('should resolve resource.$promise once a try has succeeded', inject(function ($resource) {
			var resource = $resource('api/test', null, null, { retry: retryOptions }),
				successCalled = sinon.spy();

			resource.get().$promise
					.then(successCalled, function () { });

			$httpBackend.flush();

			expect(successCalled.called).toBe(true);
		}));

		it('should reject resource.$promise if all retries have failed', inject(function ($resource) {
			retryOptions.retries = 3;
			var resource = $resource('api/test', null, null, { retry: retryOptions }),
				failureCalled = sinon.spy();

			resource.get().$promise
				.then(function () { }, failureCalled);

			$httpBackend.flush();

			expect(failureCalled.called).toBe(true);
		}));

		it('should set resource return {}.$resolved true after first try', inject(function ($resource) {
			retryOptions.retryCallback = callback;

			var resource = $resource('api/test', null, null, { retry: retryOptions }),
				resolved = false,
				result = resource.get();

			function callback(res, retry) {
				if (retry === 1) {
					resolved = result.$resolved;
				}
			};

			$httpBackend.flush();

			expect(resolved).toBe(true);
		}));

		it('should update initial returned resource with final result once promise has been resolved', inject(function ($resource) {
			var Resource = $resource('api/test', null, null, { retry: retryOptions });

			var result = Resource.get(function (result) {

			});

			$httpBackend.flush();

			expect(result.message).toBe("todo bien");
		}));
		
		it('should update initial returned resource with final result once promise has been resolved when isArray = true', inject(function ($resource) {
			var Resource = $resource('api/test', null, null, { retry: retryOptions });

			var result = Resource.get(function (result) {

			});

			$httpBackend.flush();

			expect(false).toBe(true);
		}));

		it('should call action with supplied body', inject(function ($resource) {
			var postBody = { message: "hola" },
				params = { id: 99 },
				resource = $resource('api/test', null, null, { retry: retryOptions });

			var result = resource.save(params, postBody);

			$httpBackend.flush();

			expect(postData).toBe('{"message":"hola"}');
		}));

		it('should call action with supplied params', inject(function ($resource) {
			var postBody = { message: "hola" },
				params = { id: 99 },
				resource = $resource('api/test', null, null, { retry: retryOptions });

			var result = resource.save(params, postBody);

			$httpBackend.flush();

			expect(postData).toBe('{"message":"hola"}');
		}));

		it('should wrap custom actions', inject(function ($resource) {			
			var Resource = $resource('api/test', null, {
				'customGet': { method: 'GET', url: 'api/test'}
			}, { retry: retryOptions });

			var result = Resource.customGet({}, function (a, b) {
					
				});
			
			$httpBackend.flush();

			expect(requestCounter).toEqual(5);
		}));

		it('should on success pass the reponseHeader getter as the second parameter to the success function', inject(function ($resource) {
			var Resource = $resource('api/test', null, null, { retry: retryOptions }),
				reponseHeaderGetter;

			var result = Resource.get({}, function (a, b) {
				reponseHeaderGetter = b;
			});

			$httpBackend.flush();

			expect(reponseHeaderGetter).toBeTruthy();
		}));

		it('should on success return a resource which also has retry wrapped actions', inject(function ($resource) {
			//get a result an then check result.$get retries as well
			var Resource = $resource('api/test', null, null, { retry: retryOptions }),
				results = [];

			var result = Resource.get({}, function (a, b) {
				results.push(requestCounter);
				requestCounter = 0;

				a.$get({}, function (res) {
					results.push(requestCounter);
					requestCounter = 0;
				});
			});

			$httpBackend.flush();

			expect(results).toEqual([5, 5]);
		}));*/
		
		it('should when isArray = true, on success return an array of resources which also have retry wrapped actions', inject(function ($resource) {
			//get a result an then check result.$get retries as well
			var Resource = $resource('api/test', null, null, { retry: retryOptions }),
				results = [];

			var result = Resource.get({}, function (a, b) {
				results.push(requestCounter);
				requestCounter = 0;

				a.$get({}, function (res) {
					results.push(requestCounter);
					requestCounter = 0;
				});
			});

			$httpBackend.flush();

			expect(results).toEqual(false);
		}));

		it('should return array when isArray=true with direct call on $promise', inject(function ($resource) {
			//get a result an then check result.$get retries as well
			var Resource = $resource('api/test', null, null, { retry: retryOptions }),
				result;

			Resource.query({ query: 1 }).$promise.then(function (res) {
				result = res;
			});

			$httpBackend.flush();

			expect(result.length).toEqual(4);
		}));

		it('should return array when isArray=true with direct call on $promise', inject(function ($resource) {
			//get a result an then check result.$get retries as well
			var Resource = $resource('api/test', null, null, { retry: retryOptions });				

			var result = Resource.query({ query: 1 }, function (a, b) {
								
			});

			$httpBackend.flush();

			expect(result.length).toEqual(4);
		}));

		/*describe('if strategy is randomizedRetry', function () {
			it('should not wait more the retryOptions.maxWait (500ms) before retryring', inject(function ($resource) {
				var resource = $resource('api/test', null, null, { retry: retryOptions });

				resource.get().$promise
					.then(function () { }, function () { });

				$httpBackend.flush();

				expect(Math.max.apply(null, delays)).toBeLessThan(501);
			}));

			it('should not retry before the retryOptions.minWait (50ms)', inject(function ($resource) {
				var resource = $resource('api/test', null, null, { retry: retryOptions });

				resource.get().$promise
					.then(function () { }, function () { });

				$httpBackend.flush();

				expect(Math.max.apply(null, delays)).toBeGreaterThan(49);
			}));

		});

		describe('if strategy is progressiveBackOff', function () {
			it('should not wait more the retryOptions.maxWait (500ms) before retryring', inject(function ($resource) {
				retryOptions.strategy = 'progressiveBackOff';
				retryOptions.retries = 10;
				respondSuccessAfter = 10;

				var resource = $resource('api/test', null, null, { retry: retryOptions });

				resource.get().$promise
					.then(function () { }, function () { });

				$httpBackend.flush();

				expect(Math.max.apply(null, delays)).toBeLessThan(501);
			}));

			it('should not retry before the retryOptions.minWait (50ms)', inject(function ($resource) {
				retryOptions.strategy = 'progressiveBackOff';
				retryOptions.retries = 10;
				respondSuccessAfter = 10;

				var resource = $resource('api/test', null, null, { retry: retryOptions });

				resource.get().$promise
					.then(function () { }, function () { });

				$httpBackend.flush();

				expect(Math.max.apply(null, delays)).toBeGreaterThan(50);
			}));

			it('should start skip to next delays in sequence after startSequenceAfter', inject(function ($resource) {
				retryOptions.strategy = 'progressiveBackOff';
				retryOptions.retries = 10;
				retryOptions.minWait = 1;
				retryOptions.maxWait = 9999;
				respondSuccessAfter = 10;

				var resource = $resource('api/test', null, null, { retry: retryOptions });

				resource.get().$promise
					.then(function () { }, function () { });

				$httpBackend.flush();

				expect(Math.min.apply(null, delays)).toBe(8);
			}));

			it('should exponentially increase the delay on between tries', inject(function ($resource) {
				retryOptions.strategy = 'progressiveBackOff';
				retryOptions.retries = 10;
				retryOptions.minWait = 1;
				retryOptions.maxWait = 9999;
				respondSuccessAfter = 10;

				var resource = $resource('api/test', null, null, { retry: retryOptions });

				resource.get().$promise
					.then(function () { }, function () { });

				$httpBackend.flush();

				expect(delays).toEqual([8, 16, 32, 64, 128, 256, 512, 1024, 2048]);
			}));
		});

		describe('if strategy is custom', function () {
			it('should call retryOptions.delayCalculator to work out the delay', inject(function ($resource) {
				retryOptions.strategy = 'custom';
				retryOptions.delayCalculator = sinon.stub().returns(50);

				var resource = $resource('api/test', null, null, { retry: retryOptions });

				resource.get().$promise
					.then(function () { }, function () { });

				$httpBackend.flush();

				expect(delays).toEqual([50, 50, 50, 50]);
			}));
		});*/
	});
});