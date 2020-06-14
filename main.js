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
var flash=require("connect-flash");

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
app.use(flash());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.json());

var logindata=null;
passport.use(new LocalStrategy({
    passReqToCallback: true
  },
  function(req,username, password, done) {
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
				    	return done(null, false,req.flash('error','invalid password'));
				    }
				});
			}
			else{
				return done(null, false,req.flash('error','invalid username'));
			}
		}
	});
  }
));


app.get("/login",function(req,res)
{
	if(req.isAuthenticated()){
		res.redirect('/');
	}else{
		var errors = req.flash().error
		error = JSON.stringify(errors)
		res.render("login",{data:error});
	}
});

app.get("/register",function(req,res)
{	if(req.isAuthenticated()){
		res.redirect('/');
	}else{
		res.sendFile(__dirname+"/templates/register.html");
	}
});

app.get('/:setting/work_progress.svg',function(req,res){
	if(req.isAuthenticated()){
		res.sendFile(__dirname+"/templates/work_progress.svg")
	}else{
		res.redirect('/login');
	}
})
app.get('/:setting/navigator.svg',function(req,res){
	if(req.isAuthenticated()){
		res.sendFile(__dirname+"/templates/navigator.svg")
	}else{
		res.redirect('/login');
	}
})

app.get("/",function(req,res){
	if(req.isAuthenticated()){

		db.tasks.find({email:req.user.email,nop:req.user.name},function(err,taskdata){

			var now = new Date();
			var h_now = now.getHours();
				m_now = now.getMinutes();
			var end_time_array = [];
			var start_time_array = [];
			var task_end_status = [];
			var task_start_status = [];
			var final_result = [];

			for(var i=0;i<taskdata.length;i++){
				var endtime = taskdata[i].endtime;
				var starttime = taskdata[i].timestart;

				end_time_array.push(endtime);
				start_time_array.push(starttime);
				var [ h_endtime, m_endtime ] = endtime.split(":");
				var [ h_starttime, m_starttime ] = starttime.split(":");

				h_starttime = parseInt(h_starttime)
				m_starttime = parseInt(m_starttime)
				h_endtime = parseInt(h_endtime)
				m_endtime = parseInt(m_endtime)
				var subtract_h_end = h_endtime - h_now;
					subtract_m_end = m_endtime - m_now;
					subtract_h_start = h_starttime - h_now;
					subtract_m_start = m_starttime - m_now;


				if(subtract_h_end == 0){
					if(subtract_m_end<=0){
						task_end_status.push(taskdata[i].taskname+" has ended")
					}else{
						task_end_status.push(taskdata[i].taskname+" not yet ended")
					}
				}else if(subtract_h_end< 0){
					task_end_status.push(taskdata[i].taskname+" has ended")
				}else{
					task_end_status.push(taskdata[i].taskname+" not yet ended")
				}

				if(subtract_h_start == 0){
					if(subtract_m_start<=0){
						task_start_status.push(taskdata[i].taskname+" has started");
					}else{
						task_start_status.push(taskdata[i].taskname+" not yet started")
					}
				}else if(subtract_h_start<0){
					task_start_status.push(taskdata[i].taskname+" has started");
				}else{
					task_start_status.push(taskdata[i].taskname+" not yet started")
				}
			}


			for(var i=0;i<start_time_array.length;i++){
				if(task_start_status[i].includes(" has started") && task_end_status[i].includes(" has ended")){
					final_result.push(taskdata[i].taskname+" is completed.")
					start_time_array.slice(i,1);
					end_time_array.slice(i,1);
					db.tasks.remove({taskname:taskdata[i].taskname})
				}else if((task_start_status[i].includes(" has started") && task_end_status[i].includes(" not yet ended")) || (task_start_status[i].includes(" not yet started") && task_end_status[i].includes(" not yet ended"))){
					final_result.push(taskdata[i].taskname+" is yet to complete.");
				}
			}

			db.members.update({email:req.user.email},{$inc:{missed_tasks:final_result.length}})
			
		
			db.tasks.find({email:req.user.email,nop:req.user.name},function(err,taskdata){

				if(req.user.clk_format_is_12){
					var i=0;
					for(i=0;i<taskdata.length;i++){
						var str = taskdata[i].timestart;
						var hourEnd = str.indexOf(":");
						var H = +str.substr(0, hourEnd);
						var h = H % 12 || 12;
						var ampm = H < 12 ? "AM" : "PM";
						str = h + str.substr(hourEnd, 3) + " " +ampm;
						taskdata[i].timestart = str;

						var str = taskdata[i].endtime;
						var hourEnd = str.indexOf(":");
						var H = +str.substr(0, hourEnd);
						var h = H % 12 || 12;
						var ampm = H < 12 ? "AM" : "PM";
						str = h + str.substr(hourEnd, 3) + " " +ampm;
						taskdata[i].endtime = str;
					}
				}


			res.render('works',{data:[
				{task_data:taskdata},
				{user_details:req.user},
				{res:task_start_status}
			]});
		});
		})
	}else{
		res.redirect('/login');
	}
})


app.post('/login-done',passport.authenticate('local',{
	successRedirect : '/',
	failureRedirect : '/login',
	failureFlash: true
}));

app.post("/add-task",function(req,res){
	if(req.isAuthenticated()){
		var task = {
			taskname:req.body.taskname.toLowerCase(),
			taskdisc:req.body.taskdisc,
			timestart:req.body.timestart + " " + req.body.start_meridian,
			endtime:req.body.timestop + " " + req.body.end_meridian
		}
		db.tasks.find({taskname:task.taskname,nop:req.user.name,email:req.user.email},function(err,data){
			if (err) throw err;
			if(data.length>0){
				res.send("Task already exists");
			}else{
				task['email'] = req.user.email;
				task['nop'] = req.user.name;
				db.tasks.insertOne(task);
				res.redirect('/')
			}
		})
	}else{
		res.redirect('/login');
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
					email:req.body.username
				}
			db.members.update({email:req.user.email},{$set:{name:obj.name,email:req.body.username}},function(err,data){
				db.tasks.updateMany({email:req.user.email},{$set:{nop:obj.name,email:req.body.username}},function(err,data){
					req.user["email"] = req.body.username;
					req.user["name"] = req.body.fname;
					res.redirect("/account");
				})
			})
		}else{
			res.redirect('/login');
		}
	});

app.post('/save-clock-settings',function(req,res){
	if(req.isAuthenticated()){
		var obj = {
			clk_format_is_12:false
		}
		if(req.body.clock_format=="12"){
			obj["clk_format_is_12"] = true
		}
		db.members.update({email:req.user.email},{$set:{clk_format_is_12:obj.clk_format_is_12}},function(err,data){
			req.user["clk_format_is_12"] = obj.clk_format_is_12
			res.redirect('/account/taskSettings');
		})
	}else{
		res.redirect('/');
	}
});

app.get("/account/progress",function(req,res){
	if(req.isAuthenticated()){
		db.members.find({email:req.user.email},function(err,userdata){
			res.render('progress',{data:userdata});
		})
	}else{
		res.redirect('/');
	}
});
app.get('/account/taskSettings',function(req,res){
	if(req.isAuthenticated()){
			res.render('task_settings',{data:req.user});
	}else{
		res.redirect('/');
	}
})
app.get("/about",function(req,res){
	if(req.isAuthenticated()){
			res.render('about',{data:req.user});
	}else{
		res.redirect('/');
	}
})
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
						missed_tasks:0,
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

// db.sessions.remove({},function(err,data){
// 	console.log("successfully removed all sessions");	
// })

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

app.set('port',process.env.PORT||5000)

app.listen(app.get('port'),function()
{
	console.log("SERVER STARTED SUCCESSFULLY................")
})