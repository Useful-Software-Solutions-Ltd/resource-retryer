##resource-retryer: retry failed REST API calls automatically.

!!work in progress!!

This module decorates the AngularJS [$resource](https://docs.angularjs.org/api/ngResource/service/$resource) service so that when creating a resource all actions are wrapped in a retry function that will retry any failed http calls. To get started follow the installation instructios below and then have a read through the confuguration notes. Or clone this repo and try out the demo.

###installation

**bower:** 
```
bower install  resource-retryer --save
```

Once installed add the script reference and then add a dependendency to the module to make sure it gets loaded.

(NPM and nuget packages coming soon)
 
```
var app = angular.module('demo', ['resourceRetryer']);
``` 

###configuration

When calling $resource if you pass in an options.retry configuration object the returned resource will have it's actions (get, save,query, remove, delete and any custom actions) wrapped in a retryer function.
Depending on the retry configuration actions will be retried again.

The default retry options are:

```
{
	strategy: 'progressiveBackOff',
	minWait: 50,
	maxWait: 500,
	retries: 5,
	base: 2,
	startSequenceAfter: 1                                
}
```

3 retry strategies are available:
randomizedRetry: the wait before a retry will be a random value of milliseconds between the minWait and maxWait values
progressiveBackOff: follow an exponential sequence of retry wait times starting from the value of startSequenceAfter. (note the minWait or maxWait value will be used if the sequence goes outside of these values)
customs: use a custom function (options.retry.delayCalculator) to calculate the wait time between retries

###options

|	property 	| 	value	 | 	details	|
|---------------|------------|-------------
|	strategy	|	"randomizedRetry", "progressiveBackOff", "custom"	| select the strategy to use when calculating the wait time between each retry	|
|	minWait	|	integer	| minimum time in milliseconds to wait before trying a failed action	|	
|	maxWait	|	integer	| maximum time in milliseconds to wait before trying a failed action	|
|	retries	|	integer	| number of times to retry before failing and rejecting the action promise	|
|	base	|	integer	|	used with **progressiveBackOff** strategy only set the base for the exponential sequence (eg 2 would give a sequence of 1,2,4,8,16,32,64...)	|
|	startSequenceAfter	|	integer	|	used with **progressiveBackOff** strategy only set the starting point for the sequence (eg value of 4 with base 2 would mean sequence starts at 8	|
|	delayCalculator	| function(options, retryCount)	|	used with **custom** strategy only. Custom function that will be called to calculate the wait time between retries. Should return an integer between the minWait and maxWait times	|
    		

###running the demo

Under the demo folder in the repo is a Node.js test server and a simple client. 


To run the server open a command prompt under the demo directory and run:

```
	node testServer
```

, then open **demo.html** in a browser to run the demo client application.
