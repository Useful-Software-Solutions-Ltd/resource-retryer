var app = angular.module('demo', ['resourceRetryer']);

app.controller('demoController', demoController);

demoController.$inject = ['$resource'];

function demoController($resource) {
  /* jshint validthis:true */
  var vm = this;
  vm.title = 'resourceRetryer demo';
  vm.status = {
    busy: false
  };
  vm.results = [];
  vm.strategies = ["randomizedRetry", "progressiveBackOff"];
  vm.callCount = 0;
  vm.options = {
    testApiUrl: "http://localhost:8989/api/test/5",
    strategy: vm.strategies[0],
    minWait: 50,
    maxWait: 500,
    retries: 5,
    base: 2,
    startSequenceFrom: 1,    
    retryCallback: function(result, retryCount, delay){
      log("try" + retryCount + ". Wait until net try = " + delay);
      vm.callCount = retryCount;
    }   
  };
  vm.go = go;

  activate();

  function activate() { }

  function go() {
    var resource = $resource(vm.options.testApiUrl, null, null, { retry: vm.options });
        
    vm.callCount = 0;
    vm.status.busy = true;
    vm.results.length = 0;

    log("calling " + vm.options.testApiUrl);

    resource
      .get()
      .$promise
      .then(function (result) {
        log("succeeded on try " + vm.callCount + " . Result: " + JSON.stringify(result));
        vm.status.busy = false;
      },
        function (result) {          
          log("failed on try " + vm.callCount  + " . Result: " + JSON.stringify(result));
          vm.status.busy = false;       
        });
  }
  
  function log(message){
     vm.results.push({
       id: vm.results.length,
       message: message
     });
  }
}