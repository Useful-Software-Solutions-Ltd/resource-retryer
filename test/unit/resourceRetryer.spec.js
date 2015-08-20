/// <reference path="../../typings/tsd.d.ts" />

'use strict';

describe('resourceRetryer', function () {
	var $httpBackend,
		$timeout,
		mockTimeout,
		testRequestHandler,
		delays,
		retryOptions,
		requestCounter,
		respondSuccessAfter;
		
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
		respondSuccessAfter = 5;

		mockTimeout = function (fn, delay, invokeApply, pass) {
			delays.push(delay);
			return fn();
		}

	}));

	beforeEach(inject(function ($injector) {
		requestCounter = 0;
		$httpBackend = $injector.get('$httpBackend');
		$timeout = $injector.get('$timeout');
		

		testRequestHandler = $httpBackend.when('GET', 'api/test')
			.respond(function (method, url, data, headers) {
				requestCounter = requestCounter + 1;

				if (requestCounter >= respondSuccessAfter) {
					return [200, { message: 'todo bien' }];
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

		it('should call retryOptions.retryCallback on each retry if the property has been set as a function', inject(function ($resource) {
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

		describe('if strategy is randomizedRetry', function () {
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

				expect(delays).toEqual([50,50,50,50]);
			}));
		});
	});
});