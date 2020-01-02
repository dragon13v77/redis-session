const async = require("async");
const mysql = require("mysql");


// Always use MySQL pooling.
// Helpful for multiple connections.
var pool = mysql.createPool({
	connectionLimit: 100,
	host: 'localhost',
	user: 'root',
	password: '',
	database: 'redis_demo',
	debug: false
});

pool.getConnection(function (err, connection) {
	if (err) {
		// if there is error, stop right away.
		// This will stop the async code execution and goes to last function.
		console.log('Error MySql connection', err)
	} else {
		console.log('MySql connection good', `User = ${connection.config.user} | port = ${connection.config.port}`);
	}
});


// This is an important function.
// This function does the database handling task.
// We also use async here for control flow.
module.exports.handle_database = function (req, type, callback) {
	async.waterfall([
			function (callback) {
				pool.getConnection(function (err, connection) {
					if (err) {
						// if there is error, stop right away.
						// This will stop the async code execution and goes to last function.
						callback(true);
					} else {
						callback(null, connection);
					}
				});
			},
			function (connection, callback) {
				var SQLquery;
				switch (type) {
					case "login" :
						SQLquery = "SELECT * from user_login WHERE user_email='" + req.body.user_email + "' AND `user_password`='" + req.body.user_password + "'";
						break;
					case "checkEmail" :
						SQLquery = "SELECT * from user_login WHERE user_email='" + req.body.user_email + "'";
						break;
					case "register" :
						SQLquery = "INSERT into user_login(user_email,user_password,user_name) VALUES ('" + req.body.user_email + "','" + req.body.user_password + "','" + req.body.user_name + "')";
						break;
					case "addStatus" :
						SQLquery = "INSERT into user_status(user_id,user_status) VALUES (" + req.session.key["user_id"] + ",'" + req.body.status + "')";
						break;
					case "getStatus" :
						SQLquery = "SELECT * FROM user_status WHERE user_id=" + req.session.key["user_id"];
						break;
					default :
						break;
				}
				callback(null, connection, SQLquery);
			},
			function (connection, SQLquery, callback) {
				connection.query(SQLquery, function (err, rows) {
					connection.release();
					if (!err) {
						if (type === "login") {
							callback(rows.length === 0 ? false : rows[0]);
						} else if (type === "getStatus") {
							callback(rows.length === 0 ? false : rows);
						} else if (type === "checkEmail") {
							callback(rows.length === 0 ? false : true);
						} else {
							callback(false);
						}
					} else {
						// if there is error, stop right away.
						// This will stop the async code execution and goes to last function.
						callback(true);
					}
				});
			}],
		function (result) {
			// This function gets call after every async task finished.
			if (typeof(result) === "boolean" && result === true) {
				callback(null);
			} else {
				callback(result);
			}
		});
}

