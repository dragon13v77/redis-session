var express = require("express");
var redis = require("redis");
var session = require('express-session');
var redisStore = require('connect-redis')(session);
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var path = require("path");
var redisClient = redis.createClient();
var app = express();
var router = express.Router();

// register template engine
const pug = require('pug');
app.set('view engine', 'pug');

// import database handler
const databaseHandler = require('./databaseHandler');

// init redis client
redisClient.monitor(function (err, res) {
	console.log("Entering monitoring mode.");
});

redisClient.on('error', (err) => {
	console.log('Redis error: ', err);
});

redisClient.on("monitor", function (time, args, raw_reply) {
	console.log(time + ": " + args); // 1458910076.446514:['set', 'foo', 'bar']
});


app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);


// start a session
app.use(session({
	secret: 'ThisIsHowYouUseRedisSessionStorage',
	name: '_redisPractice',
	resave: false,
	saveUninitialized: true,
	cookie: {secure: false}, // Note that the cookie-parser module is no longer needed
	// create new redis store.
	store: new redisStore({host: 'localhost', port: 6379, client: redisClient, ttl: 300})
}));


app.use(cookieParser("secretSign#143_!223"));
// support parsing of application/json type post data
//  Parses the text as JSON and exposes the resulting object on req.body
app.use(bodyParser.json());
//support parsing of application/x-www-form-urlencoded post data
//Parses the text as URL encoded data
// (which is how browsers tend to send form data from regular forms set to POST)
// and exposes the resulting object (containing the keys and values) on req.body
app.use(bodyParser.urlencoded({extended: true}));


app.get('/', function (req, res) {
	res.render('index.html');
});

router.post('/login', function (req, res) {
	databaseHandler.handle_database(req, "login", function (response) {
		if (response === null) {
			res.json({"error": "true", "message": "Database error occured"});
		} else {
			if (!response) {
				res.json({
					"error": "true",
					"message": "Login failed ! Please register"
				});
			} else {
				req.session.key = response;
				res.json({"error": false, "message": "Login success."});
			}
		}
	});
});

router.post("/register", function (req, res) {
	databaseHandler.handle_database(req, "checkEmail", function (response) {
		if (response === null) {
			res.json({"error": true, "message": "This email is already present"});
		} else {
			databaseHandler.handle_database(req, "register", function (response) {
				if (response === null) {
					res.json({"error": true, "message": "Error while adding user."});
				} else {
					res.json({"error": false, "message": "Registered successfully."});
				}
			});
		}
	});
});

router.get('/logout', function (req, res) {
	if (req.session.key) {
		req.session.destroy(function (err) {
			if (err) {
				console.log(err);
			} else {
				res.redirect('/');
			}
		});
	} else {
		res.redirect('/');
	}
});

router.get('/home', function (req, res) {
	if (req.session.key) {
		// render home.pug template
		res.render('home', {
			title: 'HOME PAGE',
			message: `Hello ${req.session.key["user_name"]}`
		});

		//res.render("home.html", {email: req.session.key["user_name"]});
	} else {
		res.redirect("/");
	}
});

app.use('/', router);

app.listen(process.env.PORT || 3000, () => {
	console.log(`App Started on PORT ${process.env.PORT || 3000}`);
});