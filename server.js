global.TextEncoder = require("util").TextEncoder;
global.TextDecoder = require("util").TextDecoder;
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const passwordHash = require('password-hash');
// const authorize = require("./authorize.middleware");

let User = require('./schemas/userSchema');
let Appointment = require('./schemas/appointmentSchema');
let AppointmentType = require('./schemas/appointmentTypeSchema');
let Hospital = require('./schemas/hospitalSchema');
let RefreshToken = require('./schemas/refreshTokenSchema');

const originalConsoleLog = console.log;
console.log = function() {
    let args = [];
    let offset = 1;
    args[0] = `${log.yellow}[Server] ${log.cyan}>${log.reset}`;
    for( var i = 0; i < arguments.length; i++ ) {
        // if(arguments[i] instanceof Object){
            // offset = 0;
            // args[0]= arguments[i].type.toString() === 'error' ?`${log.yellow}[Server] ${log.red}>${log.reset}` : '';
        // }else{
            args[i+offset]=( arguments[i] );
        // }
    }
    args[arguments.length+offset] = `${log.reset}`
    originalConsoleLog.apply( console, args );
};

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

// app.use(express.json());
// app.use(cookieParser());
app.use(cors({
    origin: [
        'https://localhost:3000',
        'http://localhost:3000',
    ],
    credentials: true
}));
// app.use(function(req, res, next) {
//     res.set('Access-Control-Allow-Origin', 'http://localhost:3000');
//     res.set('Access-Control-Allow-Credentials', true);
//     res.set('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
//     res.set('Access-Control-Allow-Headers', 'Origin, Product-Session, X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Referer, User-Agent');
//     // intercept OPTIONS method
//     if ('OPTIONS' == req.method) {
//         res.send(200);
//     }
//     else {
    //         next();
    //     }
    // });

module.exports = app.listen(port, '0.0.0.0', () => {
    console.log(`App listening on port ${port}!`);
});



const uri = process.env.ATLAS_URI;
mongoose.connect(uri).catch(console.error);
const connection = mongoose.connection;
connection.once('open', (res, err) => {
    console.log(`${log.reset}Mongoose Database Connection ${log.green}Established Successfully ${log.reset}`);
});






const authenticateToken = (req, res, next) => {
    if(!req.headers.msg )console.log(`[POST][AUTH][MW] Initialised`);
    if(req.headers.msg ) console.log(`${log.purple + req.headers.msg + log.reset}[POST][AUTH][MW] Initialised`);
    if(req.headers['authorization'] === (null || undefined)) return res.sendStatus(401);
    
    const authHeader = req.headers['authorization'];
    const tokens = authHeader.split(' ');
    const token = tokens[1] && tokens[1].trim();
    let rToken = tokens[2] && tokens[2].trim();

    if(token === (null || undefined)) return res.sendStatus(401);
    RefreshToken.findOne({token: rToken}, (RTerr, RTdata) => {
        if(RTerr) rToken = null;
        if(RTdata === null) rToken = null;
        jwt.verify(token, jwtSecret, (err, user) => {
            if(err){
                if(rToken !== null){
                    jwt.verify(rToken, refreshTokenSecret, (err, data) => {
                        if(err) console.error(err);
                        if(err) return res.sendStatus(403);
                        if(!req.headers.msg )console.log(`[POST][AUTH][MW][REFRESH]>USER>${data.id} ${log.green + 'Success'}`);
                        if(req.headers.msg ) console.log(`${log.purple + req.headers.msg + log.reset}[POST][AUTH][MW][REFRESH]>USER>${data.id} ${log.green + 'Success'}`);
                        req.user = data;
                        req.newAuthToken = genAccessToken(data.id);
                        return next();
                    })
                }else{
                    return res.sendStatus(403);
                }
            }
            if(res.headersSent) return;
            if(user !== (null || undefined)){
                console.log(`[POST][AUTH][MW]> ${JSON.stringify(user)}`);
                if(user.id === (null || undefined)){
                    user = {id: user};
                    console.log(`[POST][AUTH][MW]> ${JSON.stringify(user)}`);
                }
            }else{
                console.error(`[POST][AUTH][MW]> ${JSON.stringify(user)}`);
                // return res.sendStatus(403);
            }
            console.log(`[POST][AUTH][MW]>USER>${user}`);
            req.user = user;
            // if(!req.headers.msg) console.log(`[POST][AUTH]>USER>${user} ${log.green + 'Success'}`);
            // if(req.headers.msg) console.log(`${log.purple + req.headers.msg + log.reset}[POST][AUTH]>USER>${user} ${log.green + 'Success'}`);
            return next();
        });

    })
}

const genAccessToken = (userID) => {
    return jwt.sign({id: userID}, jwtSecret, {expiresIn: '300s'});
}


app.get('/', (req, res) => {
    if(!req.headers.msg) console.log(`[GET][ROOT] Accessed '/'`);
    if(req.headers.msg) console.log(`${log.purple + req.headers.msg + log.reset}[GET][ROOT] Accessed '/'`);
            
    res.status(200).send("Hello, World!")
});

app.post('/auth', authenticateToken,  (req, res) => {
    if(!req.headers.msg) console.log(`[POST][AUTH]>USER>${req.user.id}`);
    if(req.headers.msg) console.log(`${log.purple + req.headers.msg + log.reset}[POST][AUTH]>USER>${req.user.id}`);
    if(req.newAuthToken) return res.status(200).json({authToken: req.newAuthToken});
    return res.sendStatus(200);
});

/* 
*   => username / String
*   <= New user created / JSON [200]
*   <X Returns the error / JSON [400]
*/
app.post('/user/register', (req, res) => {
    if(!req.headers.msg) console.log(`[POST][REGISTER]>USER>${req.body.email}`);
    if(req.headers.msg) console.log(`${log.purple + req.headers.msg + log.reset}[POST][REGISTER]>USER>${req.body.email}`);
    const firstname = req.body.first_name;
    const lastname = req.body.last_name;
    const email = req.body.email.toLowerCase();
    const password = passwordHash.generate(req.body.password);
    const phone = req.body.phone;

    /*
    *   Returns 400 status along with an error message 
    *   if any of the required data is not present 
    */
    if ((firstname || lastname || email || password || phone) === (undefined || null)) {
        console.table({ error: 'Please fill in all form fields'});
        res.json({ error: 'Please fill in all form fields'});
    }

    User.exists({ email: email }, (err, data) => {
        if (err) {
            res.send(err);
        } else {
            if(data){
                res.status(400).json(({ error: 'Email already in our records'}));
            }else{
                console.table([firstname, lastname, email, password, phone]);
                const newUser = new User({ firstName: firstname, lastName: lastname, email: email, password: password, phone: phone });
                newUser.save()
                .then(() => res.status(200).json('User Added'))
                .catch(err => {
                    res.status(400).json(({ error: 'Error creating your account please try again later.'}));
                    console.log('Error: ' + err);
                });
            }
        }
    });

    
});


app.post('/user/login', (req, res) => {
    if(!req.headers.msg) console.log(`[POST][LOGIN]>USER>${req.body.email}`);
    if(req.headers.msg ) console.log(`${log.purple + req.headers.msg + log.reset}[POST][LOGIN]>USER>${req.body.email}`);
    const email = req.body.email;
    const password = req.body.password;

    /*
    *   Returns 400 status along with an error message 
    *   if any of the required data is not present 
    */
    if ((email || password) === (undefined || null)) {
        console.log("Required Data Missing")
        return res.status(400).json('Error: Required Data Missing')
    }
    User.findOne({ email: email }, (err, data) => {
        if (err) return res.send(err);
        if (data === null) return res.status(400).json('Error: User not found');
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
                            if(TokenErr) return res.status(401).json(TokenErr);
                            if(TokenData === null) return res.status(401).json(TokenErr);
                            return res.status(200).json({Atoken: accessToken, Rtoken: TokenData.token});
                        });
                    }else{
                        const rToken = jwt.sign(user, refreshTokenSecret);
                        const newRefreshToken = new RefreshToken({userID: data._id, token: rToken});
                        newRefreshToken.save()
                        .then(() => res.json({Atoken: accessToken, Rtoken: rToken}))
                        .catch(err => {
                            res.status(400).json(({ error: 'Error creating your account please try again later.'}));
                            console.log('Error: ' + err);
                        });

                        }
                }
            })
        } else {
            res.json("Error: Incorrect Password");
        }
        
    });
});

app.post('/token', (req, res) => {
const refreshToken = req.body.token;
    if(refreshToken == null) return res.sendStatus(401);
    RefreshToken.find({ token: refreshToken }, (err, data) => {
        if(!data.includes(refreshToken)) return res.sendStatus(403);
        jwt.verify(refreshToken, refreshTokenSecret, (err, user) => {
            if(err) return res.sendStatus(403).json(err);
            const accessToken = genAccessToken(user._id)
            res.json(accessToken);
        });
    })
});

app.delete('/logout', authenticateToken, (req, res) => {
    if(req.headers.msg ) console.log(`${log.purple + req.headers.msg + log.reset}[POST][LOGOUT]>USER>${req.user.id}`);
    if(!req.headers.msg) console.log(`[POST][LOGOUT]>USER>${req.user.id}`);
    RefreshToken.findOneAndDelete({ token: req.body.token }, (err) => {
        if(err) return res.sendStatus(500);
        return res.sendStatus(204);
    })
})  



app.post('/user/appointment/new', authenticateToken, (req,res) =>{
    if(!req.headers.msg) console.log(`[POST][APPOINTMENT][NEW]>USER>${req.user.id}`);
    if(req.headers.msg ) console.log(`${log.purple + req.headers.msg + log.reset}[POST][APPOINTMENT][NEW]>USER>${req.user.id}`);
    
    const newAppointment = new Appointment({ 
        type: req.body.type, 
        title: req.body.title,
        number: req.body.number ?? "Not Applicable",
        location: req.body.location,
        ward: req.body.ward ?? 'Not Applicable',
        date: req.body.date,
        time: req.body.time,
        userID: req.user.id ?? "Broke"
    });
    newAppointment.save()
    .then(() => { return res.status(200).json({msg: 'Appointment Created', appointmentId: newAppointment.id})})
    .catch(err => {
        
        console.error('[Appointent][new]: ' + err);
        return res.status(400).json(({ error: 'Error creating your appointment please try again later.'}));
    });
});

app.delete('/user/appointment', authenticateToken, (req,res) =>{
    if(!req.headers.msg) console.log(`[DELETE][APPOINTMENT]>USER>${req.user.id}`);
    if(req.headers.msg ) console.log(`${log.purple + req.headers.msg + log.reset}[DELETE][APPOINTMENT]>USER>${req.user.id}`);
    Appointment.findOneAndDelete({ _id: req.body.appointmentId }, (err) => {
        if(err) return res.sendStatus(500);
        return res.sendStatus(204);
    })
});

app.post('/appointment/type/new', authenticateToken, (req,res) =>{
    const newAppointmentType = new AppointmentType({ 
        title: req.body.title, 
        description: req.body.description, 
        identifier: req.body.identifier
    });
        newAppointmentType.save()
        .then(() => res.status(200).json({msg: 'Appointment Type Added', typeId: newAppointmentType._id}))
        .catch(err => {
            res.status(400).json(({ error: 'Error creating your appointment type please try again later.'}));
            console.log('Error: ' + err);
        });
});

app.delete('/appointment/type', authenticateToken, (req,res) =>{
    if(!req.headers.msg) console.log(`[DELETE][APPOINTMENT][TYPE]>USER>${req.user.id}`);
    if(req.headers.msg ) console.log(`${log.purple + req.headers.msg + log.reset}[DELETE][APPOINTMENT][TYPE]>USER>${req.user.id}`);
    AppointmentType.findOneAndDelete({ _id: req.body.typeId }, (err) => {
        if(err) return res.sendStatus(500);
        return res.sendStatus(204);
    })
});

app.get('/user/appointments', authenticateToken, (req,res) =>{
    console.log(`[GET][APPOINTMENT]>USER>${req.user.id}`);
    Appointment.find({userID: req.user.id})
    .populate('location')
    .exec()
    .then((err, data) => {
        if(err) return res.send(err);
        if(data === (null || undefined) || data.length === 0) return res.sendStatus(404);
        // console.log(`[GET][APPOINTMENTS]>USER>${req.user.id}>DATA>${data}`);
        res.status(200).json(data);
    });
});

app.post('/user/appointment', authenticateToken, (req,res) =>{
    if(!req.headers.msg) console.log(`[POST][APPOINTMENT]>USER>${req.user.id}`);
    if(req.headers.msg ) console.log(`${log.purple + req.headers.msg + log.reset}[POST][APPOINTMENT]>USER>${req.user.id}`);
    
    if(!req.body.appointmentId) return res.sendStatus(400);
    if(req.body.appointmentId){
        Appointment.find({_id: req.body.appointmentId})
        .populate('location')
        .exec()
        .then((err, data) => {
            if(err) console.error(err);
            if(err) return res.send(err);
            if(data === (null || undefined) || data.length === 0) return res.sendStatus(404);
            res.status(200).json(data);
        })
    }else{
        return res.sendStatus(400);
    }
});



app.get('/appointment/type', (req,res) =>{
    AppointmentType.find({}, (err, data) => {
        if(err) return res.send(err);
        res.json(data);
    })
});

app.get('/hospitals', (req,res) =>{
    Hospital.find({}, (err, data) => {
        if(err) return res.send(err);
        res.json(data);
    })
});

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
    });
        newHospital.save()
        .then(() => res.status(200).json({msg: 'Hospital Added', hospitalId: newHospital._id}))
        .catch(err => {
            res.status(400).json(({ error: 'Error creating the Hospital please try again later.'}));
            console.error(err);
        });
});

app.delete('/hospital', authenticateToken, (req,res) =>{
    if(!req.headers.msg) console.log(`[DELETE][HOSPITAL]>USER>${req.user.id}`);
    if(req.headers.msg ) console.log(`${log.purple + req.headers.msg + log.reset}[DELETE][HOSPITAL]>USER>${req.user.id}`);
    Hospital.findOneAndDelete({ _id: req.body.hospitalId }, (err) => {
        if(err) return res.sendStatus(500);
        return res.sendStatus(204);
    })
});


