global.TextEncoder = require("util").TextEncoder;
global.TextDecoder = require("util").TextDecoder;
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const passwordHash = require('password-hash');

let User = require('./schemas/userSchema');
let Appointment = require('./schemas/appointmentSchema');
let AppointmentType = require('./schemas/appointmentTypeSchema');
let Hospital = require('./schemas/hospitalSchema');
let RefreshToken = require('./schemas/refreshTokenSchema');

/* 
*   console.log
*   Intercepts console.log to run custom logging for tracking purposes.
*
*   -> null
*
*   <- null
*
*   X null / null / null
*/
const originalConsoleLog = console.log;
console.log = function() {
    let args = [];
    let offset = 1;
    args[0] = `${log.yellow}[Server] ${log.cyan}>${log.reset}`;
    for( var i = 0; i < arguments.length; i++ ) {
            args[i+offset]=( arguments[i] );
    }
    args[arguments.length+offset] = `${log.reset}`
    originalConsoleLog.apply( console, args );
};

/* 
*   console.error
*   Intercepts console.log to run custom logging for tracking purposes.
*
*   -> null
*
*   <- null
*
*   X null / null / null
*/
const originalConsoleError = console.error;
console.error = function() {
    let args = [];
    let offset = 1;
    args[0] = `${log.red}[Error]  ${log.yellow}>${log.reset}`;
    for( var i = 0; i < arguments.length; i++ ) {
        args[i+offset]=( arguments[i] );
    }
    args[arguments.length+offset] = `${log.reset}`
    originalConsoleError.apply( console, args );
};

/* 
*   ResponceLogging
*   Intercepts res.status to run custom logging for tracking purposes.
*
*   -> res / Responce Object / Required
*
*   <- res / Responce Object
*
*   X null / null / null
*/
function responceLogging(req, res, next) {
    let oldSend = res.status
    let prefixArr = '';
    let path = [req.method.toLowerCase()];
    req.path.split('/').forEach(element => path.push(element));
    path.forEach(e => {
        if(e === 'user'){prefixArr = `${prefixArr}${log.cyan}[${e.toUpperCase()}]${log.reset}`; return;}
        if(e === 'delete'){prefixArr = `${prefixArr}${log.red}[${e.toUpperCase()}]${log.reset}`; return}
        if(e === 'appointment'){prefixArr = `${prefixArr}${log.yellow}[${e.toUpperCase()}]${log.reset}`; return}
        if(e === 'login'){prefixArr = `${prefixArr}${log.green}[${e.toUpperCase()}]${log.reset}`; return}
        if(e === 'auth'){prefixArr = `${prefixArr}${log.purple}[${e.toUpperCase()}]${log.reset}`; return}
        if(e === 'get'){prefixArr = `${prefixArr}${log.blue}[${e.toUpperCase()}]${log.reset}`; return}
        if(e === 'post'){prefixArr = `${prefixArr}${log.yellow}[${e.toUpperCase()}]${log.reset}`; return}
        if(e !== '') prefixArr = `${prefixArr}[${e.toUpperCase()}]`;
    });
    const prefix = prefixArr;

    res.status = function(data) {
        console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}${prefix} Status: ${res.statusCode === 200 ? log.green : log.red}${res.statusCode}${log.reset}`);
        res.status = oldSend 
        return res.status(data)
    }
    next()
}


/* 
*   Color Codes
*   An Object of color codes to be used with the custom logging system.
*/
const log = {
    red: "\u001b[1;31m",
    green: "\u001b[1;32m",
    yellow: "\u001b[1;33m",
    blue: "\u001b[1;34m",
    purple: "\u001b[1;35m",
    cyan: "\u001b[1;36m",
    reset: "\u001b[0m"
}

require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;
const jwtSecret = process.env.JWT_SECRET;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

app.use(express.json())
app.use(responceLogging);

/* 
*   Initialises Cors X-Origin Policy
*/
app.use(cors({
    origin: [
        'https://localhost:3000',
        'http://localhost:3000',
    ],
    credentials: true
}));

/* 
*   Starts the HTTP server.
*/
module.exports = app.listen(port, '0.0.0.0', () => {
    console.log(`App listening on port ${port}!`);
});


/* 
*   Initialise MongoDB Connection.
*/
const uri = process.env.ATLAS_URI;
mongoose.connect(uri).catch(console.error);
const connection = mongoose.connection;
connection.once('open', (res, err) => {
    console.log(`${log.reset}Mongoose Database Connection ${log.green}Established Successfully ${log.reset}`);
});





/* 
*   AuthenticateToken
*   Checks if the user has a valid authentication token.
*
*   -> Authorisation / Header / Required
*
*   <- Allows access to the protected route
*
*   X null / null / [401]
*   X null / null / [403]
*/
const authenticateToken = (req, res, next) => {
    console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[POST][AUTH][MW] Initialised`);
    if(req.headers['authorization'] === (null || undefined)) return res.status(401).end();
    
    const authHeader = req.headers['authorization'];
    const tokens = authHeader.split(' ');
    const token = tokens[1] && tokens[1].trim();
    let rToken = tokens[2] && tokens[2].trim();

    if(token === (null || undefined)) return res.status(401).end();
    RefreshToken.findOne({token: rToken}, (RTerr, RTdata) => {
        if(RTerr) rToken = null;
        if(RTdata === null) rToken = null;
        jwt.verify(token, jwtSecret, (err, user) => {
            if(err){
                console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[POST][AUTH][MW] Auth Token Invalid`);
                if(rToken !== null){
                    jwt.verify(rToken, refreshTokenSecret, (err, data) => {
                        console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[POST][AUTH][MW] Refresh Needed`);
                        console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[POST][AUTH][MW]>${err ? 'ERROR' : 'DATA'}>${JSON.stringify((err ? err : data))}`);
                        if(err){
                            console.error(err);
                            return res.status(403).end();
                        };
                        req.user = data;
                        req.newAuthToken = genAccessToken(data.id);
                        req.aToken = req.newAuthToken;
                        req.rToken = rToken;
                        console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[POST][AUTH][MW][REFRESH][003]>USER>${data.id} ${log.green + 'Success'}`);
                        return next();
                    });
                }else{
                    console.log(`[POST][AUTH][MW] Token Null`);
                    return res.status(403).end();
                }
            }else{
                if(res.headersSent) return;
                if(user !== (null || undefined)){
                    if(user.id === (null || undefined)){
                        user = {id: user};
                        req.user.id = user;
                        req.aToken = token;
                        req.rToken = rToken || null;
                        console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[POST][AUTH][MW][002]>USER>${JSON.stringify(user)} ${log.green + 'Success'}`);
                        return next();
                    }else{
                        console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[POST][AUTH][MW][001]>USER>${JSON.stringify(user.id)} ${log.green + 'Success'}`);
                        req.user = user;
                        req.aToken = token;
                        req.rToken = rToken || null;
                        return next();
                    }
                }else{
                    console.error(`[POST][AUTH][MW]> ${JSON.stringify(user)}`);
                    return res.status(403).end();
                }
            }
        });

    })
}
/* 
*   genAccessToken
*   Generates a new access token containing the userID.
*
*   -> userID / String / Required
*   -> expiresIn / Integer / Optional
*
*   <- Auth Token / JSON Web Token
*
*   X null / null / null
*/
const genAccessToken = (userID, expiresIn = 300) => {
    return jwt.sign({id: userID}, jwtSecret, {expiresIn: `${expiresIn}s`});
}

/* 
*   POST /auth
*   Checks if the user is authenticated or if a token needs to be refreshed.
*
*   -> Authorisation / Header / Required
*
*   <- status, ?authToken / JSON Object / [200]
*
*   X null / null / null
*/
app.post('/auth', authenticateToken,  (req, res) => {
    console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[POST][AUTH]>USER>${req.user.id}`);
    if(req.newAuthToken) return res.status(200).json({authToken: req.newAuthToken, status: 200});
    return res.status(200).json({status: 200});
});


/* 
*   GET /user
*   Returns a list of all user records in the database, if the request is authenticated.
*
*   -> Authorisation / Header / Required
*
*   <- userData, status / JSON Object / [200]
*
*   X null / null / [403]
*   X null / null / [500]
*/
app.get('/user', authenticateToken,  (req, res) => {
    console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[GET][USER]>USER>${req.user.id}`);
    User.findOne({_id: req.user.id}, (err, data) => {
        if(err) return res.status(500).end();
        if(data === null) return res.status(404).end();
        console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[GET][USER]>DATA>${data}`);
        const resData = {
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            _id: data._id
        };
        console.log(resData);
        return res.status(200).json({userData: resData, status: 200});
    });
});

/* 
*   POST /user/register
*   Creates a new user record in the database, providing all data is valid.
*
*   -> Firstname / String / Required
*   -> Lastname / String / Required
*   -> Email / String / Required
*   -> Password / String / Required
*   -> Phone / String / Required
*
*   <- msg, userID / JSON Object / [200]
*
*   X error / JSON Object / [400]
*/
app.post('/user/register', (req, res) => {
    console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[POST][REGISTER]>USER>${req.body.email}`);
    const firstname = req.body.first_name;
    const lastname = req.body.last_name;
    const email = req.body.email.toLowerCase();
    const password = passwordHash.generate(req.body.password);
    const phone = req.body.phone;

    if ((firstname || lastname || email || password || phone) === (undefined || null)) {
        console.table({ error: 'Please fill in all form fields'});
        return res.json({ error: 'Please fill in all form fields'});
    }

    User.exists({ email: email }, (err, data) => {
        if (err) {
            return res.send(err);
        } else {
            if(data){
                return res.status(400).json(({ error: 'Email already in our records'}));
            }else{
                console.table([firstname, lastname, email, password, phone]);
                const newUser = new User({ firstName: firstname, lastName: lastname, email: email, password: password, phone: phone });
                newUser.save()
                .then(() => {
                    return res.status(200).json({msg: 'User Added', userID: newUser._id})})
                .catch(err => {
                    console.error('Error: ' + err);
                    return res.status(400).json(({ error: 'Error creating your account please try again later.'}));
                });
            }
        }
    });

    
});

/* 
*   DELETE /user
*   Deletes a user record from the database based on the userID of the authenticated request.
*
*   -> Authorisation / Header / Required
*
*   <- null / null / [204]
*
*   X null / null / [403]
*   X null / null / [500]
*/
app.delete('/user', authenticateToken, (req, res) => {
    console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[DELETE][USER]>USER>${req.user.id}`);

    User.findOneAndDelete({ _id: req.user.id }, (err) => {
        if(err) return res.status(500).end();
        RefreshToken.findOneAndDelete({ userID: req.user.id }, (err) => {
            if(err) return console.error(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[DELETE][USER]>REFRESH>${err}`);
            return res.status(204).end();
        })
    })
    
});

/* 
*   POST /user/name
*   Changed the name stored on a user record from the database based on the userID of the authenticated request.
*
*   -> Authorisation / Header / Required
*   -> Firstname / String / Required
*   -> Lastname / String / Required
*
*   <- msg, userID, firstName, lastName / JSON Object / [200]
*
*   X null / null / [400]
*   X null / null / [404]
*   X null / null / [500]
*/
app.post('/user/name', authenticateToken, (req, res) => {
    console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[POST][NAME]>USER>${req.user.id}`);
    if(req.body){
        console.log(req.body);
    }else{
        return res.status(400).end();
    };
    User.findOne({ _id: req.user.id }, (err, user) => {
        if(err) return res.status(500).end();
        if(user === null) return res.status(404).end();
        user.firstName = req.body.firstName;
        user.lastName = req.body.lastName;
        user.save()
        .then(() => {
            return res.status(200).json({msg: 'Name Updated', userID: user._id , firstName: user.firstName, lastName: user.lastName});
        })
        .catch(err => {
            console.error(err); 
            return res.status(500).end();
        });
    });
});

/* 
*   POST /user/email
*   Changed the email stored on a user record from the database based on the userID of the authenticated request.
*
*   -> Authorisation / Header / Required
*   -> Email / String / Required
*
*   <- msg, userID, email / JSON Object / [200]
*
*   X null / null / [400]
*   X null / null / [404]
*   X null / null / [500]
*/
app.post('/user/email', authenticateToken, (req, res) => {
    console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[POST][EMAIL]>USER>${req.user.id}`);
    if(!req.body) return res.status(400).json({error: 'Please fill in all form fields'});
    
    User.exists({ email: req.body.email }, (err, data) => {
        if (err) {
            return res.status(500).end();
        } else {
            if(data){
                if(data._id.toString() === req.user.id) return res.status(400).json(({ error: 'You already have an account with this email'}));
                return res.status(400).json(({ error: 'Email already in our records'}));
            }else{
                User.findOne({ _id: req.user.id }, (err, user) => {
                    if(err) return res.status(500).end();
                    if(user === null) return res.status(404).end();
                    user.email = req.body.email;
                    user.save()
                    .then(() => {
                        return res.status(200).json({msg: 'Email Updated', userID: user._id , email: user.email});
                    })
                    .catch(err => {
                        console.error(err); 
                        return res.status(500).end();
                    });
                });
            }
        }
    });
    
});

/* 
*   POST /user/password
*   Changed the password stored on a user record from the database based on the userID of the authenticated request.
*
*   -> Authorisation / Header / Required
*   -> Current Password / String / Required
*   -> New Password / String / Required
*
*   <- msg, userID / JSON Object / [200]
*
*   X null / null / [400]
*   X null / null / [403]
*   X null / null / [404]
*   X null / null / [500]
*/
app.post('/user/password', authenticateToken, (req, res) => {
    console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[POST][PASSWORD]>USER>${req.user.id}`);
    if(!req.body.currentPassword) return res.status(400).json({error: 'Please fill in all form fields'});
    if(!req.body.newPassword) return res.status(400).json({error: 'Please fill in all form fields'});
    console.log(req.body.currentPassword, " ", req.body.newPassword);
    User.findOne({ _id: req.user.id }, (err, data) => {
        if (err) {
            return res.status(500).end();
        } else {
            if(data){ 
                if(passwordHash.verify(req.body.currentPassword, data.password)){
                    const newPass = passwordHash.generate(req.body.newPassword);
                    data.password = newPass;
                    return data.save()
                    .then(res.status(200).json({msg: 'Password Updated', userID: data._id}))
                    .catch(err => {
                        console.error(err);
                        res.status(500).json(err)
                    });
                }else{
                    return res.status(403).json(({ error: 'Incorrect Password'}));
                }
            }else{
                return res.status(400).json(({ error: 'No User with that id'}));
            }
        }
    });
    
});

/* 
*   POST /user/login
*   Logs in a user with the email and password provided, and returns an auth and refresh token.
*
*   -> Email / String / Required
*   -> Password / String / Required
*
*   <- Atoken, Rtoken / JSON Object / [200]
*
*   X Bad request error / JSON Object / [400]
*   X Forbidden / JSON Object / [403]
*   X Not found Error / JSON Object / [404]
*/
app.post('/user/login', (req, res) => {
    console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[POST][LOGIN]>USER>${req.body.email}`);
    const email = req.body.email;
    const password = req.body.password;

    if ((email || password) === (undefined || null)) {
        console.log("Required Data Missing")
        return res.status(400).json('Error: Required Data Missing')
    }
    User.findOne({ email: email }, (err, data) => {
        if (err) return res.send(err);
        if (data === null) return res.status(404).json('Error: User not found');
        if (passwordHash.verify(password, data.password)) {
            const username = req.body.username;
            const user = {name: username, id: data._id};
            const accessToken = genAccessToken(user.id);

            RefreshToken.exists({ userID: data._id }, (ExistErr, ExistData) => {
                if(ExistErr){
                    console.log(`Error: ${ExistErr} - TokenData: ${ExistData}`);
                }else{
                    if(ExistData){
                        RefreshToken.findOne({ userID: data._id }, (TokenErr, TokenData) => {
                            if(TokenErr) return res.status(403).json(TokenErr);
                            if(TokenData === null) return res.status(403).json(TokenErr);
                            return res.status(200).json({Atoken: accessToken, Rtoken: TokenData.token});
                        });
                    }else{
                        const rToken = jwt.sign(user, refreshTokenSecret);
                        const newRefreshToken = new RefreshToken({userID: data._id, token: rToken});
                        newRefreshToken.save()
                        .then(() => { return res.json({Atoken: accessToken, Rtoken: rToken})})
                        .catch(err => {
                            console.error('Error: ' + err);
                            return res.status(400).json(({ error: 'Error creating your account please try again later.'}));
                        });

                        }
                }
            })
        } else {
            return res.status(403).json("Error: Incorrect Password");
        }
        
    });
});

/* 
*   POST /token
*   Generates a new auth token if refresh token is valid.
*
*   -> Refresh Token / String / Required
*
*   <- accessToken / JSON Object / [200]
*
*   X Bad request error / JSON Object / [400]
*   X Forbidden / JSON Object / [403]
*/
app.post('/token', (req, res) => {
const refreshToken = req.body.token;
    if(refreshToken == null) return res.status(400).end();
    RefreshToken.find({ token: refreshToken }, (err, data) => {
        if(!data.includes(refreshToken)) return res.status(403).end();
        jwt.verify(refreshToken, refreshTokenSecret, (err, user) => {
            if(err) return res.status(403).json(err);
            const accessToken = genAccessToken(user._id)
            return res.json(accessToken);
        });
    })
});

/* 
*   DELETE /logout
*   Deletes the refresh token from the database.
*
*   -> Authorisation / Header / Required
*
*   <- null / null / [204]
*
*   X Bad request error / JSON Object / [400]
*   X Not found error / JSON Object / [404]
*/
app.delete('/logout', authenticateToken, (req, res) => {
    console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[POST][LOGOUT]>USER>${req.user.id}`);
    RefreshToken.findOneAndDelete({ token: req.body.token }, (err) => {
        if(err) return res.status(404).end();
        return res.status(204).end();
    })
})  

/* 
*   POST /user/appointment/new
*   Creates a new appointment record.
*
*   -> Authorisation / Header / Required
*   -> Type / String / Required
*   -> Title / String / Required
*   -> Number / Integer / Optional
*   -> Location / String / Required
*   -> Ward / String / Optional
*   -> Date / String / Required
*   -> Time / String / Required
*
*   <- msg, appointmentId / JSON Object / [200]
*
*   X Bad request error / JSON Object / [400]
*/
app.post('/user/appointment/new', authenticateToken, (req,res) =>{
    console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[POST][APPOINTMENT][NEW]>USER>${req.user.id}`);
    
    const newAppointment = new Appointment({ 
        type: req.body.type, 
        title: req.body.title,
        number: req.body.number ?? "Not Applicable",
        location: req.body.location,
        ward: req.body.ward ?? 'Not Applicable',
        date: req.body.date,
        time: req.body.time,
        userID: req.user.id
    });
    newAppointment.save()
    .then(() => { return res.status(200).json({msg: 'Appointment Created', appointmentId: newAppointment.id})})
    .catch(err => {
        
        console.error('[Appointent][new]: ' + err);
        return res.status(400).json(({ error: 'Error creating your appointment please try again later.'}));
    });
});


/* 
*   POST /user/type/new
*   Creates a new appointment type.
*
*   -> Authorisation / Header / Required
*   -> Title / String / Required
*   -> Description / String / Required
*   -> Identifier / String / Required
*
*   <- msg, typeId / JSON Object / [200]
*
*   X error / JSON Object / [400]
*/
app.post('/appointment/type/new', authenticateToken, (req,res) =>{
    const newAppointmentType = new AppointmentType({ 
        title: req.body.title, 
        description: req.body.description, 
        identifier: req.body.identifier
    });
        newAppointmentType.save()
        .then(() => {return res.status(200).json({msg: 'Appointment Type Added', typeId: newAppointmentType._id})})
        .catch(err => {
            console.error('Error: ' + err);
            return res.status(400).json(({ error: 'Error creating your appointment type please try again later.'}));
        });
});

/* 
*   DELETE /appointment/type
*   Deletes an appointment type from the database by id provided.
*
*   -> Authorisation / Header / Required
*   -> Type ID / String / Required
*
*   <- null / JSON Object / [204]
*
*   X Not found error / JSON Object / [404]
*/
app.delete('/appointment/type', authenticateToken, (req,res) =>{
    console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[DELETE][APPOINTMENT][TYPE]>USER>${req.user.id}`);
    AppointmentType.findOneAndDelete({ _id: req.body.typeId }, (err) => {
        if(err) return res.status(404).end();
        return res.status(204).end();
    })
});


/* 
*   GET /user/appointments
*   gets all of the appointments that belong to a specific user.
*
*   -> Authorisation / Header / Required
*
*   <- data / JSON Object / [200]
*
*   X Not found error / JSON Object / [404]
*/
app.get('/user/appointments', authenticateToken, (req,res) =>{
    console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[GET][APPOINTMENT]>USER>${req.user.id}`);
    Appointment.find({userID: req.user.id})
    .populate('location')
    .sort('date')
    .sort('time')
    .exec()
    .then((err, data) => {
        if(err) return res.send(err);
        if(data === (null || undefined) || data.length === 0) return res.sendStatus(404);
        return res.status(200).json(data);
    });
});

/* 
*   POST /user/appointment
*   gets a user's appointments by id.
*
*   -> Authorisation / Header / Required
*   -> Appointment ID / String / Required
*
*   <- data / JSON Object / [200]
*
*   X Bad request error / JSON Object / [400]
*   X Forbidden error / JSON Object / [403]
*   X Not found error / JSON Object / [404]
*/
app.post('/user/appointment', authenticateToken, (req,res) =>{
    console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[POST][APPOINTMENT]>USER>${req.user.id}`);
    
    if(!req.body.appointmentId) return res.status(400).end();
    if(req.body.appointmentId){
        Appointment.findOne({_id: req.body.appointmentId})
        .populate('location')
        .exec()
        .then((data) => {
            if(data === (null || undefined) || data.length === 0) {
                console.error(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[POST][APPOINTMENT]>USER>${req.user.id}>404`);
                return res.status(404).end();
            }
            if(data.userID === req.user.id) {
                console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[POST][APPOINTMENT]>USER>${req.user.id} ${log.green}Success` );
                console.log(data);
                return res.status(200).json(data);
            }
            return res.status(403).end();
        })
    }else{
        return res.status(400).end();
    }
    
});

/* 
*   DELETE /user/appointment
*   Deletes a user's appointments by id.
*
*   -> Authorisation / Header / Required
*   -> Appointment ID / String / Required
*
*   <- null / JSON Object / [204]
*
*   X Bad request error / JSON Object / [400]
*   X Forbidden error / JSON Object / [403]
*   X Not found error / JSON Object / [404]
*/
app.delete('/user/appointment', authenticateToken, (req,res) =>{
    console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[DELETE][APPOINTMENT]>USER>${req.user.id}`);
    
    if(!req.body.appointmentId) return res.status(400).end();
    if(req.body.appointmentId){
        Appointment.findOne({_id: req.body.appointmentId}, (err, data) => {
            if(err) return res.status(404).end();
            if(data === (null || undefined) || data.length === 0) return res.status(404).end();
            if(data.userID === req.user.id) {
                console.log(data, req.user.id);
                Appointment.findOneAndDelete({_id: req.body.appointmentId}, (err) => {
                    if(err) return res.status(404).end();
                    return res.status(204).end();
                })
            }else{
                return res.status(403).end();
            }
        });
    }else{
        return res.status(400).end();
    }
    
});

/* 
*   GET /user/phone
*   gets a user's phone number on record.
*
*   -> Authorisation / Header / Required
*
*   <- data / JSON Object / [200]
*
*   X Not found error / JSON Object / [404]
*/
app.get('/user/phone', authenticateToken, (req,res) =>{
    console.log(`${req.headers.msg ? (log.purple + req.headers.msg + log.reset) : ''}[GET][PHONE]>USER>${req.user.id}`);
    User.findOne({_id: req.user.id}, (err, data) => {
        if(err) return res.status(404).end();
        if(data === (null || undefined) || data.length === 0) return res.status(404).end();
        return res.status(200).json(data.phone);
    });
});

/* 
*   GET /appointment/type
*   Gets all of the appointment types on record.
*
*   <- data / JSON Object / [200]
*
*   X Server error / JSON Object / [500]
*/
app.get('/appointment/type', (req,res) =>{
    AppointmentType.find({}, (err, data) => {
        if(err) return res.status(500).send(err);
        return res.status(200).json(data);
    })
});

/* 
*   GET /ahospitals
*   Gets all of the hospitals on record.
*
*   <- data / JSON Object / [200]
*
*   X Server error / JSON Object / [500]
*/
app.get('/hospitals', (req,res) =>{
    Hospital.find({}, (err, data) => {
        if(err) return res.status(500).send(err);
        return res.status(200).json(data);
    })
});

/* 
*   POST /hospital/new
*   Creates a new hospital record.
*
*   -> Authorisation / Header / Required
*   -> Name / String / Required
*   -> Address / String / Required
*   -> Postcode / Integer / Required
*   -> Number / String / Required
*   -> Website / String / Required
*   -> Parking / String / Boolean
*   -> Transport / String / Required
*   -> Description / String / Required
*   -> Map HTML / String / Required
*   -> Identifier / String / Required
*
*   <- msg, hospitalId / JSON Object / [200]
*
*   X error / JSON Object / [400]
*/
app.post('/hospital/new', authenticateToken, (req,res) =>{
    if(!req.headers.msg) console.log(`[POST][HOSPITAL]>USER>${req.user.id}`);
    if(req.headers.msg ) console.log(`${log.purple + req.headers.msg + log.reset}[POST][HOSPITAL]>USER>${req.user.id}`);
    const newHospital = new Hospital({ 
        name: req.body.name, 
        address: req.body.address, 
        postcode: req.body.postcode, 
        number: req.body.number,
        website: req.body.website,
        parking: req.body.parking,
        transport: req.body.transport,
        description: req.body.description,
        mapHTML: req.body.mapHTML,
        identifier: req.body.identifier
    });
        newHospital.save()
        .then(() => {return res.status(200).json({msg: 'Hospital Added', hospitalId: newHospital._id})})
        .catch(err => {
            console.error(err);
            return res.status(400).json(({ error: 'Error creating the Hospital please try again later.'}));
        });
});

/* 
*   DELETE /hospital
*   Deletes a hospital by id.
*
*   -> Authorisation / Header / Required
*   -> Hospital ID / String / Required
*
*   <- null / JSON Object / [204]
*
*   X Bad request error / JSON Object / [400]
*   X Not found error / JSON Object / [404]
*/
app.delete('/hospital', authenticateToken, (req,res) =>{
    if(!req.headers.msg) console.log(`[DELETE][HOSPITAL]>USER>${req.user.id}`);
    if(req.headers.msg ) console.log(`${log.purple + req.headers.msg + log.reset}[DELETE][HOSPITAL]>USER>${req.user.id}`);
    if(!req.body.hospitalId) return res.sendStatus(400)
    Hospital.findOneAndDelete({ _id: req.body.hospitalId }, (err) => {
        if(err) return res.status(404).end();
        return res.status(204).end();
    })
});


