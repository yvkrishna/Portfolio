var mongojs = require("mongojs");
var db = mongojs("mongodb://vedha:krishna123@cluster0-shard-00-00-kbuhh.mongodb.net:27017/Work-Assistant?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin",["members","tasks"]);
var express=require("express");
var bodyParser=require('body-parser');
var bcrypt = require('bcryptjs');
var salt = bcrypt.genSaltSync(10);
var session = require('express-session');
var passport = require('passport');
var MongoDBStore = require('connect-mongodb-session')(session);
var LocalStrategy = require('passport-local').Strategy;
var app = express();

var store = new MongoDBStore({
  uri: 'mongodb://vedha:krishna123@cluster0-shard-00-00-kbuhh.mongodb.net:27017/Work-Assistant?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin',
  collection: 'sessions'
});

app.use(express.static("templates"));
app.set('view engine','ejs');
app.set('views', __dirname + '/templates');

app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'keyboard cat',
  saveUninitialized: true,
  resave: false,
  store: store
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.json());

var logindata=null;
passport.use(new LocalStrategy(
  function(username, password, done) {
  	var mongojs = require("mongojs");
	const db = mongojs("mongodb://vedha:krishna123@cluster0-shard-00-00-kbuhh.mongodb.net:27017/Work-Assistant?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin",["members"]);

	var object={
		email:username,
	} 

	db.members.find(object,function(err,data)
	{
		if(err)
		{
			console.log(err);
		}
		else
		{
			if(data.length>0)
			{ 	
				logindata=data;
				const hash=data[0].password.toString();
				bcrypt.compare(password, hash, function(err, res) {
				    if(res === true){
				    	return done(null,logindata[0]);
				    }
				    else{
				    	return done(null, false);
				    }
				});
			}
			else{
				return done(null, false);
			}
		}
	});
  }
));


app.get("/login",function(req,res)
{
	res.sendFile(__dirname+"/templates/login.html");
});

app.get("/register",function(req,res)
{
	res.sendFile(__dirname+"/templates/register.html");
});

app.get("/",function(req,res){

	if(req.isAuthenticated()){
		db.tasks.find({email:req.user.email,nop:req.user.name},function(err,data){

			if(req.user.clk_format_is_12){
				var i=0;
				for(i=0;i<data.length;i++){
					var str = data[i].timestart;
					var hourEnd = str.indexOf(":");
					var H = +str.substr(0, hourEnd);
					var h = H % 12 || 12;
					var ampm = H < 12 ? "AM" : "PM";
					str = h + str.substr(hourEnd, 3) + " " +ampm;
					data[i].timestart = str;

					var str = data[i].endtime;
					var hourEnd = str.indexOf(":");
					var H = +str.substr(0, hourEnd);
					var h = H % 12 || 12;
					var ampm = H < 12 ? "AM" : "PM";
					str = h + str.substr(hourEnd, 3) + " " +ampm;
					data[i].endtime = str;
				}
			}

			res.render('works',{data:[
				{task_data:data},
				{user_details:req.user}
			]});
		})
	}else{
		res.redirect('/login');
	}
})


app.post('/login-done',passport.authenticate('local',{
	successRedirect : '/',
	failureRedirect : '/login'
}));

app.post("/add-task",function(req,res){
	if(req.isAuthenticated()){
		var task = {
			taskname:req.body.taskname.toLowerCase(),
			taskdisc:req.body.taskdisc,
			timestart:req.body.timestart + " " + req.body.start_meridian,
			endtime:req.body.timestop + " " + req.body.end_meridian
		}
		db.tasks.find({taskname:task.taskname},function(err,data){
			if (err) throw err;
			if(data.length>0){
				res.send("Task already exists");
			}else{
				task['email'] = req.user.email;
				task['nop'] = req.user.name;
				db.tasks.insert(task);
				res.redirect('/')
			}
		})
	}else{
		res.redirect('/');
	}
})

app.get('/signout',function(req,res){
	req.logout()
	req.session.destroy();
	res.redirect('/login');
})

app.get('/taskAccomplished/:taskName',function(req,res){
	if(req.isAuthenticated()){
		db.members.update({email:req.user.email},{$inc:{completed_tasks:1}},function(err,data){
			if (err) throw err
			db.tasks.remove({taskname:req.params.taskName},function(err,data){
				res.redirect('/');
			})
		})
	}else{
		res.redirect('/login');
	}
})

app.get('/deleteTask/:taskName',function(req,res){
	if(req.isAuthenticated()){
		db.members.update({email:req.user.email},{$inc:{deleted_tasks:1}},function(err,data){
			if (err) throw err
				db.tasks.remove({taskname:req.params.taskName},function(err,data){
					res.redirect('/');
				})
		})
	}else{
		res.redirect('/');
	}
})

app.post("/save-basic-profile",function(req,res){
	if(req.isAuthenticated()){
			var obj={
					name:req.body.fname,
					email:req.body.username,
					clk_format_is_12:false
				}
				if(req.body.clock_format=="12"){
					obj["clk_format_is_12"] = true
				}
			db.members.update({email:req.user.email},{$set:{name:obj.name,email:req.body.username,clk_format_is_12:obj.clk_format_is_12}},function(err,data){
				req.user["email"] = req.body.username;
				req.user["clk_format_is_12"] = obj.clk_format_is_12
				req.user["name"] = req.body.fname;
				res.redirect("/account");
			})
		}else{
			res.redirect('/login');
		}
	});


app.get('/account',function(req,res){
	if(req.isAuthenticated()){
		db.members.find({email:req.user.email},function(err,userdata){
			res.render('profile',{data:userdata});
		})
	}else{
		res.redirect('/');
	}
});

var registerationdata=null;
app.post("/register-done",function(req,res){

	if(req.query.password_1==req.query.password_2)
	{		
		bcrypt.genSalt(10, function(err, salt){
   			bcrypt.hash(req.body.password_1, salt, function(err, hash) {
					var obj={
						name:req.body.fullname,
						email:req.body.username,
						password:hash,
						completed_tasks:0,
						deleted_tasks:0,
						clk_format_is_12:false
					}
					var checkobj={
						email:req.body.username
					}
					db.members.find(checkobj,function(err,data)
					{
						if(err)
						{
							console.log("err with members");
						}
						else
						{
							if(data.length>0)
							{ 
								res.send("user already exists");
							}
							else
							{
								db.members.insert(obj,function(err,data){
								if(err) throw err
									res.redirect("/");
								});
							}

						 }
							})
						});
					})
	}
	else
	{
		res.send("passwords do not match");
	}
});


passport.serializeUser(function(id, done) {
  done(null,id);
});

passport.deserializeUser(function(id, done) {
    done(null, id);
});


function authenticationMiddleware() {  
	return (req, res, next) => {
		console.log(`req.session.passport.user: ${JSON.stringify(req.session.passport)}`);

	    if (req.isAuthenticated()) return next();
	    res.redirect('/login')
	}
} 

app.listen(8008,function()
{
	console.log("SERVER STARTED SUCCESSFULLY................")
})