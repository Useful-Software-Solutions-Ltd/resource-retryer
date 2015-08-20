var express = require("express"),
	app = express(),
	port = 8989,
	requestCounter = 1;

app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

app.get("/api/test", repsond);
app.get("/api/test/:succeedOn", repsond);

function repsond(req, res) {
	var succeedOn = req.params.succeedOn ? req.params.succeedOn : 5;

	console.log("request received. Request count: " + requestCounter + " will return success after " + succeedOn + " tries.");

	if (requestCounter < succeedOn) {
		console.log('deliberate fail on ' + requestCounter + ' retries');
		res.status(500).send({ message: 'deliberate fail', requestCount: requestCounter });
		requestCounter = requestCounter + 1;
	} else {
		console.log('returning successfully on ' + requestCounter + ' retries. Reestting requestCounter to 1');
		
		res.json({ message: 'returning successfully', requestCount: requestCounter });
		requestCounter = 1;
	}
}

app.post("/api/test",reset);
app.post("/api/test/:succeedOn",reset);

function reset(req,res){
	requestCounter = 1;	
	res.status(200).send({ message: 'request counter reset', requestCount: requestCounter });
	console.log('request counter reset');
}

app.listen(port);

console.log("Server listening on port " + port + ". requestCounter = " + requestCounter);